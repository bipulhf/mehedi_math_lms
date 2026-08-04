import { Hono } from "hono";
import { confirmUploadSchema, createPresignedUploadSchema, idSchema } from "@genex/shared";

import { uploadController } from "@/lib/container";
import { env } from "@/lib/env";
import { requireAuth } from "@/middleware/auth";
import type { AppBindings } from "@/types/app-bindings";
import { success } from "@/utils/response";

export const uploadRoutes = new Hono<AppBindings>();

uploadRoutes.get("/provider", requireAuth(), (context) =>
  success(context, { provider: env.STORAGE_PROVIDER })
);

uploadRoutes.post("/presigned", requireAuth(), async (context) => {
  const payload = createPresignedUploadSchema.parse(await context.req.json());
  const authUser = context.get("authUser");

  return uploadController.prepareUpload(context, authUser!, payload);
});

uploadRoutes.post("/confirm", requireAuth(), async (context) => {
  const payload = confirmUploadSchema.parse(await context.req.json());
  const authUser = context.get("authUser");

  return uploadController.confirmUpload(context, authUser!, payload);
});

uploadRoutes.delete("/:id", requireAuth(), async (context) => {
  const params = context.req.param();
  const uploadId = idSchema.parse(params.id);
  const authUser = context.get("authUser");

  return uploadController.deleteUpload(context, authUser!, uploadId);
});
