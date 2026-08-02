import { Hono } from "hono";
import { confirmUploadSchema, createPresignedUploadSchema, idSchema } from "@mma/shared";

import { uploadController } from "@/lib/container";
import { requireAuth } from "@/middleware/auth";
import type { AppBindings } from "@/types/app-bindings";

export const uploadRoutes = new Hono<AppBindings>();

uploadRoutes.post("/presigned", requireAuth(), async (context) => {
  const payload = createPresignedUploadSchema.parse(await context.req.json());
  const authUser = context.get("authUser");

  return uploadController.createPresignedUpload(context, authUser!, payload);
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
