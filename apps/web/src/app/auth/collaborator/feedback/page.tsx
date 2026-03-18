import { notFound } from "next/navigation";
import { createServiceRoleClient } from "@/lib/supabase/service-role";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { CheckCircle } from "@phosphor-icons/react/dist/ssr";
import { CollaboratorFeedbackClient } from "@/components/debrief/collaborator-feedback-client";

function parseFocusAreas(
  raw: unknown,
): Array<{ name: string; area?: string }> {
  let arr: unknown[];
  if (!raw) return [];
  if (typeof raw === "string") {
    try {
      const parsed = JSON.parse(raw);
      if (!Array.isArray(parsed)) return [];
      arr = parsed;
    } catch {
      return [];
    }
  } else if (Array.isArray(raw)) {
    arr = raw;
  } else {
    return [];
  }
  // Filter out malformed entries — each must have name or area as a string
  return arr.filter(
    (item): item is { name: string; area?: string } =>
      typeof item === "object" &&
      item !== null &&
      (typeof (item as Record<string, unknown>).name === "string" ||
        typeof (item as Record<string, unknown>).area === "string"),
  );
}

export default async function CollaboratorFeedbackPage({
  searchParams,
}: {
  searchParams: Promise<{ token?: string; interview_id?: string }>;
}) {
  const { token, interview_id } = await searchParams;
  if (!token || !interview_id) return notFound();

  const supabase = createServiceRoleClient();

  // Validate token
  const { data: collaborator } = await supabase
    .from("collaborators")
    .select(
      "id, email, name, playbook_id, assigned_stages, expires_at, accepted_at",
    )
    .eq("invite_token", token)
    .single();

  if (!collaborator) return notFound();

  if (new Date(collaborator.expires_at) < new Date()) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#fdfcfa]">
        <Card className="max-w-md">
          <CardContent className="p-6 text-center">
            <p className="text-lg font-semibold text-red-600">
              Invitation Expired
            </p>
            <p className="text-sm text-muted-foreground mt-2">
              Please contact the hiring manager for a new link.
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Fetch interview + stage
  const { data: interview } = await supabase
    .from("interviews")
    .select("id, stage_id, candidate_id, status")
    .eq("id", interview_id)
    .single();

  if (!interview) return notFound();

  // Interview must have a stage
  if (!interview.stage_id) return notFound();

  // Verify stage belongs to collaborator's playbook
  const { data: stage } = await supabase
    .from("interview_stages")
    .select("id, name, focus_areas, playbook_id")
    .eq("id", interview.stage_id)
    .single();

  if (!stage || stage.playbook_id !== collaborator.playbook_id) return notFound();

  // Verify stage assignment if collaborator has specific stages
  if (collaborator.assigned_stages) {
    const assigned = collaborator.assigned_stages as string[];
    if (assigned.length > 0 && !assigned.includes(interview.stage_id)) return notFound();
  }

  const focusAreas = parseFocusAreas(stage?.focus_areas).map(
    (fa) => fa.name ?? fa.area ?? "Unknown",
  );

  // Check for existing feedback
  const { data: existingFeedback } = await supabase
    .from("feedback")
    .select("id")
    .eq("interview_id", interview_id)
    .eq("collaborator_id", collaborator.id)
    .limit(1);

  const alreadySubmitted =
    existingFeedback && existingFeedback.length > 0;

  // Get playbook title
  const { data: playbook } = collaborator.playbook_id
    ? await supabase
        .from("playbooks")
        .select("title")
        .eq("id", collaborator.playbook_id)
        .single()
    : { data: null };

  if (alreadySubmitted) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#fdfcfa]">
        <Card className="max-w-md">
          <CardContent className="p-6 text-center">
            <CheckCircle
              size={48}
              weight="duotone"
              className="text-teal-500 mx-auto mb-4"
            />
            <p className="text-lg font-semibold">
              Feedback Already Submitted
            </p>
            <p className="text-sm text-muted-foreground mt-2">
              Thank you for your feedback on this interview.
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#fdfcfa] py-8 px-4">
      <div className="max-w-2xl mx-auto space-y-6">
        <Card>
          <CardHeader>
            <CardTitle className="font-urbanist text-xl">
              Submit Interview Feedback
            </CardTitle>
            <p className="text-sm text-muted-foreground">
              {playbook?.title} &mdash; {stage?.name ?? "Interview"}
            </p>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground mb-4">
              Rate each focus area from 1 (Below Expectations) to 4
              (Exceeds Expectations). All ratings and confirmation of
              discussed focus areas are required.
            </p>
          </CardContent>
        </Card>

        <CollaboratorFeedbackClient
          interviewId={interview_id}
          token={token}
          focusAreas={focusAreas}
        />
      </div>
    </div>
  );
}
