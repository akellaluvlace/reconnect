import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { analyzeCoverage, safeErrorMessage } from "@reconnect/ai";

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

    // Full analysis — always fresh, score reflects current stages accurately
    const parsed = RequestSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Invalid input", issues: parsed.error.issues },
        { status: 400 },
      );
    }

    const stageNames = parsed.data.stages.map((s) => `${s.name}(${s.focus_areas.length}FAs)`).join(", ");
    console.log(`[analyze-coverage] INPUT { stages=${parsed.data.stages.length}: [${stageNames}], reqs=${parsed.data.jd_requirements.required.length}req+${parsed.data.jd_requirements.preferred.length}pref }`);

    const result = await analyzeCoverage(parsed.data);

    console.log(`[analyze-coverage] RESULT { score=${result.data?.overall_coverage_score}%, covered=${result.data?.requirements_covered?.length ?? 0}, gaps=${result.data?.gaps?.length ?? 0} }`);

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
