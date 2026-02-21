import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { createServiceRoleClient } from "@/lib/supabase/service-role";
import { synthesizeFeedback, AIError } from "@reconnect/ai";
import type { Json } from "@reconnect/database";

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
      }
      transcript = transcriptRow?.transcript ?? undefined;
    } catch (txErr) {
      console.error("[synthesis] Transcript fetch error:", txErr);
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
        // Don't fail the request — synthesis was successful
      }
    }

    return NextResponse.json({
      data: result.data,
      metadata: result.metadata,
    });
  } catch (error) {
    console.error("Feedback synthesis error:", error);
    const message =
      error instanceof AIError
        ? error.message
        : "Failed to synthesize feedback";
    return NextResponse.json({ error: message }, { status: 500 });
  }
  } catch (outerError) {
    console.error("[synthesize-feedback] Unhandled error:", outerError);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}
