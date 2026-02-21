import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { DebriefPageClient } from "@/components/debrief/debrief-page-client";

const UUID_REGEX =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export default async function DebriefPage({
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
    .select("id, title")
    .eq("id", id)
    .single();

  if (pbError) {
    if (pbError.code !== "PGRST116") {
      console.error("[debrief] Playbook query failed:", pbError.message);
    }
    notFound();
  }

  const { data: stages, error: stagesError } = await supabase
    .from("interview_stages")
    .select("id, name, type, order_index")
    .eq("playbook_id", id)
    .order("order_index", { ascending: true });

  if (stagesError) {
    console.error("[debrief] Stages query failed:", stagesError.message);
  }

  const { data: candidates, error: candidatesError } = await supabase
    .from("candidates")
    .select("*")
    .eq("playbook_id", id)
    .order("created_at", { ascending: false });

  if (candidatesError) {
    console.error("[debrief] Candidates query failed:", candidatesError.message);
  }

  // Fetch interviews for all candidates in this playbook
  const candidateIds = (candidates ?? []).map((c) => c.id);

  const { data: interviews, error: interviewsError } =
    candidateIds.length > 0
      ? await supabase
          .from("interviews")
          .select("*")
          .in("candidate_id", candidateIds)
          .order("scheduled_at", { ascending: true })
      : { data: null, error: null };

  if (interviewsError) {
    console.error("[debrief] Interviews query failed:", interviewsError.message);
  }

  // Fetch user's role for blind feedback logic
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError) {
    console.error("[debrief] Auth check failed:", authError.message);
  }

  let userRole = "interviewer";
  if (user) {
    const { data: userRow } = await supabase
      .from("users")
      .select("role")
      .eq("id", user.id)
      .single();
    userRole = userRow?.role ?? "interviewer";
  }

  return (
    <DebriefPageClient
      playbookId={playbook.id}
      playbookTitle={playbook.title}
      stages={stages ?? []}
      candidates={candidates ?? []}
      interviews={interviews ?? []}
      currentUserId={user?.id ?? ""}
      currentUserRole={userRole}
    />
  );
}
