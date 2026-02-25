import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { generateStages, AIError } from "@reconnect/ai";

const RequestSchema = z.object({
  role: z.string().min(1).max(200),
  level: z.string().min(1).max(100),
  industry: z.string().min(1).max(200),
  stage_count: z.number().min(1).max(10).optional(),
  jd_context: z
    .object({
      responsibilities: z.array(z.string()).optional(),
      requirements: z.array(z.string()).optional(),
      seniority_signals: z.array(z.string()).optional(),
    })
    .optional(),
  strategy_context: z
    .object({
      market_classification: z.string().optional(),
      process_speed: z
        .object({
          recommendation: z.string(),
          max_stages: z.number().int().min(1).max(10),
          target_days: z.number().int().min(1).max(120),
        })
        .optional(),
      skills_priority: z
        .object({
          must_have: z.array(z.string()),
          nice_to_have: z.array(z.string()),
        })
        .optional(),
      competitive_differentiators: z.array(z.string()).optional(),
    })
    .optional(),
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
    console.warn("Invalid JSON in generate-stages request:", parseError);
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
    const result = await generateStages(parsed.data);

    return NextResponse.json({
      data: result.data,
      metadata: result.metadata,
    });
  } catch (error) {
    console.error("Stage generation error:", error);
    const message =
      error instanceof AIError
        ? error.message
        : "Failed to generate interview stages";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
