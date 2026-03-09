import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { generateCandidateProfile, safeErrorMessage } from "@reconnect/ai";
import { checkRateLimit } from "@/lib/rate-limit";

// Candidate profile typically 15-30s but can spike under load. Vercel Pro supports up to 300s.
export const maxDuration = 300;

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
  emerging_premium: z.array(z.string()).max(10).optional(),
  stage_types_summary: z.string().max(500).optional(),
  coverage_gaps: z.array(z.string().max(200)).max(20).optional(),
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
