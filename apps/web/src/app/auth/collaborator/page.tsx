import { notFound } from "next/navigation";
import { createServiceRoleClient } from "@/lib/supabase/service-role";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  CheckCircle,
  WarningCircle,
  ClipboardText,
  Crosshair,
  ChatTeardropDots,
  Clock,
  Star,
} from "@phosphor-icons/react/dist/ssr";

// ---------------------------------------------------------------------------
// JSONB helpers
// ---------------------------------------------------------------------------

interface FocusArea {
  name: string;
  description?: string;
  weight?: number;
}

interface Question {
  question: string;
  purpose?: string;
  focus_area?: string;
}

function parseFocusAreas(raw: unknown): FocusArea[] {
  if (!raw) return [];
  try {
    const arr = typeof raw === "string" ? JSON.parse(raw) : raw;
    if (!Array.isArray(arr)) return [];
    return arr.map((fa: Record<string, unknown>) => ({
      name: String(fa.name ?? ""),
      description: fa.description ? String(fa.description) : undefined,
      weight: fa.weight ? Number(fa.weight) : undefined,
    }));
  } catch {
    return [];
  }
}

function parseQuestions(raw: unknown): Question[] {
  if (!raw) return [];
  try {
    const arr = typeof raw === "string" ? JSON.parse(raw) : raw;
    if (!Array.isArray(arr)) return [];
    return arr.map((q: Record<string, unknown>) => ({
      question: String(q.question ?? ""),
      purpose: q.purpose ? String(q.purpose) : undefined,
      focus_area: q.focus_area ? String(q.focus_area) : undefined,
    }));
  } catch {
    return [];
  }
}

// ---------------------------------------------------------------------------
// Page
// ---------------------------------------------------------------------------

