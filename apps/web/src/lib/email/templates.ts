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

export function collaboratorInviteHtml(params: {
  inviterName: string;
  playbookTitle: string;
  magicLink: string;
}): string {
  return baseWrapper(`
    <h2 style="margin:0 0 16px;font-size:18px;color:#18181b">You've been invited to collaborate</h2>
    <p style="margin:0 0 8px;color:#3f3f46;font-size:14px;line-height:1.6">
      <strong>${escapeHtml(params.inviterName)}</strong> has invited you to collaborate on
      the hiring playbook <strong>"${escapeHtml(params.playbookTitle)}"</strong>.
    </p>
    <p style="margin:0 0 24px;color:#3f3f46;font-size:14px;line-height:1.6">
      Click the button below to accept the invitation and access the playbook.
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

function escapeHtml(str: string): string {
  return str
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}
