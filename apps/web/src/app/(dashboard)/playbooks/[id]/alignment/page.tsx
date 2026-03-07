import { notFound } from "next/navigation";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { AlignmentPageClient } from "@/components/alignment/alignment-page-client";
import { parseJsonb } from "@/lib/utils/parse-jsonb";
import {
  HiringStrategySchema,
  CandidateProfileSchema,
  MarketInsightsSchema,
  CoverageAnalysisSchema,
  FocusAreaSchema,
} from "@reconnect/ai";

import type { FocusArea } from "@reconnect/database";

// parseJsonb returns weight as number, not 1|2|3|4 — use this for the cast
type FocusAreaParsed = FocusArea;

const UUID_REGEX =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export default async function AlignmentPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  if (!UUID_REGEX.test(id)) {
    notFound();
  }

  const supabase = await createClient();

  const { data: playbook, error: pbError } = await supabase
    .from("playbooks")
    .select("*")
    .eq("id", id)
    .single();

  if (pbError) {
    if (pbError.code !== "PGRST116") {
      console.error("[alignment] Playbook query failed:", pbError.message);
    }
    notFound();
  }

  const { data: stages } = await supabase
    .from("interview_stages")
    .select("id, name, type, duration_minutes, order_index, focus_areas, suggested_questions")
    .eq("playbook_id", id)
    .order("order_index", { ascending: true });

  const { data: collaborators } = await supabase
    .from("collaborators")
    .select("*")
    .eq("playbook_id", id)
    .order("created_at", { ascending: false });

  const { data: shareLinks } = await supabase
    .from("share_links")
    .select("*")
    .eq("playbook_id", id)
    .eq("is_active", true)
    .order("created_at", { ascending: false });

  const hiringStrategy = parseJsonb(playbook.hiring_strategy, HiringStrategySchema, "hiring_strategy");
  const coverageAnalysis = parseJsonb(
    (playbook as Record<string, unknown>).coverage_analysis,
    CoverageAnalysisSchema,
    "coverage_analysis",
  );

  // Extract generated_at from strategy JSONB for stale profile detection
  // generated_at is added client-side (not in AI schema), so read from raw JSONB
  const rawStrategy = playbook.hiring_strategy as Record<string, unknown> | null;
  const strategyGeneratedAt = typeof rawStrategy?.generated_at === "string"
    ? rawStrategy.generated_at
    : null;

  // Parse focus_areas per stage for interactive overview + scorecard
  const parsedStages = (stages ?? []).map((s) => ({
    id: s.id,
    name: s.name,
    type: s.type ?? "custom",
    duration_minutes: s.duration_minutes ?? 0,
    order_index: s.order_index,
    focus_areas: parseJsonb(
      s.focus_areas,
      z.array(FocusAreaSchema),
      "focus_areas",
    ) as FocusAreaParsed[] | null,
    questions: parseJsonb(
      s.suggested_questions,
      z.array(z.object({
        question: z.string(),
        purpose: z.string(),
        focus_area: z.string().optional(),
        look_for: z.array(z.string()).optional(),
      })),
      "suggested_questions",
    ) as Array<{ question: string; purpose: string; focus_area?: string; look_for?: string[] }> | null,
  }));

  return (
    <AlignmentPageClient
      playbook={{
        id: playbook.id,
        title: playbook.title,
        level: playbook.level ?? null,
        industry: playbook.industry ?? null,
        skills: parseJsonb(playbook.skills, z.array(z.string()), "skills"),
        hiring_strategy: hiringStrategy,
        candidate_profile: parseJsonb(playbook.candidate_profile, CandidateProfileSchema, "candidate_profile"),
        market_insights: parseJsonb(playbook.market_insights, MarketInsightsSchema, "market_insights"),
        status: (playbook as Record<string, unknown>).status as string | null ?? null,
      }}
      strategyGeneratedAt={strategyGeneratedAt}
      coverageAnalysis={coverageAnalysis}
      initialStages={parsedStages}
      initialCollaborators={collaborators ?? []}
      initialShareLinks={shareLinks ?? []}
    />
  );
}
