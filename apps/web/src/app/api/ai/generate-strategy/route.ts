import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { generateHiringStrategy, AIError } from "@reconnect/ai";

const RequestSchema = z.object({
  role: z.string().min(1).max(200),
  level: z.string().min(1).max(100),
  industry: z.string().min(1).max(200),
  market_insights: z.object({
    salary: z.object({
      min: z.number(),
      max: z.number(),
      median: z.number(),
      currency: z.string().max(10),
      confidence: z.number(),
    }),
    competition: z.object({
      companies_hiring: z.array(z.string().max(200)),
      job_postings_count: z.number(),
      market_saturation: z.string().max(20),
    }),
    time_to_hire: z.object({
      average_days: z.number(),
      range: z.object({ min: z.number(), max: z.number() }),
    }),
    candidate_availability: z.object({
      level: z.string().max(20),
      description: z.string().max(500),
    }),
    key_skills: z.object({
      required: z.array(z.string().max(100)),
      emerging: z.array(z.string().max(100)),
      declining: z.array(z.string().max(100)),
    }),
    trends: z.array(z.string().max(500)),
  }),
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

    const result = await generateHiringStrategy(parsed.data);

    return NextResponse.json({
      data: result.data,
      metadata: result.metadata,
    });
  } catch (error) {
    console.error("[generate-strategy] Error:", error);
    const message =
      error instanceof AIError
        ? error.message
        : "Failed to generate hiring strategy";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
