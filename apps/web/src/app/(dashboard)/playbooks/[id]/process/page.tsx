import { notFound } from "next/navigation";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { ProcessPageClient } from "@/components/process/process-page-client";
import { parseJsonb } from "@/lib/utils/parse-jsonb";
import {
  JobDescriptionSchema,
  HiringStrategySchema,
  FocusAreaSchema,
  SuggestedQuestionSchema,
} from "@reconnect/ai";
import type { FocusArea, SuggestedQuestion } from "@reconnect/database";

const UUID_REGEX =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export default async function ProcessPage({
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
      console.error("[process] Playbook query failed:", pbError.message);
    }
    notFound();
  }

  const { data: stages, error: stagesError } = await supabase
    .from("interview_stages")
    .select("*")
    .eq("playbook_id", id)
    .order("order_index", { ascending: true });

  if (stagesError) {
    console.error("[process] Stages query failed:", stagesError.message);
  }

  return (
    <ProcessPageClient
      playbook={{
        id: playbook.id,
        title: playbook.title,
        level: playbook.level ?? null,
        industry: playbook.industry ?? null,
        job_description: parseJsonb(playbook.job_description, JobDescriptionSchema, "job_description"),
        hiring_strategy: parseJsonb(playbook.hiring_strategy, HiringStrategySchema, "hiring_strategy"),
        market_insights: playbook.market_insights as Record<string, unknown> | null,
      }}
      initialStages={(stages ?? []).map((s) => ({
        ...s,
        playbook_id: s.playbook_id ?? "",
        type: s.type ?? "custom",
        duration_minutes: s.duration_minutes ?? 0,
        // Safe assertions: Zod validates shape; weight is int 1-4 matching domain literal union
        focus_areas: parseJsonb(s.focus_areas, z.array(FocusAreaSchema), "focus_areas") as FocusArea[] | null,
        suggested_questions: parseJsonb(s.suggested_questions, z.array(SuggestedQuestionSchema), "suggested_questions") as SuggestedQuestion[] | null,
      }))}
    />
  );
}
