import { z } from "zod";

export const idSchema = z.uuid();
export const emailSchema = z.email();
export const nonEmptyStringSchema = z.string().trim().min(1);
export const paginationSchema = z.object({
  page: z.number().int().positive().default(1),
  limit: z.number().int().positive().max(100).default(10)
});
