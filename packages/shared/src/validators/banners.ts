import { z } from "zod";

import { booleanQueryParamSchema, richTextSchema } from "./common";

export const bannerPresetValues = ["INK", "ORANGE", "CYAN", "YELLOW", "SPECTRUM"] as const;

export const bannerPresetSchema = z.enum(bannerPresetValues);

export type BannerPreset = z.infer<typeof bannerPresetSchema>;

export const bannerIdParamsSchema = z.object({
  id: z.string().uuid()
});

export const bannersQuerySchema = z.object({
  includeInactive: booleanQueryParamSchema.default(false)
});

export const createBannerSchema = z.object({
  backgroundPreset: bannerPresetSchema.default("INK"),
  isActive: z.boolean().default(true),
  linkLabel: z.string().trim().max(100).optional().or(z.literal("")),
  linkUrl: z.string().trim().url().max(2048).optional().or(z.literal("")),
  message: richTextSchema({ max: 500, min: 1 })
});

export const updateBannerSchema = z.object({
  backgroundPreset: bannerPresetSchema.optional(),
  isActive: z.boolean().optional(),
  linkLabel: z.string().trim().max(100).optional().or(z.literal("")),
  linkUrl: z.string().trim().url().max(2048).optional().or(z.literal("")),
  message: richTextSchema({ max: 500, min: 1 }).optional()
});
