/**
 * Plain HTML email templates.
 * Inline styles for maximum email client compatibility.
 */

function baseWrapper(content: string): string {
  return `<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width"></head>
<body style="margin:0;padding:0;background:#f4f4f5;font-family:Arial,Helvetica,sans-serif">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#f4f4f5;padding:32px 0">
    <tr><td align="center">
      <table width="600" cellpadding="0" cellspacing="0" style="background:#ffffff;border-radius:8px;overflow:hidden">
        <tr>
          <td style="background:#042f2e;padding:24px 32px">
            <h1 style="margin:0;color:#14b8a6;font-size:20px">Axil</h1>
          </td>
        </tr>
        <tr>
          <td style="padding:32px">
            ${content}
          </td>
        </tr>
        <tr>
          <td style="padding:16px 32px;background:#fafafa;border-top:1px solid #e4e4e7;font-size:12px;color:#71717a">
            Sent by Axil. If you didn't expect this email, you can safely ignore it.
          </td>
        </tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`;
}

/** Wrap user-edited plain text in the branded email template. */
export function customBodyHtml(plainText: string): string {
  const escaped = escapeHtml(plainText);
  // Convert line breaks to HTML, preserve blank-line paragraph separation
  const htmlBody = escaped
    .split("\n\n")
    .map((para) => `<p style="margin:0 0 12px;color:#3f3f46;font-size:14px;line-height:1.6;white-space:pre-wrap">${para.replace(/\n/g, "<br>")}</p>`)
    .join("");
  return baseWrapper(htmlBody);
}

export function collaboratorInviteHtml(params: {
  inviterName: string;
  playbookTitle: string;
  magicLink: string;
}): string {
  return baseWrapper(`
    <h2 style="margin:0 0 16px;font-size:18px;color:#18181b">You've been invited to collaborate</h2>
    <p style="margin:0 0 8px;color:#3f3f46;font-size:14px;line-height:1.6">
      <strong>${escapeHtml(params.inviterName)}</strong> has invited you to collaborate on
      the hiring plan <strong>"${escapeHtml(params.playbookTitle)}"</strong>.
    </p>
    <p style="margin:0 0 24px;color:#3f3f46;font-size:14px;line-height:1.6">
      Click the button below to accept the invitation and access the hiring plan.
    </p>
    <a href="${escapeHtml(params.magicLink)}" style="display:inline-block;padding:12px 24px;background:#14b8a6;color:#ffffff;text-decoration:none;border-radius:6px;font-size:14px;font-weight:600">
      Accept Invitation
    </a>
    <p style="margin:24px 0 0;color:#71717a;font-size:12px">
      This link expires in 7 days.
    </p>
  `);
}

export function recordingConsentHtml(params: {
  candidateName: string;
  interviewDate: string;
  consentLink: string;
}): string {
  return baseWrapper(`
    <h2 style="margin:0 0 16px;font-size:18px;color:#18181b">Recording Consent Required</h2>
    <p style="margin:0 0 8px;color:#3f3f46;font-size:14px;line-height:1.6">
      Dear ${escapeHtml(params.candidateName)},
    </p>
    <p style="margin:0 0 8px;color:#3f3f46;font-size:14px;line-height:1.6">
      Your upcoming interview on <strong>${escapeHtml(params.interviewDate)}</strong> may be recorded
      to ensure accurate evaluation and improve our hiring process.
    </p>
    <p style="margin:0 0 24px;color:#3f3f46;font-size:14px;line-height:1.6">
      Please click below to review and provide your consent.
    </p>
    <a href="${escapeHtml(params.consentLink)}" style="display:inline-block;padding:12px 24px;background:#14b8a6;color:#ffffff;text-decoration:none;border-radius:6px;font-size:14px;font-weight:600">
      Review &amp; Consent
    </a>
    <p style="margin:24px 0 0;color:#71717a;font-size:12px">
      If you choose not to consent, the interview will proceed without recording.
    </p>
  `);
}

export interface PrepEmailStage {
  name: string;
  type: string;
  duration_minutes: number;
  focus_areas: Array<{ name: string; description: string; weight: number }>;
  questions: Array<{
    question: string;
    purpose: string;
    focus_area?: string;
    look_for?: string[];
  }>;
}

