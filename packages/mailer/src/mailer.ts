import { createTransport, type Transporter } from "nodemailer";

import { mailerEnv } from "./env";

/**
 * The one way this product sends email.
 *
 * There is deliberately no queue behind it. The only mail that exists today is
 * the password reset, which the person is sitting and waiting for — parking it
 * in BullMQ would add a durability story nobody asked for to a message that is
 * worthless a minute late. If a second kind of mail ever arrives that a user is
 * not waiting on, that one gets a queue; this one does not need it.
 */

export class MailNotConfiguredError extends Error {
  public constructor() {
    super("SMTP is not configured. Set SMTP_HOST and SMTP_FROM.");
    this.name = "MailNotConfiguredError";
  }
}

export interface SendMailInput {
  html: string;
  subject: string;
  /** The plain-text half. Never optional — a mail with no text part scores as spam. */
  text: string;
  to: string;
}

let transporter: Transporter | null = null;

/**
 * Built on first use, not at import: a deployment with no SMTP should never
 * open a socket, and the web server imports this module through the auth
 * config on every boot.
 *
 * Pooled, because a burst of resets otherwise means a TLS handshake each.
 */
function getTransporter(): Transporter {
  if (!mailerEnv.isSmtpConfigured) {
    throw new MailNotConfiguredError();
  }

  transporter ??= createTransport({
    auth:
      mailerEnv.SMTP_USER === "replace-me"
        ? undefined
        : { pass: mailerEnv.SMTP_PASSWORD, user: mailerEnv.SMTP_USER },
    host: mailerEnv.SMTP_HOST,
    maxConnections: 3,
    pool: true,
    port: mailerEnv.SMTP_PORT,
    // Implicit TLS on 465; everything else negotiates STARTTLS, which
    // nodemailer does on its own when the server offers it.
    secure: mailerEnv.SMTP_SECURE
  });

  return transporter;
}

/**
 * Sends one message and **throws** when it cannot.
 *
 * Throwing is the deliberate choice. A swallowed failure here means a person
 * waiting for a link that was never sent, with nothing in the logs saying so —
 * the same silent-write bug ADR-0015 rejected for Redis. Callers decide what
 * the user sees; they do not get to not know.
 */
export async function sendMail(input: SendMailInput): Promise<void> {
  await getTransporter().sendMail({
    from: mailerEnv.SMTP_FROM,
    html: input.html,
    subject: input.subject,
    text: input.text,
    to: input.to
  });
}

/** Test seam: drops the pooled transport so the next send builds a new one. */
export function resetTransporter(): void {
  transporter = null;
}
