import { z } from "zod";

export const idSchema = z.uuid();
export const emailSchema = z.email();
export const nonEmptyStringSchema = z.string().trim().min(1);
export const paginationSchema = z.object({
  page: z.number().int().positive().default(1),
  limit: z.number().int().positive().max(100).default(10)
});

/**
 * A boolean carried in a query string.
 *
 * **Never `z.coerce.boolean()` for this.** That is `Boolean(input)`, so the
 * string `"false"` — the exact thing a client sends to turn a flag off —
 * becomes `true`, and every value except `""` does too. `z.stringbool()` reads
 * the word. The union keeps a real boolean working for callers that build the
 * object in code rather than parsing a URL.
 *
 * The same trap is called out on `SSLCOMMERZ_SANDBOX_MODE` in
 * `apps/api/src/lib/env.ts`, where getting it wrong pointed the app at the
 * wrong payment gateway.
 */
export const booleanQueryParamSchema = z.union([z.boolean(), z.stringbool()]);
