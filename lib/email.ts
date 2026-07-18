import nodemailer from "nodemailer";
import { getAppUrl } from "@/lib/env";

const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST ?? "smtp.gmail.com",
  port: Number(process.env.SMTP_PORT ?? 587),
  secure: false,
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS,
  },
});

const FROM = process.env.SMTP_FROM ?? process.env.SMTP_USER ?? "noreply@rasp.io";

/** Brand tokens aligned with app/globals.css — inlined for email clients. */
const brand = {
  blue: "#1d4ed8",
  blueHover: "#1e40af",
  blueLight: "#eff6ff",
  background: "#f8fafc",
  surface: "#ffffff",
  border: "#e2e8f0",
  text: "#0f172a",
  textSecondary: "#475569",
  textMuted: "#94a3b8",
} as const;

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

type EmailLayoutOptions = {
  preheader: string;
  title: string;
  bodyHtml: string;
  ctaLabel: string;
  ctaUrl: string;
  footnote: string;
};

/**
 * Shared Queno transactional email shell.
 * Table-based + inline styles for Outlook/Gmail; text wordmark (no logo asset required).
 */
function renderEmailLayout({
  preheader,
  title,
  bodyHtml,
  ctaLabel,
  ctaUrl,
  footnote,
}: EmailLayoutOptions): string {
  const year = new Date().getFullYear();
  const safeTitle = escapeHtml(title);
  const safeCta = escapeHtml(ctaLabel);
  const safeUrl = escapeHtml(ctaUrl);
  const safePreheader = escapeHtml(preheader);
  const safeFootnote = escapeHtml(footnote);

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <meta name="color-scheme" content="light" />
  <meta name="supported-color-schemes" content="light" />
  <title>${safeTitle}</title>
  <!--[if mso]>
  <style type="text/css">
    body, table, td { font-family: Arial, Helvetica, sans-serif !important; }
  </style>
  <![endif]-->
</head>
<body style="margin:0;padding:0;background-color:${brand.background};-webkit-text-size-adjust:100%;-ms-text-size-adjust:100%;">
  <div style="display:none;max-height:0;overflow:hidden;mso-hide:all;font-size:1px;line-height:1px;color:${brand.background};">
    ${safePreheader}
  </div>
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background-color:${brand.background};">
    <tr>
      <td align="center" style="padding:32px 16px;">
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="max-width:560px;width:100%;">
          <!-- Brand -->
          <tr>
            <td align="center" style="padding:0 0 20px 0;">
              <span style="font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Helvetica,Arial,sans-serif;font-size:20px;font-weight:700;letter-spacing:-0.02em;color:${brand.text};">Queno</span>
            </td>
          </tr>

          <!-- Card -->
          <tr>
            <td style="background-color:${brand.surface};border:1px solid ${brand.border};border-radius:12px;overflow:hidden;">
              <!-- Accent strip -->
              <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">
                <tr>
                  <td style="height:4px;background-color:${brand.blue};font-size:0;line-height:0;">&nbsp;</td>
                </tr>
              </table>

              <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">
                <tr>
                  <td style="padding:32px 32px 8px 32px;">
                    <h1 style="margin:0;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Helvetica,Arial,sans-serif;font-size:22px;font-weight:700;line-height:1.3;letter-spacing:-0.02em;color:${brand.text};">
                      ${safeTitle}
                    </h1>
                  </td>
                </tr>
                <tr>
                  <td style="padding:12px 32px 8px 32px;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Helvetica,Arial,sans-serif;font-size:15px;line-height:1.6;color:${brand.textSecondary};">
                    ${bodyHtml}
                  </td>
                </tr>
                <tr>
                  <td style="padding:24px 32px 8px 32px;" align="left">
                    <!--[if mso]>
                    <v:roundrect xmlns:v="urn:schemas-microsoft-com:vml" xmlns:w="urn:schemas-microsoft-com:office:word" href="${safeUrl}" style="height:44px;v-text-anchor:middle;width:200px;" arcsize="14%" stroke="f" fillcolor="${brand.blue}">
                      <w:anchorlock/>
                      <center style="color:#ffffff;font-family:Arial,sans-serif;font-size:14px;font-weight:700;">${safeCta}</center>
                    </v:roundrect>
                    <![endif]-->
                    <!--[if !mso]><!-->
                    <a href="${safeUrl}" style="display:inline-block;padding:12px 24px;background-color:${brand.blue};color:#ffffff;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Helvetica,Arial,sans-serif;font-size:14px;font-weight:600;line-height:1.2;text-decoration:none;border-radius:8px;">
                      ${safeCta}
                    </a>
                    <!--<![endif]-->
                  </td>
                </tr>
                <tr>
                  <td style="padding:20px 32px 32px 32px;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Helvetica,Arial,sans-serif;font-size:13px;line-height:1.55;color:${brand.textMuted};">
                    ${safeFootnote}
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- Fallback link -->
          <tr>
            <td style="padding:20px 8px 0 8px;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Helvetica,Arial,sans-serif;font-size:12px;line-height:1.5;color:${brand.textMuted};">
              If the button doesn&rsquo;t work, copy and paste this URL into your browser:<br />
              <a href="${safeUrl}" style="color:${brand.blue};word-break:break-all;text-decoration:none;">${safeUrl}</a>
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="padding:24px 8px 0 8px;">
              <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">
                <tr>
                  <td style="border-top:1px solid ${brand.border};padding-top:20px;">
                    <p style="margin:0 0 4px 0;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Helvetica,Arial,sans-serif;font-size:12px;font-weight:600;color:${brand.textSecondary};">
                      Queno
                    </p>
                    <p style="margin:0;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Helvetica,Arial,sans-serif;font-size:12px;line-height:1.5;color:${brand.textMuted};">
                      AI-Native Runtime Application Security<br />
                      &copy; ${year} Queno. Built in Canada.
                    </p>
                  </td>
                </tr>
              </table>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;
}

