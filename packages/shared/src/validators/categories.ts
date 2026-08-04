import { z } from "zod";

import { booleanQueryParamSchema, optionalRichTextSchema } from "./common";

export const categoryIdParamsSchema = z.object({
  id: z.string().uuid()
});

export const categoriesQuerySchema = z.object({
  flat: booleanQueryParamSchema.default(false),
  includeInactive: booleanQueryParamSchema.default(false)
});

export const createCategorySchema = z.object({
  description: optionalRichTextSchema(4000),
  icon: z.string().trim().max(128).optional().or(z.literal("")),
  isActive: z.boolean().default(true),
  name: z.string().trim().min(1).max(255),
  parentId: z.string().uuid().optional().or(z.literal("")),
  sortOrder: z.number().int().min(0).default(0)
});

export const updateCategorySchema = z.object({
  description: optionalRichTextSchema(4000).optional(),
  icon: z.string().trim().max(128).optional().or(z.literal("")),
  isActive: z.boolean().optional(),
  name: z.string().trim().min(1).max(255).optional(),
  parentId: z.string().uuid().optional().or(z.literal("")),
  sortOrder: z.number().int().min(0).optional()
});

export const reorderCategoriesSchema = z.object({
  items: z.array(
    z.object({
      id: z.string().uuid(),
      parentId: z.string().uuid().optional().or(z.literal("")),
      sortOrder: z.number().int().min(0)
    })
  )
});
