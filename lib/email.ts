import nodemailer from "nodemailer";

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
const APP_URL = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";

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
  const link = `${APP_URL}/invite/${token}`;
  await transporter.sendMail({
    from: FROM,
    to,
    subject: `You've been invited to ${orgName} on Queno`,
    html: `
      <div style="font-family:sans-serif;max-width:480px;margin:0 auto">
        <h2 style="color:#111">You're invited</h2>
        <p><strong>${invitedBy}</strong> has invited you to join <strong>${orgName}</strong> on Queno RASP.</p>
        <p>
          <a href="${link}" style="display:inline-block;padding:10px 20px;background:#2563eb;color:#fff;border-radius:6px;text-decoration:none;font-weight:600">
            Accept invitation
          </a>
        </p>
        <p style="color:#6b7280;font-size:13px">This link expires in 48 hours. If you didn't expect this, you can ignore this email.</p>
        <p style="color:#6b7280;font-size:12px">Or copy this URL: ${link}</p>
      </div>
    `,
    text: `${invitedBy} has invited you to join ${orgName} on Queno RASP.\n\nAccept your invitation: ${link}\n\nThis link expires in 48 hours.`,
  });
}

export async function sendPasswordResetEmail({
  to,
  token,
}: {
  to: string;
  token: string;
}) {
  const link = `${APP_URL}/reset-password?token=${token}`;
  await transporter.sendMail({
    from: FROM,
    to,
    subject: "Reset your Queno password",
    html: `
      <div style="font-family:sans-serif;max-width:480px;margin:0 auto">
        <h2 style="color:#111">Reset your password</h2>
        <p>We received a request to reset your Queno account password.</p>
        <p>
          <a href="${link}" style="display:inline-block;padding:10px 20px;background:#2563eb;color:#fff;border-radius:6px;text-decoration:none;font-weight:600">
            Reset password
          </a>
        </p>
        <p style="color:#6b7280;font-size:13px">This link expires in 1 hour. If you didn't request a password reset, you can ignore this email.</p>
        <p style="color:#6b7280;font-size:12px">Or copy this URL: ${link}</p>
      </div>
    `,
    text: `Reset your Queno password: ${link}\n\nThis link expires in 1 hour. If you didn't request this, ignore this email.`,
  });
}
