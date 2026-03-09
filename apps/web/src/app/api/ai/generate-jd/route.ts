import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { generateJobDescription, safeErrorMessage } from "@reconnect/ai";
import { checkRateLimit } from "@/lib/rate-limit";

// JD generation observed at 24s but can spike under load. Vercel Pro supports up to 300s.
export const maxDuration = 300;

const RequestSchema = z.object({
  role: z.string().min(1).max(200),
  level: z.string().min(1).max(100),
  industry: z.string().min(1).max(200),
  company_context: z.string().max(2000).optional(),
  style: z.enum(["formal", "creative", "concise"]),
  currency: z.string().optional(),
  market_context: z
    .object({
      salary_range: z
        .object({
          min: z.number(),
          max: z.number(),
          currency: z.string(),
        })
        .optional(),
      key_skills: z.array(z.string()).optional(),
      demand_level: z.string().optional(),
      competitors: z.array(z.string()).optional(),
    })
    .optional(),
  strategy_context: z
    .object({
      salary_positioning: z
        .object({
          strategy: z.string(),
          recommended_range: z
            .object({ min: z.number(), max: z.number(), currency: z.string() })
            .optional(),
        })
        .optional(),
      competitive_differentiators: z.array(z.string()).optional(),
      skills_priority: z
        .object({
          must_have: z.array(z.string()),
          nice_to_have: z.array(z.string()),
        })
        .optional(),
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
    console.warn("Invalid JSON in generate-jd request:", parseError);
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const parsed = RequestSchema.safeParse(body);
  if (!parsed.success) {
    console.warn("[generate-jd] Validation failed:", JSON.stringify(parsed.error.issues));
    return NextResponse.json(
      { error: "Invalid input", issues: parsed.error.issues },
      { status: 400 },
    );
  }

  try {
    const result = await generateJobDescription(parsed.data);

    return NextResponse.json({
      data: result.data,
      metadata: result.metadata,
    });
  } catch (error) {
    console.error("JD generation error:", error);
    return NextResponse.json(
      { error: safeErrorMessage(error, "Failed to generate job description") },
      { status: 500 },
    );
  }
}
