import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { generateQuestions, refineQuestion, safeErrorMessage } from "@reconnect/ai";
import { checkRateLimit } from "@/lib/rate-limit";

// Single Sonnet call, typically 5-10s
export const maxDuration = 30;

const RequestSchema = z.object({
  role: z.string().min(1).max(200),
  level: z.string().min(1).max(100),
  focus_area: z.string().min(1).max(200),
  focus_area_description: z.string().min(1).max(1000),
  stage_type: z.string().min(1).max(100),
  existing_questions: z.array(z.string().max(500)).max(20).optional(),
  mode: z.enum(["generate", "refine"]).default("generate"),
  current_question: z.string().min(1).max(1000).optional(),
  guidance: z.string().max(500).optional(),
});

export async function POST(req: NextRequest) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
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
    console.warn("Invalid JSON in generate-questions request:", parseError);
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const parsed = RequestSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Invalid input", issues: parsed.error.issues },
      { status: 400 },
    );
  }

  const { mode, current_question, ...rest } = parsed.data;

  if (mode === "refine" && !current_question) {
    return NextResponse.json(
      { error: "current_question is required for refine mode" },
      { status: 400 },
    );
  }

  try {
    if (mode === "refine") {
      const result = await refineQuestion({
        ...rest,
        current_question: current_question!,
      });
      console.log(`[generate-questions] Refine OK { fa="${rest.focus_area}", alternatives=${result.data?.alternatives?.length ?? 0} }`);
      return NextResponse.json({
        data: result.data,
        metadata: result.metadata,
      });
    }

    // Default: generate mode (existing behavior)
    const result = await generateQuestions({
      ...rest,
      guidance: parsed.data.guidance,
    });

    console.log(`[generate-questions] Generate OK { fa="${rest.focus_area}", questions=${result.data?.questions?.length ?? 0} }`);
    return NextResponse.json({
      data: result.data,
      metadata: result.metadata,
    });
  } catch (error) {
    console.error("Question generation error:", error);
    return NextResponse.json(
      { error: safeErrorMessage(error, "Failed to generate questions") },
      { status: 500 },
    );
  }
}
