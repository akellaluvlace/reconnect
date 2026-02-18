import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { synthesizeFeedback, AIError } from "@reconnect/ai";

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
});

export async function POST(req: NextRequest) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
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
  let transcript: string | undefined;
  if (parsed.data.interview_id) {
    // Transcript table has no RLS policies — only accessible via service_role
    // For now, transcript is passed from the client or fetched server-side
    // with appropriate service_role access in a future integration step
  }

  try {
    const result = await synthesizeFeedback({
      candidate_name: parsed.data.candidate_name,
      role: parsed.data.role,
      stage_name: parsed.data.stage_name,
      feedback_forms: parsed.data.feedback_forms,
      transcript,
    });

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
}
