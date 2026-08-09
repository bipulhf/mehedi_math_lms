import { Hono } from "hono";
import { confirmUploadSchema, createPresignedUploadSchema, idSchema } from "@mma/shared";

import { auditLogService, uploadController } from "@/lib/container";
import { env } from "@/lib/env";
import { requireAuth } from "@/middleware/auth";
import type { AppBindings } from "@/types/app-bindings";
import { extractCreatedId } from "@/utils/audit";
import { success } from "@/utils/response";

export const uploadRoutes = new Hono<AppBindings>();

uploadRoutes.get("/provider", requireAuth(), (context) =>
  success(context, { provider: env.STORAGE_PROVIDER })
);

uploadRoutes.post("/presigned", requireAuth(), async (context) => {
  const payload = createPresignedUploadSchema.parse(await context.req.json());
  const authUser = context.get("authUser");
  const response = await uploadController.prepareUpload(context, authUser!, payload);

  auditLogService.log({
    action: "upload.prepared",
    actorId: authUser!.id,
    entityId: await extractCreatedId(response),
    entityType: "upload",
    metadata: { purpose: payload.purpose }
  });

  return response;
});

uploadRoutes.post("/confirm", requireAuth(), async (context) => {
  const payload = confirmUploadSchema.parse(await context.req.json());
  const authUser = context.get("authUser");
  const response = await uploadController.confirmUpload(context, authUser!, payload);

  auditLogService.log({
    action: "upload.confirmed",
    actorId: authUser!.id,
    entityId: payload.uploadId,
    entityType: "upload"
  });

  return response;
});

uploadRoutes.delete("/:id", requireAuth(), async (context) => {
  const params = context.req.param();
  const uploadId = idSchema.parse(params.id);
  const authUser = context.get("authUser");
  const response = await uploadController.deleteUpload(context, authUser!, uploadId);

  auditLogService.log({
    action: "upload.deleted",
    actorId: authUser!.id,
    entityId: uploadId,
    entityType: "upload"
  });

  return response;
});
