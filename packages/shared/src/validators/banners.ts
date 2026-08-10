import { z } from "zod";

import { booleanQueryParamSchema } from "./common";

export const bannerIdParamsSchema = z.object({
  id: z.string().uuid()
});

export const bannersQuerySchema = z.object({
  includeInactive: booleanQueryParamSchema.default(false)
});

export const createBannerSchema = z.object({
  isActive: z.boolean().default(true),
  linkLabel: z.string().trim().max(100).optional().or(z.literal("")),
  linkUrl: z.string().trim().url().max(2048).optional().or(z.literal("")),
  message: z.string().trim().min(1).max(500)
});

export const updateBannerSchema = z.object({
  isActive: z.boolean().optional(),
  linkLabel: z.string().trim().max(100).optional().or(z.literal("")),
  linkUrl: z.string().trim().url().max(2048).optional().or(z.literal("")),
  message: z.string().trim().min(1).max(500).optional()
});
