import { z } from "zod";

/**
 * OnecodeSoft credentials, validated once at import.
 *
 * The `"replace-me"` default is the repo's convention for an optional
 * integration (`packages/mailer/src/env.ts`, `apps/api/src/lib/env.ts`): a
 * deployment with no SMS account still boots, and `isSmsConfigured` is the one
 * place that decides whether a message can leave.
 *
 * It is a default rather than `.optional()` on purpose. `.env.example` ships
 * the literal string `"replace-me"`, and a presence test over an optional
 * field counts that as configured -- the API would report SMS ready and then
 * post `api_key: "replace-me"` to the provider. Now the placeholder reads as
 * off, which is what it means.
 */
const smsEnvSchema = z.object({
  ONECODESOFT_API_KEY: z.string().min(1).default("replace-me"),
  ONECODESOFT_SENDER_ID: z.string().min(1).default("replace-me")
});

const parsed = smsEnvSchema.parse(process.env);

const placeholder = "replace-me";

export const smsEnv = {
  ...parsed,
  /** Whether this deployment can send an SMS at all. */
  isSmsConfigured:
    parsed.ONECODESOFT_API_KEY !== placeholder && parsed.ONECODESOFT_SENDER_ID !== placeholder
} as const;

export type SmsEnv = typeof smsEnv;
