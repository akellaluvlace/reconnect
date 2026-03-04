import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { analyzeCoverage, analyzeCoverageAnchored, safeErrorMessage, CoverageAnalysisSchema } from "@reconnect/ai";

const RequestSchema = z.object({
  role: z.string().min(1).max(200),
  level: z.string().min(1).max(100),
  jd_requirements: z.object({
    required: z.array(z.string().max(500)).max(50),
    preferred: z.array(z.string().max(500)).max(50),
    responsibilities: z.array(z.string().max(500)).max(50),
  }),
  stages: z.array(
    z.object({
      name: z.string().max(200),
      type: z.string().max(100),
      focus_areas: z.array(
        z.object({
          name: z.string().max(200),
          description: z.string().max(1000),
        }),
      ).max(10),
    }),
  ).max(20),
});

const AnchoredRequestSchema = RequestSchema.extend({
  previous_coverage: CoverageAnalysisSchema,
  changed_fa_names: z.array(z.string().max(200)).max(50),
  has_additions: z.boolean(),
  gap_targets: z.array(z.object({
    gap_requirement: z.string().max(500),
    fa_name: z.string().max(200),
    fa_description: z.string().max(1000),
  })).max(50).optional(),
});

// Coverage analysis observed at 31s but can spike under load. Vercel Pro supports up to 300s.
export const maxDuration = 300;

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

    // Explicit dispatch: anchored mode if previous_coverage present
    const rawBody = body as Record<string, unknown>;
    const isAnchored = "previous_coverage" in rawBody && rawBody.previous_coverage != null;

    if (isAnchored) {
      const anchoredParsed = AnchoredRequestSchema.safeParse(body);
      if (!anchoredParsed.success) {
        return NextResponse.json(
          { error: "Invalid anchored coverage input", issues: anchoredParsed.error.issues },
          { status: 400 },
        );
      }
      const stageNames = anchoredParsed.data.stages.map((s) => `${s.name}(${s.focus_areas.length})`).join(", ");
      console.log(`[analyze-coverage] ANCHORED RECEIVED { stages=${anchoredParsed.data.stages.length}: [${stageNames}], previousScore=${anchoredParsed.data.previous_coverage.overall_coverage_score}% }`);
      const result = await analyzeCoverageAnchored(anchoredParsed.data);
      console.log(`[analyze-coverage] ANCHORED OK { score=${result.data?.overall_coverage_score}%, covered=${result.data?.requirements_covered?.length ?? 0}, gaps=${result.data?.gaps?.length ?? 0} }`);
      return NextResponse.json({
        data: result.data,
        metadata: result.metadata,
      });
    }

    // Full analysis mode
    const parsed = RequestSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Invalid input", issues: parsed.error.issues },
        { status: 400 },
      );
    }

    const stageNames = parsed.data.stages.map((s) => `${s.name}(${s.focus_areas.length})`).join(", ");
    console.log(`[analyze-coverage] FULL RECEIVED { stages=${parsed.data.stages.length}: [${stageNames}] }`);
    const result = await analyzeCoverage(parsed.data);
    console.log(`[analyze-coverage] FULL OK { score=${result.data?.overall_coverage_score}%, covered=${result.data?.requirements_covered?.length ?? 0}, gaps=${result.data?.gaps?.length ?? 0} }`);

    return NextResponse.json({
      data: result.data,
      metadata: result.metadata,
    });
  } catch (error) {
    console.error("[analyze-coverage] Error:", error);
    return NextResponse.json(
      { error: safeErrorMessage(error, "Failed to analyze coverage") },
      { status: 500 },
    );
  }
}
