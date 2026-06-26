import nodemailer from "nodemailer";

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

export async function sendPasswordResetEmail(to: string, token: string): Promise<void> {
  const appUrl = process.env.APP_URL ?? "http://localhost:3000";
  const resetUrl = `${appUrl}/reset-password?token=${token}`;
  const transport = createTransport();

  if (!transport) {
    // No SMTP configured — surface the link in the console for local dev
    console.log(`[DEV] Password reset for ${to}: ${resetUrl}`);
    return;
  }

  await transport.sendMail({
    from: process.env.SMTP_FROM ?? "noreply@co14ners.app",
    to,
    subject: "Reset your co14ners password",
    text: `Reset your password: ${resetUrl}\n\nThis link expires in 1 hour.`,
    html: `<p>Click below to reset your password:</p>
           <p><a href="${resetUrl}">${resetUrl}</a></p>
           <p>This link expires in 1 hour. If you did not request this, ignore this email.</p>`,
  });
}
