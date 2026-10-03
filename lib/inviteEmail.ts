import { ROLE_DEFINITIONS, UserRole } from "@/types/tenant";

interface InviteEmailInput {
  to: string;
  orgName: string;
  inviterName: string;
  inviterEmail: string;
  role: UserRole;
  inviteUrl: string;
  expiresAt: string;
}

const escapeHtml = (value: string) =>
  value.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");

function buildHtml(input: InviteEmailInput): string {
  const role = ROLE_DEFINITIONS[input.role] ?? ROLE_DEFINITIONS.editor;
  const org = escapeHtml(input.orgName);
  const inviter = escapeHtml(input.inviterName);
  const url = escapeHtml(input.inviteUrl);
  const expires = new Date(input.expiresAt).toUTCString().slice(0, 16);

  return `<!doctype html>
<html><body style="margin:0;padding:32px 16px;background:#f4f4f8;font-family:-apple-system,Segoe UI,Roboto,sans-serif;color:#18181b;">
  <table role="presentation" width="100%" style="max-width:520px;margin:0 auto;background:#ffffff;border-radius:14px;border:1px solid #e4e4e7;">
    <tr><td style="padding:32px;">
      <p style="margin:0 0 20px;font-size:13px;font-weight:700;letter-spacing:.04em;color:#6d28d9;">TOKENS PLATFORM</p>
      <h1 style="margin:0 0 12px;font-size:22px;line-height:1.3;">${inviter} invited you to join ${org}</h1>
      <p style="margin:0 0 20px;font-size:14px;line-height:1.6;color:#52525b;">
        You'll join as <strong style="color:#18181b;">${escapeHtml(role.title)}</strong>. ${escapeHtml(role.description)}
      </p>
      <a href="${url}" style="display:inline-block;padding:12px 22px;background:#6d28d9;color:#ffffff;text-decoration:none;font-size:14px;font-weight:600;border-radius:10px;">Accept invitation</a>
      <p style="margin:24px 0 0;font-size:12px;line-height:1.6;color:#71717a;">
        This invitation is for ${escapeHtml(input.to)} and expires on ${expires}.<br>
        Button not working? Paste this link into your browser:<br>
        <span style="word-break:break-all;color:#52525b;">${url}</span>
      </p>
    </td></tr>
  </table>
</body></html>`;
}

/**
 * Sends the invitation email through Resend's REST API.
 * Returns false when email delivery is not configured or the provider rejects the request.
 */
export async function sendInviteEmail(input: InviteEmailInput): Promise<boolean> {
  const apiKey = process.env.RESEND_API_KEY;
  const from = process.env.INVITE_FROM_EMAIL;
  if (!apiKey || !from) return false;

  const res = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      from,
      to: [input.to],
      reply_to: input.inviterEmail,
      subject: `${input.inviterName} invited you to join "${input.orgName}" on Tokens Platform`,
      html: buildHtml(input),
    }),
  });

  return res.ok;
}
