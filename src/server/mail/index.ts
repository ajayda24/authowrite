import "server-only";
import nodemailer, { type Transporter } from "nodemailer";
import { env } from "@/server/env";

export interface MailMessage {
  to: string;
  subject: string;
  text: string;
}

let transporter: Transporter | null = null;

/**
 * Sends an email via SMTP when SMTP_URL is configured; otherwise logs it,
 * which keeps local development and small self-hosted setups working.
 */
export async function sendMail(message: MailMessage): Promise<void> {
  if (!env.SMTP_URL) {
    console.info(
      `\n[mail] To: ${message.to}\n[mail] Subject: ${message.subject}\n${message.text}\n`,
    );
    return;
  }
  transporter ??= nodemailer.createTransport(env.SMTP_URL);
  await transporter.sendMail({ from: env.MAIL_FROM, ...message });
}