export function prepEmailHtml(params: {
  interviewerName: string;
  playbookTitle: string;
  stages: PrepEmailStage[];
}): string {
  const stageCards = params.stages
    .map(
      (stage) => `
      <table width="100%" cellpadding="0" cellspacing="0" style="margin-bottom:24px;border:1px solid #e4e4e7;border-radius:8px;overflow:hidden">
        <tr>
          <td style="background:#f4f4f5;padding:12px 16px;border-bottom:1px solid #e4e4e7">
            <strong style="font-size:15px;color:#18181b">${escapeHtml(stage.name)}</strong>
            <span style="margin-left:8px;font-size:12px;color:#71717a">${escapeHtml(stage.type)} &middot; ${stage.duration_minutes} min</span>
          </td>
        </tr>
        <tr>
          <td style="padding:16px">
            ${
              stage.focus_areas.length > 0
                ? `<p style="margin:0 0 8px;font-size:13px;font-weight:600;color:#18181b">Focus Areas</p>
                   <table width="100%" cellpadding="0" cellspacing="0" style="margin-bottom:16px">
                     ${stage.focus_areas
                       .map(
                         (fa) => `<tr>
                       <td style="padding:4px 0;font-size:13px;color:#3f3f46">
                         <strong>${escapeHtml(fa.name)}</strong>
                         <span style="color:#71717a"> (weight: ${fa.weight})</span>
                         ${fa.description ? `<br><span style="font-size:12px;color:#71717a">${escapeHtml(fa.description)}</span>` : ""}
                       </td>
                     </tr>`,
                       )
                       .join("")}
                   </table>`
                : ""
            }
            ${
              stage.questions.length > 0
                ? `<p style="margin:0 0 8px;font-size:13px;font-weight:600;color:#18181b">Questions</p>
                   <table width="100%" cellpadding="0" cellspacing="0">
                     ${stage.questions
                       .map(
                         (q, i) => `<tr>
                       <td style="padding:6px 0;border-bottom:1px solid #f4f4f5;font-size:13px;color:#3f3f46">
                         <strong>${i + 1}.</strong> ${escapeHtml(q.question)}
                         <br><span style="font-size:12px;color:#71717a"><em>Purpose:</em> ${escapeHtml(q.purpose)}</span>
                         ${q.focus_area ? `<br><span style="font-size:11px;color:#a1a1aa">Focus area: ${escapeHtml(q.focus_area)}</span>` : ""}
                         ${q.look_for && q.look_for.length > 0 ? `<br><span style="font-size:11px;color:#a1a1aa">Look for: ${q.look_for.map(escapeHtml).join(", ")}</span>` : ""}
                       </td>
                     </tr>`,
                       )
                       .join("")}
                   </table>`
                : ""
            }
          </td>
        </tr>
      </table>`,
    )
    .join("");

  return baseWrapper(`
    <h2 style="margin:0 0 16px;font-size:18px;color:#18181b">Interview Preparation Brief</h2>
    <p style="margin:0 0 24px;color:#3f3f46;font-size:14px;line-height:1.6">
      Hi ${escapeHtml(params.interviewerName)}, here's your preparation brief for
      <strong>"${escapeHtml(params.playbookTitle)}"</strong>.
    </p>
    ${stageCards}
    <table width="100%" cellpadding="0" cellspacing="0" style="margin-top:8px;border:1px solid #e4e4e7;border-radius:8px;overflow:hidden">
      <tr>
        <td style="background:#f0fdfa;padding:12px 16px;border-bottom:1px solid #e4e4e7">
          <strong style="font-size:14px;color:#042f2e">Rating Guide</strong>
        </td>
      </tr>
      <tr>
        <td style="padding:12px 16px;font-size:13px;color:#3f3f46;line-height:1.8">
          <strong>1</strong> — Does not meet expectations<br>
          <strong>2</strong> — Partially meets expectations<br>
          <strong>3</strong> — Meets expectations<br>
          <strong>4</strong> — Exceeds expectations
        </td>
      </tr>
    </table>
    <p style="margin:16px 0 0;color:#71717a;font-size:12px">
      Use this guide when providing ratings during and after the interview.
    </p>
  `);
}

