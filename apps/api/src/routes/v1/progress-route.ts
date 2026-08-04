import { Hono } from "hono";
import { lectureProgressParamsSchema } from "@genex/shared";

import { auditLogService, progressController } from "@/lib/container";
import { requireRole } from "@/middleware/auth";
import type { AppBindings } from "@/types/app-bindings";

export const progressRoutes = new Hono<AppBindings>();

progressRoutes.post("/:lectureId/complete", requireRole("STUDENT"), async (context) => {
  const params = lectureProgressParamsSchema.parse(context.req.param());
  const authUser = context.get("authUser");

  const response = await progressController.markLectureComplete(
    context,
    params.lectureId,
    authUser!.id
  );

  auditLogService.log({
    action: "progress.lecture_completed",
    actorId: authUser!.id,
    entityId: params.lectureId,
    entityType: "progress"
  });

  return response;
});
