import { Hono } from "hono";
import { bannerIdParamsSchema, createBannerSchema, updateBannerSchema } from "@mma/shared";

import { auditLogService, bannerController } from "@/lib/container";
import { requireAdmin } from "@/middleware/auth";
import type { AppBindings } from "@/types/app-bindings";
import { extractCreatedId } from "@/utils/audit";

export const bannersRoutes = new Hono<AppBindings>();

bannersRoutes.get("/active", (context) => bannerController.getActiveBanner(context));

bannersRoutes.get("/", requireAdmin(), (context) => bannerController.listBanners(context));

bannersRoutes.post("/", requireAdmin(), async (context) => {
  const payload = createBannerSchema.parse(await context.req.json());
  const authUser = context.get("authUser");
  const response = await bannerController.createBanner(context, payload);

  auditLogService.log({
    action: "banner.created",
    actorId: authUser!.id,
    entityId: await extractCreatedId(response),
    entityType: "banner",
    metadata: { message: payload.message }
  });

  return response;
});

bannersRoutes.get("/:id", requireAdmin(), (context) => {
  const params = bannerIdParamsSchema.parse(context.req.param());

  return bannerController.getBannerById(context, params.id);
});

bannersRoutes.put("/:id", requireAdmin(), async (context) => {
  const params = bannerIdParamsSchema.parse(context.req.param());
  const payload = updateBannerSchema.parse(await context.req.json());
  const authUser = context.get("authUser");
  const response = await bannerController.updateBanner(context, params.id, payload);

  auditLogService.log({
    action: "banner.updated",
    actorId: authUser!.id,
    entityId: params.id,
    entityType: "banner",
    metadata: { fields: Object.keys(payload).join(",") }
  });

  return response;
});

bannersRoutes.delete("/:id", requireAdmin(), async (context) => {
  const params = bannerIdParamsSchema.parse(context.req.param());
  const authUser = context.get("authUser");
  const response = await bannerController.deleteBanner(context, params.id);

  auditLogService.log({
    action: "banner.deleted",
    actorId: authUser!.id,
    entityId: params.id,
    entityType: "banner"
  });

  return response;
});
