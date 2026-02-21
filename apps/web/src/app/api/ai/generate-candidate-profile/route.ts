import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { generateCandidateProfile, AIError } from "@reconnect/ai";

const RequestSchema = z.object({
  role: z.string().min(1).max(200),
  level: z.string().min(1).max(100),
  industry: z.string().min(1).max(200),
  skills: z.array(z.string().max(100)).max(30).optional(),
  jd_requirements: z
    .object({
      required: z.array(z.string().max(200)).max(20),
      preferred: z.array(z.string().max(200)).max(20),
    })
    .optional(),
  strategy_skills_priority: z
    .object({
      must_have: z.array(z.string().max(100)).max(15),
      nice_to_have: z.array(z.string().max(100)).max(15),
    })
    .optional(),
  market_key_skills: z
    .object({
      required: z.array(z.string().max(100)).max(15),
      emerging: z.array(z.string().max(100)).max(10),
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
    const message =
      error instanceof AIError
        ? error.message
        : "Failed to generate candidate profile";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
