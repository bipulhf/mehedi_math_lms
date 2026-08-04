import { Hono } from "hono";
import {
  categoriesQuerySchema,
  categoryIdParamsSchema,
  createCategorySchema,
  reorderCategoriesSchema,
  slugParamsSchema,
  updateCategorySchema
} from "@genex/shared";
import type { UserRole } from "@genex/shared";

import { auditLogService, categoryController } from "@/lib/container";
import { requireAdmin } from "@/middleware/auth";
import type { AppBindings } from "@/types/app-bindings";
import { extractCreatedId } from "@/utils/audit";

export const categoriesRoutes = new Hono<AppBindings>();

categoriesRoutes.get("/", (context) => {
  const query = categoriesQuerySchema.parse(context.req.query());
  const authSession = context.get("authSession");

  return categoryController.listCategories(context, query, authSession?.role as UserRole | undefined);
});

categoriesRoutes.get("/by-slug/:slug", (context) => {
  const params = slugParamsSchema.parse(context.req.param());

  return categoryController.getPublicCategoryBySlug(context, params.slug);
});

categoriesRoutes.post("/", requireAdmin(), async (context) => {
  const payload = createCategorySchema.parse(await context.req.json());
  const authUser = context.get("authUser");
  const response = await categoryController.createCategory(context, payload);

  auditLogService.log({
    action: "category.created",
    actorId: authUser!.id,
    entityId: await extractCreatedId(response),
    entityType: "category",
    metadata: { name: payload.name }
  });

  return response;
});

categoriesRoutes.get("/:id", requireAdmin(), (context) => {
  const params = categoryIdParamsSchema.parse(context.req.param());

  return categoryController.getCategoryById(context, params.id);
});

categoriesRoutes.put("/:id", requireAdmin(), async (context) => {
  const params = categoryIdParamsSchema.parse(context.req.param());
  const payload = updateCategorySchema.parse(await context.req.json());
  const authUser = context.get("authUser");
  const response = await categoryController.updateCategory(context, params.id, payload);

  auditLogService.log({
    action: "category.updated",
    actorId: authUser!.id,
    entityId: params.id,
    entityType: "category",
    metadata: { fields: Object.keys(payload).join(",") }
  });

  return response;
});

categoriesRoutes.patch("/reorder", requireAdmin(), async (context) => {
  const payload = reorderCategoriesSchema.parse(await context.req.json());
  const authUser = context.get("authUser");
  const response = await categoryController.reorderCategories(context, payload);

  auditLogService.log({
    action: "category.reordered",
    actorId: authUser!.id,
    entityId: "batch",
    entityType: "category",
    metadata: { categoryCount: payload.items.length }
  });

  return response;
});

categoriesRoutes.delete("/:id", requireAdmin(), async (context) => {
  const params = categoryIdParamsSchema.parse(context.req.param());
  const authUser = context.get("authUser");
  const response = await categoryController.deleteCategory(context, params.id);

  auditLogService.log({
    action: "category.deleted",
    actorId: authUser!.id,
    entityId: params.id,
    entityType: "category"
  });

  return response;
});
