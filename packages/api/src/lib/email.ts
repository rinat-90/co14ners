import nodemailer from "nodemailer";

const APP_URL = process.env.APP_URL ?? "http://localhost:3000";
const FROM = process.env.SMTP_FROM ?? "co14ners <noreply@co14ners.app>";

function createTransport() {
  if (!process.env.SMTP_HOST) return null;

  return nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port: Number(process.env.SMTP_PORT ?? 587),
    secure: process.env.SMTP_SECURE === "true",
    auth: {
      user: process.env.SMTP_USER,
      pass: process.env.SMTP_PASS,
    },
  });
}

// ── Shared HTML shell ─────────────────────────────────────────────────────────

function emailShell(content: string) {
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>co14ners</title>
</head>
<body style="margin:0;padding:0;background:#f1f5f9;font-family:system-ui,-apple-system,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#f1f5f9;padding:32px 16px;">
    <tr>
      <td align="center">
        <table width="560" cellpadding="0" cellspacing="0" style="max-width:560px;width:100%;">

          <!-- Header -->
          <tr>
            <td style="background:#1d4ed8;border-radius:12px 12px 0 0;padding:20px 32px;">
              <span style="color:white;font-size:20px;font-weight:800;letter-spacing:-0.5px;">⛰️ co14ners</span>
            </td>
          </tr>

          <!-- Body -->
          <tr>
            <td style="background:#ffffff;padding:32px;border-radius:0 0 12px 12px;">
              ${content}
              <hr style="border:none;border-top:1px solid #e2e8f0;margin:28px 0;" />
              <p style="color:#94a3b8;font-size:12px;margin:0;">
                You're receiving this because you have an account on
                <a href="${APP_URL}" style="color:#1d4ed8;text-decoration:none;">co14ners</a>.
                Manage your notification preferences in
                <a href="${APP_URL}/settings" style="color:#1d4ed8;text-decoration:none;">Settings</a>.
              </p>
            </td>
          </tr>

        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;
}

function btn(text: string, href: string) {
  return `<a href="${href}" style="display:inline-block;background:#1d4ed8;color:white;text-decoration:none;padding:12px 24px;border-radius:8px;font-weight:600;font-size:14px;margin-top:16px;">${text}</a>`;
}

// ── Send helper ───────────────────────────────────────────────────────────────

async function send(to: string, subject: string, text: string, html: string) {
  const transport = createTransport();
  if (!transport) {
    console.log(`[DEV EMAIL] To: ${to} | Subject: ${subject}\n${text}\n`);
    return;
  }
  await transport.sendMail({ from: FROM, to, subject, text, html });
}

// ── Public API ────────────────────────────────────────────────────────────────

export async function sendPasswordResetEmail(to: string, token: string): Promise<void> {
  const resetUrl = `${APP_URL}/reset-password?token=${token}`;
  const text = `Reset your password: ${resetUrl}\n\nThis link expires in 1 hour. If you didn't request this, ignore this email.`;
  const html = emailShell(`
    <h2 style="margin:0 0 8px;color:#0f172a;font-size:22px;">Reset your password</h2>
    <p style="color:#475569;margin:0 0 4px;">We received a request to reset the password for your co14ners account.</p>
    <p style="color:#475569;margin:0;">Click the button below. The link expires in <strong>1 hour</strong>.</p>
    ${btn("Reset password", resetUrl)}
    <p style="color:#94a3b8;font-size:13px;margin-top:20px;">If you didn't request a password reset, you can ignore this email — your password won't change.</p>
  `);
  await send(to, "Reset your co14ners password", text, html);
}

export async function sendFollowEmail(
  to: string,
  actorName: string,
  actorId: string,
): Promise<void> {
  const profileUrl = `${APP_URL}/users/${actorId}`;
  const text = `${actorName} started following you on co14ners.\n\nView their profile: ${profileUrl}`;
  const html = emailShell(`
    <h2 style="margin:0 0 16px;color:#0f172a;font-size:22px;">You have a new follower!</h2>
    <p style="color:#475569;margin:0;">
      <strong>${actorName}</strong> started following you on co14ners.
      Check out their summit log and trip reports.
    </p>
    ${btn("View profile", profileUrl)}
  `);
  await send(to, `${actorName} started following you`, text, html);
}

export async function sendCommentEmail(
  to: string,
  actorName: string,
  commentBody: string,
  mountainName: string,
  mountainSlug: string,
): Promise<void> {
  const mountainUrl = `${APP_URL}/mountains/${mountainSlug}`;
  const preview = commentBody.length > 120 ? commentBody.slice(0, 120) + "…" : commentBody;
  const text = `${actorName} commented on your trip report for ${mountainName}:\n\n"${preview}"\n\nView the report: ${mountainUrl}`;
  const html = emailShell(`
    <h2 style="margin:0 0 8px;color:#0f172a;font-size:22px;">New comment on your report</h2>
    <p style="color:#475569;margin:0 0 16px;">
      <strong>${actorName}</strong> commented on your trip report for <strong>${mountainName}</strong>:
    </p>
    <blockquote style="border-left:3px solid #1d4ed8;margin:0;padding:12px 16px;background:#f8fafc;border-radius:0 8px 8px 0;color:#334155;font-style:italic;">
      "${preview}"
    </blockquote>
    ${btn("Read & reply", mountainUrl)}
  `);
  await send(to, `${actorName} commented on your trip report`, text, html);
}

export async function sendReviewEmail(
  to: string,
  actorName: string,
  rating: number,
  mountainName: string,
  mountainSlug: string,
): Promise<void> {
  const mountainUrl = `${APP_URL}/mountains/${mountainSlug}`;
  const stars = "★".repeat(rating) + "☆".repeat(5 - rating);
  const text = `${actorName} reviewed ${mountainName} (${stars}) — a peak you've summited.\n\nRead the review: ${mountainUrl}`;
  const html = emailShell(`
    <h2 style="margin:0 0 8px;color:#0f172a;font-size:22px;">New review on a peak you summited</h2>
    <p style="color:#475569;margin:0 0 16px;">
      <strong>${actorName}</strong> left a <span style="color:#f59e0b;font-size:18px;vertical-align:middle;">${stars}</span> review for
      <strong>${mountainName}</strong> — a peak you've climbed!
    </p>
    ${btn("Read the review", mountainUrl)}
  `);
  await send(to, `New review for ${mountainName}`, text, html);
}
