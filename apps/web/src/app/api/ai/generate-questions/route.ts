import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { generateQuestions, AIError } from "@reconnect/ai";

const RequestSchema = z.object({
  role: z.string().min(1).max(200),
  level: z.string().min(1).max(100),
  focus_area: z.string().min(1).max(200),
  focus_area_description: z.string().min(1).max(1000),
  stage_type: z.string().min(1).max(100),
  existing_questions: z.array(z.string().max(500)).max(20).optional(),
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

  try {
    const result = await generateQuestions(parsed.data);

    return NextResponse.json({
      data: result.data,
      metadata: result.metadata,
    });
  } catch (error) {
    console.error("Question generation error:", error);
    const message =
      error instanceof AIError
        ? error.message
        : "Failed to generate questions";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
