import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { createServiceRoleClient } from "@/lib/supabase/service-role";
import { synthesizeFeedback, safeErrorMessage } from "@reconnect/ai";
import type { Json } from "@reconnect/database";
import { checkRateLimit } from "@/lib/rate-limit";
import { notifyManager } from "@/lib/notifications";

// Opus 4.6 with 16K token budget + optional transcript fetch — routinely 60-120s. Vercel Pro supports up to 300s.
export const maxDuration = 300;

const RatingSchema = z.object({
  category: z.string().min(1).max(200),
  score: z.number().int().min(1).max(4),
});

const FeedbackFormSchema = z.object({
  interviewer_name: z.string().min(1).max(200),
  ratings: z.array(RatingSchema).max(20),
  pros: z.array(z.string().max(500)).max(20),
  cons: z.array(z.string().max(500)).max(20),
  notes: z.string().max(5000).optional(),
});

const RequestSchema = z.object({
  candidate_name: z.string().min(1).max(200),
  role: z.string().min(1).max(200),
  stage_name: z.string().min(1).max(200),
  feedback_forms: z.array(FeedbackFormSchema).min(1).max(10),
  interview_id: z.string().uuid().optional(),
  candidate_id: z.string().uuid().optional(),
});

export async function GET(req: NextRequest) {
  try {
    const supabase = await createClient();
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const candidateId = req.nextUrl.searchParams.get("candidate_id");
    if (!candidateId) {
      return NextResponse.json({ error: "candidate_id required" }, { status: 400 });
    }

    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    if (!uuidRegex.test(candidateId)) {
      return NextResponse.json({ error: "Invalid candidate_id format" }, { status: 400 });
    }

    const { data, error } = await supabase
      .from("ai_synthesis")
      .select("content, model_used, prompt_version, generated_at")
      .eq("candidate_id", candidateId)
      .order("generated_at", { ascending: false })
      .limit(1)
      .single();

    if (error) {
      if (error.code === "PGRST116") {
        return NextResponse.json({ synthesis: null });
      }
      console.error("[synthesis/GET] Query failed:", error.message);
      return NextResponse.json({ error: "Failed to fetch synthesis" }, { status: 500 });
    }

    return NextResponse.json({ synthesis: data });
  } catch (err) {
    console.error("[synthesis/GET] Error:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
  const supabase = await createClient();
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // Only admin/manager can trigger synthesis (accesses all feedback via service_role)
  const { data: profile } = await supabase
    .from("users")
    .select("role")
    .eq("id", user.id)
    .single();

  if (!profile || !["admin", "manager"].includes(profile.role)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const rateLimited = checkRateLimit(user.id);
  if (rateLimited) {
    return NextResponse.json(
      { error: "Too many requests. Please try again shortly." },
      { status: 429, headers: { "Retry-After": String(Math.ceil(rateLimited.retryAfterMs / 1000)) } },
    );
  }

  let body: unknown;
  try {
    body = await req.json();
  } catch (parseError) {
    console.warn("Invalid JSON in synthesize-feedback request:", parseError);
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const parsed = RequestSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Invalid input", issues: parsed.error.issues },
      { status: 400 },
    );
  }

  // If interview_id provided, fetch transcript via service role
  // (interview_transcripts has RLS enabled but NO policies — only service_role can read)
  let transcript: string | undefined;
  let transcriptWarning: string | undefined;
  if (parsed.data.interview_id) {
    try {
      const serviceClient = createServiceRoleClient();
      const { data: transcriptRow, error: txError } = await serviceClient
        .from("interview_transcripts")
        .select("transcript")
        .eq("interview_id", parsed.data.interview_id)
        .single();

      if (txError && txError.code !== "PGRST116") {
        console.error(
          "[synthesis] Transcript fetch failed:",
          txError.message,
        );
        transcriptWarning = "Transcript fetch failed — synthesis generated without transcript";
      }
      transcript = transcriptRow?.transcript ?? undefined;
    } catch (txErr) {
      console.error("[synthesis] Transcript fetch error:", txErr);
      transcriptWarning = "Transcript fetch error — synthesis generated without transcript";
      // Non-fatal: synthesis can proceed without transcript
    }
  }

  try {
    const result = await synthesizeFeedback({
      candidate_name: parsed.data.candidate_name,
      role: parsed.data.role,
      stage_name: parsed.data.stage_name,
      feedback_forms: parsed.data.feedback_forms,
      transcript,
    });

    // Persist synthesis to ai_synthesis table if candidate_id provided
    if (parsed.data.candidate_id) {
      const { error: insertError } = await supabase
        .from("ai_synthesis")
        .insert({
          candidate_id: parsed.data.candidate_id,
          synthesis_type: "initial",
          content: result.data as unknown as Json,
          model_used: result.metadata.model_used,
          prompt_version: result.metadata.prompt_version,
        });

      if (insertError) {
        console.error(
          "[synthesis] Failed to persist:",
          insertError.message,
        );
        // Don't fail the request — synthesis was successful, but flag the save failure
        return NextResponse.json({
          data: result.data,
          metadata: result.metadata,
          persist_warning: "Synthesis generated but failed to save — results may not persist",
          ...(transcriptWarning ? { transcript_warning: transcriptWarning } : {}),
        });
      }

      // Fire-and-forget: notify manager that synthesis is ready
      const serviceClient = createServiceRoleClient();
      const { data: candidateRow } = await serviceClient
        .from("candidates")
        .select("playbook_id")
        .eq("id", parsed.data.candidate_id)
        .single();

      if (candidateRow?.playbook_id) {
        const appUrl =
          process.env.NEXT_PUBLIC_APP_URL ?? "https://app.axil.ie";
        notifyManager({
          playbookId: candidateRow.playbook_id,
          type: "synthesis_ready",
          data: {
            candidateName: parsed.data.candidate_name,
            debriefLink: `${appUrl}/playbooks/${candidateRow.playbook_id}/debrief`,
          },
        }).catch(() => {});
      }
    }

    return NextResponse.json({
      data: result.data,
      metadata: result.metadata,
      ...(transcriptWarning ? { transcript_warning: transcriptWarning } : {}),
    });
  } catch (error) {
    console.error("Feedback synthesis error:", error);
    return NextResponse.json(
      { error: safeErrorMessage(error, "Failed to synthesize feedback") },
      { status: 500 },
    );
  }
  } catch (outerError) {
    console.error("[synthesize-feedback] Unhandled error:", outerError);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}
