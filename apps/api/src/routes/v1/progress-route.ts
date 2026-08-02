import { Hono } from "hono";
import { lectureProgressParamsSchema } from "@mma/shared";

import { progressController } from "@/lib/container";
import { requireRole } from "@/middleware/auth";
import type { AppBindings } from "@/types/app-bindings";

export const progressRoutes = new Hono<AppBindings>();

progressRoutes.post("/:lectureId/complete", requireRole("STUDENT"), (context) => {
  const params = lectureProgressParamsSchema.parse(context.req.param());
  const authUser = context.get("authUser");

  return progressController.markLectureComplete(context, params.lectureId, authUser!.id);
});
