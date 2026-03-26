import { NextRequest, NextResponse } from "next/server";
import { Webhook } from "svix";
import { createServiceRoleClient } from "@/lib/supabase/service-role";
import {
  getBot,
  fetchTranscript,
  transcriptToPlainText,
} from "@/lib/recall/client";
import { tracePipeline } from "@/lib/google/pipeline-tracer";
import { notifyCollaboratorsFeedbackReady } from "@/lib/notifications";

export const maxDuration = 60;

const MIN_TRANSCRIPT_CHARS = 50;

/**
 * Recall.ai webhook handler (Svix-signed).
 *
 * Events handled:
 * - bot.done: Bot finished → fetch transcript → store → update status
 * - bot.fatal: Bot error → mark failed_recording
 * - bot.recording_permission_denied: → mark no_consent
 *
 * IMPORTANT: Returns 500 on processing failures so Svix retries delivery.
 * Only returns 200 when the event was successfully processed or is irrelevant.
 */
export async function POST(req: NextRequest) {
  try {
    // 1. Verify Svix signature
    const webhookSecret = process.env.RECALL_WEBHOOK_SECRET;
    if (!webhookSecret) {
      console.error("[webhooks/recall] RECALL_WEBHOOK_SECRET not configured");
      return NextResponse.json(
        { error: "Webhook not configured" },
        { status: 503 },
      );
    }

    // Recall.ai sends webhook-* headers (not svix-* headers)
    const webhookId = req.headers.get("webhook-id") ?? req.headers.get("svix-id");
    const webhookTimestamp = req.headers.get("webhook-timestamp") ?? req.headers.get("svix-timestamp");
    const webhookSignature = req.headers.get("webhook-signature") ?? req.headers.get("svix-signature");

    if (!webhookId || !webhookTimestamp || !webhookSignature) {
      console.warn("[webhooks/recall] Missing webhook signature headers");
      return NextResponse.json(
        { error: "Missing signature headers" },
        { status: 400 },
      );
    }

    const rawBody = await req.text();
    const headers = {
      "svix-id": webhookId,
      "svix-timestamp": webhookTimestamp,
      "svix-signature": webhookSignature,
    };

    let payload: WebhookPayload;
    try {
      const wh = new Webhook(webhookSecret);
      payload = wh.verify(rawBody, headers) as WebhookPayload;
    } catch (err) {
      console.error("[webhooks/recall] Signature verification failed:", err);
      return NextResponse.json(
        { error: "Invalid signature" },
        { status: 400 },
      );
    }

    const event = payload.event;
    const botId = payload.data?.bot?.id;

    if (!botId) {
      console.warn("[webhooks/recall] No bot ID in payload:", event);
      return NextResponse.json({ received: true });
    }

    console.log(`[RECALL:webhook] event=${event} botId=${botId}`);

    // 2. Find interview by recall_bot_id — check for DB errors (#10)
    const serviceClient = createServiceRoleClient();
    const { data: interview, error: lookupError } = await serviceClient
      .from("interviews")
      .select("id, recording_status, recall_bot_id")
      .eq("recall_bot_id", botId)
      .single();

    if (lookupError && lookupError.code !== "PGRST116") {
      // PGRST116 = "no rows returned" — expected for unknown bots
      // Any other error is a real DB failure — return 500 so Svix retries
      console.error(
        `[webhooks/recall] DB lookup failed for botId=${botId}:`,
        lookupError,
      );
      return NextResponse.json(
        { error: "Database error" },
        { status: 500 },
      );
    }

    if (!interview || !interview.recording_status) {
      console.warn(
        `[webhooks/recall] No interview found for botId=${botId}`,
      );
      return NextResponse.json({ received: true });
    }

    const interviewData = {
      id: interview.id,
      recording_status: interview.recording_status,
    };

    // 3. Handle event — errors propagate to outer catch → 500 → Svix retries
    if (event === "bot.done") {
      await handleBotDone(serviceClient, interviewData, botId);
    } else if (event === "bot.fatal") {
      const subCode = payload.data?.data?.sub_code ?? "unknown";
      await handleBotFatal(serviceClient, interviewData, botId, subCode);
    } else if (event === "bot.recording_permission_denied") {
      await handlePermissionDenied(serviceClient, interviewData, botId);
    }
    // Other status events (joining_call, in_call_recording, etc.) are informational — log only

    return NextResponse.json({ received: true });
  } catch (err) {
    // Return 500 so Svix retries the webhook delivery
    console.error("[webhooks/recall] error:", err);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}

// ─── Event Handlers ─────────────────────────────────────────────

async function handleBotDone(
  serviceClient: ReturnType<typeof createServiceRoleClient>,
  interview: { id: string; recording_status: string },
  botId: string,
) {
  // Don't re-process if already transcribed/completed
  if (
    interview.recording_status === "transcribed" ||
    interview.recording_status === "completed"
  ) {
    console.log(
      `[webhooks/recall] Interview ${interview.id} already ${interview.recording_status}, skipping`,
    );
    return;
  }

  // Fetch bot details to get transcript download URL
  const bot = await getBot(botId);

  if (!bot.transcriptDownloadUrl) {
    console.warn(
      `[webhooks/recall] bot.done but no transcript URL for botId=${botId}`,
    );
    const { error: statusError } = await serviceClient
      .from("interviews")
      .update({ recording_status: "failed_transcription" })
      .eq("id", interview.id)
      .eq("recording_status", interview.recording_status);

    if (statusError) {
      console.error(
        `[webhooks/recall] Status update failed for ${interview.id}:`,
        statusError,
      );
    }

    await tracePipeline(interview.id, {
      from: interview.recording_status,
      to: "failed_transcription",
      detail: "Recall.ai bot finished but no transcript available",
      metadata: { recall_bot_id: botId },
    });
    return;
  }

  // Download and format transcript
  const entries = await fetchTranscript(bot.transcriptDownloadUrl);
  const plainText = transcriptToPlainText(entries);

  console.log(
    `[RECALL:transcript] botId=${botId} interviewId=${interview.id} chars=${plainText.length} speakers=${entries.length}`,
  );

  // Guard against empty/meaningless transcripts (#8)
  if (!plainText.trim() || plainText.length < MIN_TRANSCRIPT_CHARS) {
    console.warn(
      `[webhooks/recall] Transcript too short for botId=${botId}: ${plainText.length} chars`,
    );
    const { error: statusError } = await serviceClient
      .from("interviews")
      .update({ recording_status: "failed_transcription" })
      .eq("id", interview.id)
      .eq("recording_status", interview.recording_status);

    if (statusError) {
      console.error(
        `[webhooks/recall] Status update failed for ${interview.id}:`,
        statusError,
      );
    }

    await tracePipeline(interview.id, {
      from: interview.recording_status,
      to: "failed_transcription",
      detail: `Recall.ai transcript too short (${plainText.length} chars). Meeting may not have had audible speech.`,
      metadata: { recall_bot_id: botId, char_count: plainText.length },
    });
    return;
  }

  // Store transcript (upsert — unique on interview_id)
  const { error: insertError } = await serviceClient
    .from("interview_transcripts")
    .upsert(
      {
        interview_id: interview.id,
        transcript: plainText,
        metadata: {
          source: "recall_ai",
          recall_bot_id: botId,
          speakers: [...new Set(entries.map((e) => e.participant.name))],
          entries_count: entries.length,
          char_count: plainText.length,
          retrieved_at: new Date().toISOString(),
        },
      },
      { onConflict: "interview_id" },
    );

  // If transcript insert fails, throw so webhook returns 500 and Svix retries (#1)
  if (insertError) {
    console.error(
      "[webhooks/recall] transcript insert error:",
      insertError,
    );
    throw new Error(
      `Transcript insert failed for interview ${interview.id}: ${insertError.message}`,
    );
  }

  // Transition to transcribed (atomic) — check result (#3)
  const { error: statusError } = await serviceClient
    .from("interviews")
    .update({ recording_status: "transcribed", status: "completed" })
    .eq("id", interview.id)
    .eq("recording_status", interview.recording_status);

  if (statusError) {
    console.error(
      `[webhooks/recall] Status transition failed for ${interview.id}:`,
      statusError,
    );
    // Transcript is saved — status will be picked up on next webhook retry or cron
  }

  await tracePipeline(interview.id, {
    from: interview.recording_status,
    to: "transcribed",
    detail: `Recall.ai transcript received: ${plainText.length} chars, ${entries.length} speakers`,
    metadata: { recall_bot_id: botId, source: "recall_ai" },
  });

  // Notify collaborators that feedback is ready
  await notifyCollaboratorsFeedbackReady(interview.id);

  console.log(
    `[RECALL:done] interviewId=${interview.id} transcribed via Recall.ai`,
  );
}

async function handleBotFatal(
  serviceClient: ReturnType<typeof createServiceRoleClient>,
  interview: { id: string; recording_status: string },
  botId: string,
  subCode: string,
) {
  // Don't overwrite terminal states
  if (
    ["transcribed", "completed", "no_consent"].includes(
      interview.recording_status,
    )
  ) {
    return;
  }

  console.error(
    `[RECALL:fatal] botId=${botId} interviewId=${interview.id} subCode=${subCode}`,
  );

  // Transition to failed_recording so the admin can see the failure (#5)
  const { error: statusError } = await serviceClient
    .from("interviews")
    .update({ recording_status: "failed_recording" })
    .eq("id", interview.id)
    .eq("recording_status", interview.recording_status);

  if (statusError) {
    console.error(
      `[webhooks/recall] Status update failed for ${interview.id}:`,
      statusError,
    );
  }

  try {
    await tracePipeline(interview.id, {
      from: interview.recording_status,
      to: "failed_recording",
      detail: `Recall.ai bot error: ${subCode}. Admin can retry or upload manually.`,
      metadata: { recall_bot_id: botId, sub_code: subCode },
    });
  } catch {
    // Best-effort trace — don't let trace failure cause retry storms
  }
}

async function handlePermissionDenied(
  serviceClient: ReturnType<typeof createServiceRoleClient>,
  interview: { id: string; recording_status: string },
  botId: string,
) {
  console.warn(
    `[RECALL:permission_denied] botId=${botId} interviewId=${interview.id}`,
  );

  const { error: statusError } = await serviceClient
    .from("interviews")
    .update({ recording_status: "no_consent" })
    .eq("id", interview.id)
    .eq("recording_status", interview.recording_status);

  if (statusError) {
    console.error(
      `[webhooks/recall] Status update failed for ${interview.id}:`,
      statusError,
    );
  }

  try {
    await tracePipeline(interview.id, {
      from: interview.recording_status,
      to: "no_consent",
      detail: "Recording permission denied by meeting host",
      metadata: { recall_bot_id: botId },
    });
  } catch {
    // Best-effort trace
  }
}

// ─── Types ──────────────────────────────────────────────────────

interface WebhookPayload {
  event: string;
  data: {
    data?: {
      code: string;
      sub_code: string | null;
      updated_at: string;
    };
    bot?: {
      id: string;
      metadata?: Record<string, string>;
    };
  };
}