export function reminderEmailHtml(params: {
  interviewerName: string;
  playbookTitle: string;
  message?: string;
}): string {
  const messageBox = params.message
    ? `<table width="100%" cellpadding="0" cellspacing="0" style="margin:16px 0">
        <tr>
          <td style="background:#fefce8;border:1px solid #fde68a;border-radius:6px;padding:12px 16px;font-size:13px;color:#92400e;line-height:1.6">
            ${escapeHtml(params.message)}
          </td>
        </tr>
      </table>`
    : "";

  return baseWrapper(`
    <h2 style="margin:0 0 16px;font-size:18px;color:#18181b">Feedback Reminder</h2>
    <p style="margin:0 0 8px;color:#3f3f46;font-size:14px;line-height:1.6">
      Hi ${escapeHtml(params.interviewerName)}, this is a friendly reminder to submit your interview feedback for
      <strong>"${escapeHtml(params.playbookTitle)}"</strong>.
    </p>
    ${messageBox}
    <p style="margin:0 0 0;color:#3f3f46;font-size:14px;line-height:1.6">
      Timely feedback helps the hiring team make better decisions. Please submit your ratings, pros, and cons at your earliest convenience.
    </p>
  `);
}

function escapeHtml(str: string): string {
  return str
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

/* ---------- Notification email templates ---------- */

export function feedbackSubmittedHtml(params: {
  interviewerName: string;
  stageName: string;
  candidateName: string;
  ratingSummary: string;
  debriefLink: string;
}): string {
  return baseWrapper(`
    <h2 style="margin:0 0 16px;font-size:18px;color:#18181b">Feedback Submitted</h2>
    <p style="margin:0 0 8px;color:#3f3f46;font-size:14px;line-height:1.6">
      <strong>${escapeHtml(params.interviewerName)}</strong> submitted feedback for the
      <strong>${escapeHtml(params.stageName)}</strong> stage with
      <strong>${escapeHtml(params.candidateName)}</strong>${params.ratingSummary ? ` &mdash; average rating: <strong>${escapeHtml(params.ratingSummary)}/4</strong>` : ""}.
    </p>
    <p style="margin:0 0 24px;color:#3f3f46;font-size:14px;line-height:1.6">
      You can review the feedback on the Debrief page.
    </p>
    ${
      params.debriefLink
        ? `<a href="${escapeHtml(params.debriefLink)}" style="display:inline-block;padding:12px 24px;background:#14b8a6;color:#ffffff;text-decoration:none;border-radius:6px;font-size:14px;font-weight:600">
      View Debrief
    </a>`
        : ""
    }
  `);
}

export function allFeedbackCollectedHtml(params: {
  candidateName: string;
  feedbackCount: string;
  synthesisLink: string;
}): string {
  return baseWrapper(`
    <h2 style="margin:0 0 16px;font-size:18px;color:#18181b">All Feedback Collected</h2>
    <p style="margin:0 0 8px;color:#3f3f46;font-size:14px;line-height:1.6">
      All <strong>${escapeHtml(params.feedbackCount)}</strong> feedback submissions have been collected
      for <strong>${escapeHtml(params.candidateName)}</strong>.
    </p>
    <p style="margin:0 0 24px;color:#3f3f46;font-size:14px;line-height:1.6">
      You can now trigger the AI synthesis to generate a comprehensive candidate analysis.
    </p>
    ${
      params.synthesisLink
        ? `<a href="${escapeHtml(params.synthesisLink)}" style="display:inline-block;padding:12px 24px;background:#14b8a6;color:#ffffff;text-decoration:none;border-radius:6px;font-size:14px;font-weight:600">
      Go to Synthesis
    </a>`
        : ""
    }
  `);
}

export function synthesisReadyHtml(params: {
  candidateName: string;
  debriefLink: string;
}): string {
  return baseWrapper(`
    <h2 style="margin:0 0 16px;font-size:18px;color:#18181b">AI Synthesis Ready</h2>
    <p style="margin:0 0 8px;color:#3f3f46;font-size:14px;line-height:1.6">
      The AI synthesis for <strong>${escapeHtml(params.candidateName)}</strong> is now ready for review.
    </p>
    <p style="margin:0 0 24px;color:#3f3f46;font-size:14px;line-height:1.6">
      The analysis includes a summary of all interview feedback and key highlights. As always, the final hiring decision rests with your team.
    </p>
    ${
      params.debriefLink
        ? `<a href="${escapeHtml(params.debriefLink)}" style="display:inline-block;padding:12px 24px;background:#14b8a6;color:#ffffff;text-decoration:none;border-radius:6px;font-size:14px;font-weight:600">
      View Synthesis
    </a>`
        : ""
    }
  `);
}

export function stageAssignedHtml(params: {
  collaboratorName: string;
  stageNames: string;
  prepLink: string;
}): string {
  return baseWrapper(`
    <h2 style="margin:0 0 16px;font-size:18px;color:#18181b">Interview Stages Assigned</h2>
    <p style="margin:0 0 8px;color:#3f3f46;font-size:14px;line-height:1.6">
      Hi ${escapeHtml(params.collaboratorName)}, you've been assigned to the following interview stages:
    </p>
    <p style="margin:0 0 24px;color:#3f3f46;font-size:14px;line-height:1.6;font-weight:600">
      ${escapeHtml(params.stageNames)}
    </p>
    <p style="margin:0 0 24px;color:#3f3f46;font-size:14px;line-height:1.6">
      Please review the preparation materials before the interview.
    </p>
    ${
      params.prepLink
        ? `<a href="${escapeHtml(params.prepLink)}" style="display:inline-block;padding:12px 24px;background:#14b8a6;color:#ffffff;text-decoration:none;border-radius:6px;font-size:14px;font-weight:600">
      View Prep Materials
    </a>`
        : ""
    }
  `);
}

export function feedbackRequestHtml(params: {
  collaboratorName: string;
  stageName: string;
  candidateName: string;
  feedbackLink: string;
}): string {
  return baseWrapper(`
    <h2 style="margin:0 0 16px;font-size:18px;color:#18181b">Feedback Ready to Submit</h2>
    <p style="margin:0 0 8px;color:#3f3f46;font-size:14px;line-height:1.6">
      Hi ${escapeHtml(params.collaboratorName)}, the interview for the
      <strong>${escapeHtml(params.stageName)}</strong> stage with
      <strong>${escapeHtml(params.candidateName)}</strong> has been completed and transcribed.
    </p>
    <p style="margin:0 0 24px;color:#3f3f46;font-size:14px;line-height:1.6">
      Please submit your feedback at your earliest convenience.
    </p>
    ${
      params.feedbackLink
        ? `<a href="${escapeHtml(params.feedbackLink)}" style="display:inline-block;padding:12px 24px;background:#14b8a6;color:#ffffff;text-decoration:none;border-radius:6px;font-size:14px;font-weight:600">
      Submit Feedback
    </a>`
        : ""
    }
  `);
}

export function feedbackReminderHtml(params: {
  collaboratorName: string;
  stageName: string;
  candidateName: string;
  feedbackLink: string;
}): string {
  return baseWrapper(`
    <h2 style="margin:0 0 16px;font-size:18px;color:#18181b">Feedback Reminder</h2>
    <p style="margin:0 0 8px;color:#3f3f46;font-size:14px;line-height:1.6">
      Hi ${escapeHtml(params.collaboratorName)}, this is a friendly reminder to submit your feedback
      for the <strong>${escapeHtml(params.stageName)}</strong> stage with
      <strong>${escapeHtml(params.candidateName)}</strong>.
    </p>
    <p style="margin:0 0 24px;color:#3f3f46;font-size:14px;line-height:1.6">
      Timely feedback helps the hiring team make better decisions. Please submit your ratings, pros, and cons at your earliest convenience.
    </p>
    ${
      params.feedbackLink
        ? `<a href="${escapeHtml(params.feedbackLink)}" style="display:inline-block;padding:12px 24px;background:#14b8a6;color:#ffffff;text-decoration:none;border-radius:6px;font-size:14px;font-weight:600">
      Submit Feedback
    </a>`
        : ""
    }
  `);
}
