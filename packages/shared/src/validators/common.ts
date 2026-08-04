import { z } from "zod";

export const idSchema = z.uuid();
export const emailSchema = z.email();
export const nonEmptyStringSchema = z.string().trim().min(1);
export const paginationSchema = z.object({
  page: z.number().int().positive().default(1),
  limit: z.number().int().positive().max(100).default(10)
});

export function stripHtmlTags(value: string): string {
  return value.replace(/<[^>]*>/g, "");
}

export function isEmptyRichText(value: string): boolean {
  return stripHtmlTags(value).trim().length === 0;
}

export function richTextLength(value: string): number {
  return stripHtmlTags(value).trim().length;
}

export function richTextSchema({ max, min = 0 }: { max: number; min?: number }) {
  return z.string().trim().refine(
    (value) => richTextLength(value) >= min,
    { message: `Must be at least ${min} characters` }
  ).refine(
    (value) => richTextLength(value) <= max,
    { message: `Must be at most ${max} characters` }
  );
}

export function optionalRichTextSchema(max: number) {
  return richTextSchema({ max, min: 0 }).optional().or(z.literal(""));
}

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
