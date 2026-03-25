import { Hono } from "hono";
import {
  categoriesQuerySchema,
  categoryIdParamsSchema,
  createCategorySchema,
  reorderCategoriesSchema,
  updateCategorySchema
} from "@mma/shared";
import type { UserRole } from "@mma/shared";

import { categoryController } from "@/lib/container";
import { requireAdmin } from "@/middleware/auth";
import type { AppBindings } from "@/types/app-bindings";

export const categoriesRoutes = new Hono<AppBindings>();

categoriesRoutes.get("/", (context) => {
  const query = categoriesQuerySchema.parse(context.req.query());
  const authSession = context.get("authSession");

  return categoryController.listCategories(context, query, authSession?.role as UserRole | undefined);
});

categoriesRoutes.post("/", requireAdmin(), async (context) => {
  const payload = createCategorySchema.parse(await context.req.json());

  return categoryController.createCategory(context, payload);
});

categoriesRoutes.get("/:id", requireAdmin(), (context) => {
  const params = categoryIdParamsSchema.parse(context.req.param());

  return categoryController.getCategoryById(context, params.id);
});

categoriesRoutes.put("/:id", requireAdmin(), async (context) => {
  const params = categoryIdParamsSchema.parse(context.req.param());
  const payload = updateCategorySchema.parse(await context.req.json());

  return categoryController.updateCategory(context, params.id, payload);
});

categoriesRoutes.patch("/reorder", requireAdmin(), async (context) => {
  const payload = reorderCategoriesSchema.parse(await context.req.json());

  return categoryController.reorderCategories(context, payload);
});

categoriesRoutes.delete("/:id", requireAdmin(), (context) => {
  const params = categoryIdParamsSchema.parse(context.req.param());

  return categoryController.deleteCategory(context, params.id);
});
