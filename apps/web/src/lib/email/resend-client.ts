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
