import { z } from "zod";

export const categoryIdParamsSchema = z.object({
  id: z.string().uuid()
});

export const categoriesQuerySchema = z.object({
  flat: z.coerce.boolean().default(false),
  includeInactive: z.coerce.boolean().default(false)
});

export const createCategorySchema = z.object({
  description: z.string().trim().max(4000).optional().or(z.literal("")),
  icon: z.string().trim().max(128).optional().or(z.literal("")),
  isActive: z.boolean().default(true),
  name: z.string().trim().min(1).max(255),
  parentId: z.string().uuid().optional().or(z.literal("")),
  sortOrder: z.number().int().min(0).default(0)
});

export const updateCategorySchema = z.object({
  description: z.string().trim().max(4000).optional().or(z.literal("")),
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
