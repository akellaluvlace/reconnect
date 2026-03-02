import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { generateHiringStrategy, adjustProcessSpeed, AIError } from "@reconnect/ai";

// Strategy generation can take ~47s — set generous timeout for Vercel
export const maxDuration = 120;

const RequestSchema = z.object({
  role: z.string().min(1).max(200),
  level: z.string().min(1).max(100),
  industry: z.string().min(1).max(200),
  market_insights: z.object({
    salary: z.object({
      min: z.number(),
      max: z.number(),
      median: z.number(),
      currency: z.string(),
      confidence: z.number(),
    }),
    competition: z.object({
      companies_hiring: z.array(z.string()),
      job_postings_count: z.number().optional(),
      job_postings_domains: z.array(z.string()).optional(),
      market_saturation: z.string(),
    }),
    time_to_hire: z.object({
      average_days: z.number(),
      range: z.object({ min: z.number(), max: z.number() }),
    }),
    candidate_availability: z.object({
      level: z.string(),
      description: z.string(),
    }),
    key_skills: z.object({
      required: z.array(z.string()),
      emerging: z.array(z.string()),
      declining: z.array(z.string()),
    }),
    trends: z.array(z.string()),
  }),
  max_stages_override: z.number().int().min(2).max(8).optional(),
});

/** Lightweight request for stage-count adjustments only */
const AdjustStagesSchema = z.object({
  mode: z.literal("adjust_stages"),
  new_stages: z.number().int().min(2).max(8),
  ai_recommended_stages: z.number().int().min(2).max(8),
  role: z.string().min(1).max(200),
  level: z.string().min(1).max(100),
  industry: z.string().min(1).max(200),
  market_insights: RequestSchema.shape.market_insights,
  current_strategy: z.record(z.string(), z.unknown()),
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

    // Check if this is a lightweight stage adjustment
    if (typeof body === "object" && body !== null && "mode" in body && (body as Record<string, unknown>).mode === "adjust_stages") {
      const adjustParsed = AdjustStagesSchema.safeParse(body);
      if (!adjustParsed.success) {
        return NextResponse.json(
          { error: "Invalid input", issues: adjustParsed.error.issues },
          { status: 400 },
        );
      }
      const { new_stages, ai_recommended_stages, role, level, industry, market_insights, current_strategy } = adjustParsed.data;
      console.log(`[TRACE:adjustStages:start] OK { new_stages=${new_stages}, ai_recommended=${ai_recommended_stages}, delta=${new_stages - ai_recommended_stages}, role="${role}", level="${level}" }`);
      const { HiringStrategySchema: HS } = await import("@reconnect/ai");
      const strategyParsed = HS.safeParse(current_strategy);
      if (!strategyParsed.success) {
        console.log(`[TRACE:adjustStages:validate] FAIL { error="Invalid current_strategy" }`);
        return NextResponse.json({ error: "Invalid current_strategy" }, { status: 400 });
      }
      const t0 = Date.now();
      const updated = await adjustProcessSpeed(strategyParsed.data, new_stages, ai_recommended_stages, {
        role, level, industry, market_insights,
      });
      console.log(`[TRACE:adjustStages:done] OK { latency=${Date.now() - t0}ms, result_stages=${updated.process_speed.max_stages}, recommendation="${updated.process_speed.recommendation}", has_trade_off=${!!updated.process_speed.trade_off} }`);
      return NextResponse.json({ data: updated });
    }

    const parsed = RequestSchema.safeParse(body);
    if (!parsed.success) {
      console.error("[generate-strategy] Validation failed:", JSON.stringify(parsed.error.issues, null, 2));
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
