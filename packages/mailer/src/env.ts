import { z } from "zod";

/**
 * SMTP configuration, validated once at import.
 *
 * Every field defaults to the repo's `"replace-me"` placeholder, the same
 * convention `apps/api/src/lib/env.ts` uses for optional integrations: a
 * deployment with no mail server still boots, and `isSmtpConfigured` is the one
 * place that decides whether mail can be sent. Importing this package must
 * never be what breaks a developer's machine.
 */
const mailerEnvSchema = z.object({
  SMTP_FROM: z.string().min(1).default("replace-me"),
  SMTP_HOST: z.string().min(1).default("replace-me"),
  SMTP_PASSWORD: z.string().min(1).default("replace-me"),
  SMTP_PORT: z.coerce.number().int().positive().max(65535).default(587),
  // Not `z.coerce.boolean()`: `Boolean("false")` is `true`, so the string
  // "false" would enable implicit TLS. `z.stringbool()` reads the word.
  SMTP_SECURE: z.stringbool().default(false),
  SMTP_USER: z.string().min(1).default("replace-me")
});

const parsed = mailerEnvSchema.parse(process.env);

const placeholder = "replace-me";

export const mailerEnv = {
  ...parsed,
  /**
   * Whether this deployment can send mail at all.
   *
   * `SMTP_USER` and `SMTP_PASSWORD` are deliberately not part of this test:
   * a relay on the same host often takes no credentials, and demanding them
   * would make that setup unreachable.
   */
  isSmtpConfigured: parsed.SMTP_HOST !== placeholder && parsed.SMTP_FROM !== placeholder
} as const;

export type MailerEnv = typeof mailerEnv;
