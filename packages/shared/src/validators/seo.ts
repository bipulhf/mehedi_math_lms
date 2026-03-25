import { z } from "zod";

export const slugParamsSchema = z.object({
  slug: z.string().trim().min(1).max(255)
});

export const ogImageParamsSchema = z.object({
  slug: z.string().trim().min(1).max(255),
  type: z.enum(["course", "teacher"])
});
