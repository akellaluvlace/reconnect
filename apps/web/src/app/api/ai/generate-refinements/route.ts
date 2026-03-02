import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { generateRefinements, applyRefinements, applyRefinementsDiff, AIError } from "@reconnect/ai";

export const maxDuration = 120;

const GenerateSchema = z.object({
  role: z.string().min(1).max(200),
  level: z.string().max(100),
  coverage_analysis: z.object({
    gaps: z.array(z.object({
      requirement: z.string(),
      severity: z.string(),
      suggestion: z.string(),
    })),
    redundancies: z.array(z.object({
      focus_area: z.string(),
      appears_in_stages: z.array(z.string()),
      recommendation: z.string(),
    })),
    recommendations: z.array(z.string()),
    requirements_covered: z.array(z.object({
      requirement: z.string(),
      coverage_strength: z.string(),
    })),
    overall_coverage_score: z.number(),
  }),
  stages: z.array(z.object({
    name: z.string(),
    type: z.string(),
    focus_areas: z.array(z.object({
      name: z.string(),
      description: z.string(),
    })),
  })),
  user_prompt: z.string().max(500).optional(),
});

const ApplyDiffSchema = z.object({
  mode: z.literal("apply_diff"),
  role: z.string().min(1).max(200),
  level: z.string().max(100),
  industry: z.string().max(200),
  selected_items: z.array(z.object({
    title: z.string(),
    type: z.string(),
    change_summary: z.string(),
    source_detail: z.string().optional(),
  })).min(1),
  current_stages: z.array(z.object({
    name: z.string(),
    type: z.string(),
    duration_minutes: z.number(),
    description: z.string(),
    focus_areas: z.array(z.object({
      name: z.string(),
      description: z.string(),
      weight: z.number(),
    })),
    suggested_questions: z.array(z.object({
      question: z.string(),
      purpose: z.string(),
      look_for: z.array(z.string()),
      focus_area: z.string(),
    })),
  })),
  user_prompt: z.string().max(500).optional(),
  jd_context: z.object({
    responsibilities: z.array(z.string()).optional(),
    requirements: z.array(z.string()).optional(),
  }).optional(),
  strategy_context: z.object({
    market_classification: z.string().optional(),
    process_speed: z.object({
      recommendation: z.string(),
      max_stages: z.number(),
    }).optional(),
    skills_priority: z.object({
      must_have: z.array(z.string()),
      nice_to_have: z.array(z.string()),
    }).optional(),
  }).optional(),
});

const ApplySchema = z.object({
  mode: z.literal("apply"),
  role: z.string().min(1).max(200),
  level: z.string().max(100),
  industry: z.string().max(200),
  selected_items: z.array(z.object({
    title: z.string(),
    type: z.string(),
    change_summary: z.string(),
    source_detail: z.string().optional(),
  })).min(1),
  current_stages: z.array(z.object({
    name: z.string(),
    type: z.string(),
    duration_minutes: z.number(),
    description: z.string(),
    focus_areas: z.array(z.object({
      name: z.string(),
      description: z.string(),
      weight: z.number(),
    })),
    suggested_questions: z.array(z.object({
      question: z.string(),
      purpose: z.string(),
      look_for: z.array(z.string()),
      focus_area: z.string(),
    })),
  })),
  user_prompt: z.string().max(500).optional(),
  jd_context: z.object({
    responsibilities: z.array(z.string()).optional(),
    requirements: z.array(z.string()).optional(),
  }).optional(),
  strategy_context: z.object({
    market_classification: z.string().optional(),
    process_speed: z.object({
      recommendation: z.string(),
      max_stages: z.number(),
    }).optional(),
    skills_priority: z.object({
      must_have: z.array(z.string()),
      nice_to_have: z.array(z.string()),
    }).optional(),
  }).optional(),
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

    const mode = typeof body === "object" && body !== null && "mode" in body
      ? (body as Record<string, unknown>).mode
      : undefined;

    // Check if this is a diff-based apply request
    if (mode === "apply_diff") {
      const parsed = ApplyDiffSchema.safeParse(body);
      if (!parsed.success) {
        return NextResponse.json(
          { error: "Invalid input", issues: parsed.error.issues },
          { status: 400 },
        );
      }

      console.log(`[TRACE:applyRefinementsDiff:start] OK { items=${parsed.data.selected_items.length}, stages=${parsed.data.current_stages.length}, role="${parsed.data.role}" }`);
      const t0 = Date.now();
      const result = await applyRefinementsDiff(parsed.data);
      console.log(`[TRACE:applyRefinementsDiff:done] OK { latency=${Date.now() - t0}ms, patches=${result.data.patches.length} }`);

      return NextResponse.json({
        data: result.data,
        metadata: result.metadata,
      });
    }

    // Check if this is a full apply request
    if (mode === "apply") {
      const parsed = ApplySchema.safeParse(body);
      if (!parsed.success) {
        return NextResponse.json(
          { error: "Invalid input", issues: parsed.error.issues },
          { status: 400 },
        );
      }

      console.log(`[TRACE:applyRefinements:start] OK { items=${parsed.data.selected_items.length}, stages=${parsed.data.current_stages.length}, role="${parsed.data.role}" }`);
      const t0 = Date.now();
      const result = await applyRefinements(parsed.data);
      console.log(`[TRACE:applyRefinements:done] OK { latency=${Date.now() - t0}ms, new_stages=${result.data.stages.length} }`);

      return NextResponse.json({
        data: result.data,
        metadata: result.metadata,
      });
    }

    // Default: generate refinements
    const parsed = GenerateSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Invalid input", issues: parsed.error.issues },
        { status: 400 },
      );
    }

    const result = await generateRefinements(parsed.data);

    return NextResponse.json({
      data: result.data,
      metadata: result.metadata,
    });
  } catch (error) {
    console.error("[generate-refinements] Error:", error);
    const message =
      error instanceof AIError
        ? error.message
        : "Failed to generate refinements";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
