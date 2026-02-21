import { notFound } from "next/navigation";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { AlignmentPageClient } from "@/components/alignment/alignment-page-client";
import { parseJsonb } from "@/lib/utils/parse-jsonb";
import {
  HiringStrategySchema,
  CandidateProfileSchema,
} from "@reconnect/ai";

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
    .select("id, name, type, duration_minutes, order_index")
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

  return (
    <AlignmentPageClient
      playbook={{
        id: playbook.id,
        title: playbook.title,
        level: playbook.level ?? null,
        industry: playbook.industry ?? null,
        skills: parseJsonb(playbook.skills, z.array(z.string()), "skills"),
        hiring_strategy: parseJsonb(playbook.hiring_strategy, HiringStrategySchema, "hiring_strategy"),
        candidate_profile: parseJsonb(playbook.candidate_profile, CandidateProfileSchema, "candidate_profile"),
      }}
      initialStages={(stages ?? []).map((s) => ({
        id: s.id,
        name: s.name,
        type: s.type ?? "custom",
        duration_minutes: s.duration_minutes ?? 0,
        order_index: s.order_index,
      }))}
      initialCollaborators={collaborators ?? []}
      initialShareLinks={shareLinks ?? []}
    />
  );
}
