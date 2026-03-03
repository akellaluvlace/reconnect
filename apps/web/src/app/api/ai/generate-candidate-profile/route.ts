import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { generateCandidateProfile, safeErrorMessage } from "@reconnect/ai";

// Sonnet with 8K tokens, typically 15-30s
export const maxDuration = 60;

const RequestSchema = z.object({
  role: z.string().min(1).max(200),
  level: z.string().min(1).max(100),
  industry: z.string().min(1).max(200),
  skills: z.array(z.string()).optional(),
  jd_requirements: z
    .object({
      required: z.array(z.string()),
      preferred: z.array(z.string()),
    })
    .optional(),
  strategy_skills_priority: z
    .object({
      must_have: z.array(z.string()),
      nice_to_have: z.array(z.string()),
    })
    .optional(),
  market_key_skills: z
    .object({
      required: z.array(z.string()),
      emerging: z.array(z.string()),
    })
    .optional(),
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
    } catch {
      return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
    }

    const parsed = RequestSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Invalid input", issues: parsed.error.issues },
        { status: 400 },
      );
    }

    const result = await generateCandidateProfile(parsed.data);

    return NextResponse.json({
      data: result.data,
      metadata: result.metadata,
    });
  } catch (error) {
    console.error("[generate-candidate-profile] Error:", error);
    return NextResponse.json(
      { error: safeErrorMessage(error, "Failed to generate candidate profile") },
      { status: 500 },
    );
  }
}