export default async function CollaboratorAcceptPage({
  searchParams,
}: {
  searchParams: Promise<{ token?: string }>;
}) {
  const { token } = await searchParams;

  if (!token) {
    notFound();
  }

  const serviceClient = createServiceRoleClient();

  // Look up collaborator by invite token
  const { data: collaborator, error } = await serviceClient
    .from("collaborators")
    .select("id, email, name, role, accepted_at, expires_at, playbook_id, assigned_stages")
    .eq("invite_token", token)
    .single();

  if (error || !collaborator) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background p-4">
        <Card className="w-full max-w-md">
          <CardContent className="pt-6 text-center space-y-3">
            <WarningCircle size={40} weight="duotone" className="mx-auto text-amber-500" />
            <h2 className="text-lg font-semibold">Invalid Invitation</h2>
            <p className="text-sm text-muted-foreground">
              This invitation link is invalid or has already been used.
              Please contact the person who invited you for a new link.
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Check expiration
  if (collaborator.expires_at && new Date(collaborator.expires_at) < new Date()) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background p-4">
        <Card className="w-full max-w-md">
          <CardContent className="pt-6 text-center space-y-3">
            <WarningCircle size={40} weight="duotone" className="mx-auto text-amber-500" />
            <h2 className="text-lg font-semibold">Invitation Expired</h2>
            <p className="text-sm text-muted-foreground">
              This invitation has expired. Please contact the hiring team
              to request a new invitation.
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Fetch playbook title
  const { data: playbook } = await serviceClient
    .from("playbooks")
    .select("title")
    .eq("id", collaborator.playbook_id ?? "")
    .single();

  // Fetch stages for this playbook
  const assignedStages = collaborator.assigned_stages as string[] | null;
  let stagesQuery = serviceClient
    .from("interview_stages")
    .select("id, name, type, duration_minutes, order_index, focus_areas, suggested_questions")
    .eq("playbook_id", collaborator.playbook_id ?? "")
    .order("order_index", { ascending: true });

  if (assignedStages && assignedStages.length > 0) {
    stagesQuery = stagesQuery.in("id", assignedStages);
  }

  const { data: rawStages } = await stagesQuery;
  const stages = rawStages ?? [];

  // Mark as accepted (if not already)
  if (!collaborator.accepted_at) {
    await serviceClient
      .from("collaborators")
      .update({ accepted_at: new Date().toISOString() })
      .eq("id", collaborator.id);
  }

  const interviewerName = collaborator.name || collaborator.email.split("@")[0];

  return (
    <div className="min-h-screen bg-background py-10 px-4">
      <div className="mx-auto max-w-2xl space-y-6">
        {/* Header */}
        <Card>
          <CardHeader className="text-center pb-2">
            <CheckCircle size={44} weight="duotone" className="mx-auto text-green-500 mb-2" />
            <CardTitle className="text-xl">Interview Preparation</CardTitle>
          </CardHeader>
          <CardContent className="text-center space-y-4">
            <p className="text-sm text-muted-foreground">
              Hi <span className="font-medium text-foreground">{interviewerName}</span>,
              {collaborator.accepted_at
                ? " here's your interview preparation brief."
                : " thank you for accepting. Here's your interview preparation brief."}
            </p>

            <div className="rounded-lg border bg-muted/30 p-4 space-y-2 text-left">
              {playbook?.title && (
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Position</span>
                  <span className="font-medium">{playbook.title}</span>
                </div>
              )}
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Your role</span>
                <span className="font-medium capitalize">{collaborator.role ?? "Interviewer"}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Stages assigned</span>
                <span className="font-medium">{stages.length}</span>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Stages */}
        {stages.length > 0 && (
          <div className="space-y-4">
            {stages.map((stage, idx) => {
              const focusAreas = parseFocusAreas(stage.focus_areas);
              const questions = parseQuestions(stage.suggested_questions);

              return (
                <Card key={stage.id}>
                  <CardHeader className="pb-3">
                    <div className="flex items-center justify-between">
                      <CardTitle className="text-base flex items-center gap-2">
                        <ClipboardText size={20} weight="duotone" className="text-teal-600" />
                        Stage {idx + 1}: {stage.name}
                      </CardTitle>
                      <div className="flex items-center gap-2 text-xs text-muted-foreground">
                        <span className="rounded-md border bg-muted/40 px-2 py-0.5 font-medium capitalize">
                          {stage.type ?? "interview"}
                        </span>
                        <span className="flex items-center gap-1">
                          <Clock size={12} />
                          {stage.duration_minutes ?? 60} min
                        </span>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-5">
                    {/* Focus Areas */}
                    {focusAreas.length > 0 && (
                      <div>
                        <h4 className="text-sm font-semibold flex items-center gap-1.5 mb-2">
                          <Crosshair size={14} weight="duotone" className="text-teal-600" />
                          Focus Areas
                        </h4>
                        <div className="space-y-2">
                          {focusAreas.map((fa, i) => (
                            <div key={i} className="rounded-lg border bg-muted/20 px-4 py-2.5">
                              <div className="flex items-center justify-between">
                                <span className="text-sm font-medium">{fa.name}</span>
                                {fa.weight && (
                                  <span className="flex items-center gap-1 text-xs text-muted-foreground">
                                    <Star size={11} weight="fill" className="text-amber-400" />
                                    Weight: {fa.weight}/4
                                  </span>
                                )}
                              </div>
                              {fa.description && (
                                <p className="mt-1 text-xs text-muted-foreground">{fa.description}</p>
                              )}
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Questions */}
                    {questions.length > 0 && (
                      <div>
                        <h4 className="text-sm font-semibold flex items-center gap-1.5 mb-2">
                          <ChatTeardropDots size={14} weight="duotone" className="text-teal-600" />
                          Suggested Questions
                        </h4>
                        <ol className="space-y-2">
                          {questions.map((q, i) => (
                            <li key={i} className="rounded-lg border bg-muted/20 px-4 py-2.5">
                              <p className="text-sm font-medium">
                                {i + 1}. {q.question}
                              </p>
                              {q.purpose && (
                                <p className="mt-1 text-xs text-muted-foreground">
                                  Purpose: {q.purpose}
                                </p>
                              )}
                            </li>
                          ))}
                        </ol>
                      </div>
                    )}
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}

        {/* Rating Guide */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base flex items-center gap-2">
              <Star size={20} weight="duotone" className="text-amber-500" />
              Rating Guide
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground mb-3">
              Rate each focus area from 1-4 based on the candidate&apos;s responses.
              Add specific pros and cons to support your ratings.
            </p>
            <div className="grid grid-cols-2 gap-2">
              {[
                { score: 1, label: "Does not meet expectations" },
                { score: 2, label: "Partially meets expectations" },
                { score: 3, label: "Meets expectations" },
                { score: 4, label: "Exceeds expectations" },
              ].map(({ score, label }) => (
                <div key={score} className="flex items-center gap-2 rounded-lg border bg-muted/20 px-3 py-2 text-sm">
                  <span className="flex h-6 w-6 items-center justify-center rounded-full bg-teal-100 text-xs font-bold text-teal-800">
                    {score}
                  </span>
                  <span className="text-muted-foreground">{label}</span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Footer note */}
        <p className="text-center text-xs text-muted-foreground pb-6">
          After your interview, you&apos;ll receive a link to submit your feedback.
          If you have questions, please contact the hiring team.
        </p>
      </div>
    </div>
  );
}
