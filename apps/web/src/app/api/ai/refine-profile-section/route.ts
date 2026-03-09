import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { refineProfileSection, safeErrorMessage } from "@reconnect/ai";
import { checkRateLimit } from "@/lib/rate-limit";

// Single Sonnet call, typically 5-15s
export const maxDuration = 60;

const RequestSchema = z.object({
  section: z.enum([
    "ideal_background",
    "experience_range",
    "must_have_skills",
    "nice_to_have_skills",
    "cultural_fit_indicators",
  ]),
  current_value: z.union([z.string().max(2000), z.array(z.string().max(200)).max(20)]),
  guidance: z.string().max(500).optional(),
  context: z.object({
    role: z.string().min(1).max(200),
    level: z.string().min(1).max(100),
    industry: z.string().min(1).max(200),
    hiring_strategy_summary: z.string().max(500).optional(),
  }),
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

  try {
    const result = await refineProfileSection(parsed.data);
    console.log(
      `[refine-profile-section] OK { section="${parsed.data.section}", alternatives=${result.data.alternatives.length} }`,
    );
    return NextResponse.json({
      data: result.data,
      metadata: result.metadata,
    });
  } catch (error) {
    console.error("[refine-profile-section] Error:", error);
    return NextResponse.json(
      { error: safeErrorMessage(error, "Failed to refine profile section") },
      { status: 500 },
    );
  }
}
