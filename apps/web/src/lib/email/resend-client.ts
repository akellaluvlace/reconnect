/**
 * Resend email client wrapper.
 *
 * Graceful env check: logs warning in dev if RESEND_API_KEY is missing,
 * doesn't throw. All send functions return { success: boolean }.
 */

interface SendResult {
  success: boolean;
  error?: string;
}

function getResendKey(): string | null {
  const key = process.env.RESEND_API_KEY;
  if (!key) {
    console.warn("[email] RESEND_API_KEY not set — emails will be skipped");
    return null;
  }
  return key;
}

async function sendEmail(params: {
  to: string;
  subject: string;
  html: string;
}): Promise<SendResult> {
  const apiKey = getResendKey();
  if (!apiKey) {
    console.log("[email] Skipped (no API key):", params.subject, "→", params.to);
    return { success: false, error: "RESEND_API_KEY not configured" };
  }

  try {
    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        from: process.env.RESEND_FROM_EMAIL ?? "noreply@reconnect.app",
        to: params.to,
        subject: params.subject,
        html: params.html,
      }),
    });

    if (!res.ok) {
      const body = await res.text();
      console.error("[email] Resend API error:", res.status, body);
      return { success: false, error: `Resend API ${res.status}` };
    }

    return { success: true };
  } catch (err) {
    console.error("[email] Send failed:", err);
    return {
      success: false,
      error: err instanceof Error ? err.message : "Unknown error",
    };
  }
}

export async function sendCollaboratorInvite(params: {
  to: string;
  inviterName: string;
  playbookTitle: string;
  magicLink: string;
}): Promise<SendResult> {
  const { collaboratorInviteHtml } = await import("./templates");
  return sendEmail({
    to: params.to,
    subject: `You're invited to collaborate on "${params.playbookTitle}"`,
    html: collaboratorInviteHtml(params),
  });
}

export async function sendRecordingConsentEmail(params: {
  to: string;
  candidateName: string;
  interviewDate: string;
  consentLink: string;
}): Promise<SendResult> {
  const { recordingConsentHtml } = await import("./templates");
  return sendEmail({
    to: params.to,
    subject: "Recording Consent Required — Upcoming Interview",
    html: recordingConsentHtml(params),
  });
}

export async function sendReminderEmail(params: {
  to: string;
  interviewerName: string;
  playbookTitle: string;
  message?: string;
}): Promise<SendResult> {
  const { reminderEmailHtml } = await import("./templates");
  return sendEmail({
    to: params.to,
    subject: `Feedback Reminder: ${params.playbookTitle}`,
    html: reminderEmailHtml(params),
  });
}

export async function sendPrepEmail(params: {
  to: string;
  interviewerName: string;
  playbookTitle: string;
  stages: import("./templates").PrepEmailStage[];
}): Promise<SendResult> {
  const { prepEmailHtml } = await import("./templates");
  return sendEmail({
    to: params.to,
    subject: `Interview Prep: ${params.playbookTitle}`,
    html: prepEmailHtml(params),
  });
}

export async function sendCustomBodyEmail(params: {
  to: string;
  subject: string;
  body: string;
}): Promise<SendResult> {
  const { customBodyHtml } = await import("./templates");
  return sendEmail({
    to: params.to,
    subject: params.subject,
    html: customBodyHtml(params.body),
  });
}

/* ---------- Notification email senders ---------- */

export async function sendFeedbackSubmittedEmail(params: {
  to: string;
  interviewerName: string;
  stageName: string;
  candidateName: string;
  ratingSummary: string;
  debriefLink: string;
}): Promise<SendResult> {
  const { feedbackSubmittedHtml } = await import("./templates");
  return sendEmail({
    to: params.to,
    subject: `Feedback submitted: ${params.stageName} — ${params.candidateName}`,
    html: feedbackSubmittedHtml(params),
  });
}

export async function sendAllFeedbackCollectedEmail(params: {
  to: string;
  candidateName: string;
  feedbackCount: string;
  synthesisLink: string;
}): Promise<SendResult> {
  const { allFeedbackCollectedHtml } = await import("./templates");
  return sendEmail({
    to: params.to,
    subject: `All feedback collected for ${params.candidateName}`,
    html: allFeedbackCollectedHtml(params),
  });
}

export async function sendSynthesisReadyEmail(params: {
  to: string;
  candidateName: string;
  debriefLink: string;
}): Promise<SendResult> {
  const { synthesisReadyHtml } = await import("./templates");
  return sendEmail({
    to: params.to,
    subject: `AI synthesis ready for ${params.candidateName}`,
    html: synthesisReadyHtml(params),
  });
}

export async function sendStageAssignedEmail(params: {
  to: string;
  collaboratorName: string;
  stageNames: string;
  prepLink: string;
}): Promise<SendResult> {
  const { stageAssignedHtml } = await import("./templates");
  return sendEmail({
    to: params.to,
    subject: `You've been assigned to interview stages`,
    html: stageAssignedHtml(params),
  });
}

export async function sendFeedbackRequestEmail(params: {
  to: string;
  collaboratorName: string;
  stageName: string;
  candidateName: string;
  feedbackLink: string;
}): Promise<SendResult> {
  const { feedbackRequestHtml } = await import("./templates");
  return sendEmail({
    to: params.to,
    subject: `Feedback ready: ${params.stageName} — ${params.candidateName}`,
    html: feedbackRequestHtml(params),
  });
}

export async function sendFeedbackReminderEmail(params: {
  to: string;
  collaboratorName: string;
  stageName: string;
  candidateName: string;
  feedbackLink: string;
}): Promise<SendResult> {
  const { feedbackReminderHtml } = await import("./templates");
  return sendEmail({
    to: params.to,
    subject: `Reminder: submit feedback for ${params.stageName} — ${params.candidateName}`,
    html: feedbackReminderHtml(params),
  });
}
