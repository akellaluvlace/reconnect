import { createServiceRoleClient } from "@/lib/supabase/service-role";

type NotificationType =
  | "feedback_submitted"
  | "all_feedback_collected"
  | "synthesis_ready"
  | "stage_assigned"
  | "feedback_reminder";

/**
 * Notify the playbook manager. Fire-and-forget — never throws.
 * Checks user notification preferences before sending.
 */
export async function notifyManager(params: {
  playbookId: string;
  type: NotificationType;
  data: Record<string, string>;
}): Promise<void> {
  try {
    const supabase = createServiceRoleClient();

    // Resolve playbook → creator → user (email + preferences)
    const { data: playbook } = await supabase
      .from("playbooks")
      .select("created_by, title, organization_id")
      .eq("id", params.playbookId)
      .single();

    if (!playbook?.created_by) return;

    const { data: user } = await supabase
      .from("users")
      .select("email, notification_preferences")
      .eq("id", playbook.created_by)
      .single();

    if (!user?.email) return;

    // Check preferences (default all true if null)
    const prefs = (user.notification_preferences ?? {}) as Record<
      string,
      boolean
    >;
    if (prefs[params.type] === false) return;

    // Try CMS template first (org-scoped), fall back to built-in
    const { data: cmsTemplate } = await supabase
      .from("cms_email_templates")
      .select("subject, body_html")
      .eq("template_type", params.type)
      .eq("organization_id", playbook.organization_id)
      .eq("is_active", true)
      .limit(1)
      .single();

    if (cmsTemplate) {
      const { interpolateTemplate } = await import(
        "@/lib/admin/email-interpolation"
      );
      const { sendCustomBodyEmail } = await import(
        "@/lib/email/resend-client"
      );
      await sendCustomBodyEmail({
        to: user.email,
        subject: interpolateTemplate(cmsTemplate.subject, params.data),
        body: interpolateTemplate(cmsTemplate.body_html, params.data),
      });
    } else {
      // Use built-in template based on type
      await sendBuiltInNotification(user.email, params.type, params.data);
    }
  } catch (err) {
    console.error(
      `[notifications] notifyManager failed (${params.type}):`,
      err,
    );
    // Fire-and-forget — never throw
  }
}

/**
 * Notify a collaborator. Fire-and-forget — never throws.
 * No preferences check (external users).
 */
export async function notifyCollaborator(params: {
  collaboratorId: string;
  type: NotificationType;
  data: Record<string, string>;
}): Promise<void> {
  try {
    const supabase = createServiceRoleClient();

    const { data: collaborator } = await supabase
      .from("collaborators")
      .select("email")
      .eq("id", params.collaboratorId)
      .single();

    if (!collaborator?.email) return;

    await sendBuiltInNotification(
      collaborator.email,
      params.type,
      params.data,
    );
  } catch (err) {
    console.error(
      `[notifications] notifyCollaborator failed (${params.type}):`,
      err,
    );
  }
}

/**
 * Check if all collaborators assigned to an interview's stage have submitted feedback.
 * If so, notify the manager.
 */
export async function checkAllFeedbackCollected(
  interviewId: string,
  playbookId: string,
): Promise<boolean> {
  try {
    const supabase = createServiceRoleClient();

    // Get interview's stage
    const { data: interview } = await supabase
      .from("interviews")
      .select("stage_id, candidate_id")
      .eq("id", interviewId)
      .single();

    if (!interview?.stage_id) return false;

    // Get candidate name
    const { data: candidate } = await supabase
      .from("candidates")
      .select("name")
      .eq("id", interview.candidate_id!)
      .single();

    // Count collaborators assigned to this stage
    const { count: collaboratorCount } = await supabase
      .from("collaborators")
      .select("id", { count: "exact", head: true })
      .eq("playbook_id", playbookId)
      .contains("assigned_stages", [interview.stage_id]);

    // Count feedback entries for this interview
    const { count: feedbackCount } = await supabase
      .from("feedback")
      .select("id", { count: "exact", head: true })
      .eq("interview_id", interviewId);

    if (
      collaboratorCount &&
      feedbackCount &&
      feedbackCount >= collaboratorCount
    ) {
      const appUrl =
        process.env.NEXT_PUBLIC_APP_URL ?? "https://app.axil.ie";
      await notifyManager({
        playbookId,
        type: "all_feedback_collected",
        data: {
          candidateName: candidate?.name ?? "Unknown",
          feedbackCount: String(feedbackCount),
          synthesisLink: `${appUrl}/playbooks/${playbookId}/debrief`,
        },
      });
      return true;
    }

    return false;
  } catch (err) {
    console.error("[notifications] checkAllFeedbackCollected failed:", err);
    return false;
  }
}

async function sendBuiltInNotification(
  to: string,
  type: NotificationType,
  data: Record<string, string>,
): Promise<void> {
  const client = await import("@/lib/email/resend-client");

  switch (type) {
    case "feedback_submitted":
      await client.sendFeedbackSubmittedEmail({
        to,
        interviewerName: data.interviewerName ?? "An interviewer",
        stageName: data.stageName ?? "Interview",
        candidateName: data.candidateName ?? "Candidate",
        ratingSummary: data.ratingSummary ?? "",
        debriefLink: data.debriefLink ?? "",
      });
      break;
    case "all_feedback_collected":
      await client.sendAllFeedbackCollectedEmail({
        to,
        candidateName: data.candidateName ?? "Candidate",
        feedbackCount: data.feedbackCount ?? "0",
        synthesisLink: data.synthesisLink ?? "",
      });
      break;
    case "synthesis_ready":
      await client.sendSynthesisReadyEmail({
        to,
        candidateName: data.candidateName ?? "Candidate",
        debriefLink: data.debriefLink ?? "",
      });
      break;
    case "stage_assigned":
      await client.sendStageAssignedEmail({
        to,
        collaboratorName: data.collaboratorName ?? "",
        stageNames: data.stageNames ?? "",
        prepLink: data.prepLink ?? "",
      });
      break;
    case "feedback_reminder":
      await client.sendFeedbackReminderEmail({
        to,
        collaboratorName: data.collaboratorName ?? "",
        stageName: data.stageName ?? "Interview",
        candidateName: data.candidateName ?? "Candidate",
        feedbackLink: data.feedbackLink ?? "",
      });
      break;
  }
}