export async function sendInviteEmail({
  to,
  orgName,
  invitedBy,
  token,
}: {
  to: string;
  orgName: string;
  invitedBy: string;
  token: string;
}) {
  const link = `${getAppUrl()}/invite/${token}`;
  const safeOrg = escapeHtml(orgName);
  const safeInviter = escapeHtml(invitedBy);

  const html = renderEmailLayout({
    preheader: `${invitedBy} invited you to join ${orgName} on Queno.`,
    title: "You're invited",
    bodyHtml: `
      <p style="margin:0 0 12px 0;">
        <strong style="color:${brand.text};">${safeInviter}</strong>
        has invited you to join
        <strong style="color:${brand.text};">${safeOrg}</strong>
        on Queno.
      </p>
      <p style="margin:0;">
        Accept the invitation to access the organization dashboard and start securing your APIs.
      </p>
    `,
    ctaLabel: "Accept invitation",
    ctaUrl: link,
    footnote: "This link expires in 48 hours. If you didn't expect this invitation, you can safely ignore this email.",
  });

  await transporter.sendMail({
    from: FROM,
    to,
    subject: `You've been invited to ${orgName} on Queno`,
    html,
    text: `${invitedBy} has invited you to join ${orgName} on Queno.\n\nAccept your invitation: ${link}\n\nThis link expires in 48 hours. If you didn't expect this, you can ignore this email.`,
  });
}

export async function sendPasswordResetEmail({
  to,
  token,
}: {
  to: string;
  token: string;
}) {
  const link = `${getAppUrl()}/reset-password?token=${token}`;

  const html = renderEmailLayout({
    preheader: "Reset your Queno account password. This link expires in 1 hour.",
    title: "Reset your password",
    bodyHtml: `
      <p style="margin:0 0 12px 0;">
        We received a request to reset the password for your Queno account.
      </p>
      <p style="margin:0;">
        Click the button below to choose a new password. If you didn&rsquo;t request this, no action is needed.
      </p>
    `,
    ctaLabel: "Reset password",
    ctaUrl: link,
    footnote: "This link expires in 1 hour. If you didn't request a password reset, you can safely ignore this email.",
  });

  await transporter.sendMail({
    from: FROM,
    to,
    subject: "Reset your Queno password",
    html,
    text: `Reset your Queno password: ${link}\n\nThis link expires in 1 hour. If you didn't request this, ignore this email.`,
  });
}
