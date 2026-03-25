import { Hono } from "hono";
import {
  commentsQuerySchema,
  createCommentSchema,
  createMaterialSchema,
  lectureCommentsParamsSchema,
  lectureIdParamsSchema,
  materialIdParamsSchema,
  updateLectureSchema,
  updateMaterialSchema
} from "@mma/shared";
import type { UserRole } from "@mma/shared";

import { commentController, contentController } from "@/lib/container";
import { requireRole } from "@/middleware/auth";
import type { AppBindings } from "@/types/app-bindings";

export const lecturesRoutes = new Hono<AppBindings>();

lecturesRoutes.get("/:lectureId/comments", requireRole("STUDENT", "TEACHER", "ADMIN"), (context) => {
  const params = lectureCommentsParamsSchema.parse(context.req.param());
  const query = commentsQuerySchema.parse(context.req.query());
  const authUser = context.get("authUser");
  const authSession = context.get("authSession");

  return commentController.listLectureComments(
    context,
    params.lectureId,
    query,
    authUser!.id,
    authSession!.role as UserRole
  );
});

lecturesRoutes.post("/:lectureId/comments", requireRole("STUDENT", "TEACHER", "ADMIN"), async (context) => {
  const params = lectureCommentsParamsSchema.parse(context.req.param());
  const payload = createCommentSchema.parse(await context.req.json());
  const authUser = context.get("authUser");
  const authSession = context.get("authSession");

  return commentController.createComment(
    context,
    params.lectureId,
    payload,
    authUser!.id,
    authSession!.role as UserRole
  );
});

lecturesRoutes.put("/:id", requireRole("ADMIN", "TEACHER"), async (context) => {
  const params = lectureIdParamsSchema.parse(context.req.param());
  const payload = updateLectureSchema.parse(await context.req.json());
  const authUser = context.get("authUser");
  const authSession = context.get("authSession");

  return contentController.updateLecture(
    context,
    params.id,
    payload,
    authUser!.id,
    authSession!.role as UserRole
  );
});

lecturesRoutes.delete("/:id", requireRole("ADMIN", "TEACHER"), (context) => {
  const params = lectureIdParamsSchema.parse(context.req.param());
  const authUser = context.get("authUser");
  const authSession = context.get("authSession");

  return contentController.deleteLecture(
    context,
    params.id,
    authUser!.id,
    authSession!.role as UserRole
  );
});

lecturesRoutes.post("/:id/materials", requireRole("ADMIN", "TEACHER"), async (context) => {
  const params = lectureIdParamsSchema.parse(context.req.param());
  const payload = createMaterialSchema.parse(await context.req.json());
  const authUser = context.get("authUser");
  const authSession = context.get("authSession");

  return contentController.createLectureMaterial(
    context,
    params.id,
    payload,
    authUser!.id,
    authSession!.role as UserRole
  );
});

lecturesRoutes.put("/materials/:materialId", requireRole("ADMIN", "TEACHER"), async (context) => {
  const params = materialIdParamsSchema.parse(context.req.param());
  const payload = updateMaterialSchema.parse(await context.req.json());
  const authUser = context.get("authUser");
  const authSession = context.get("authSession");

  return contentController.updateLectureMaterial(
    context,
    params.materialId,
    payload,
    authUser!.id,
    authSession!.role as UserRole
  );
});

lecturesRoutes.delete("/materials/:materialId", requireRole("ADMIN", "TEACHER"), (context) => {
  const params = materialIdParamsSchema.parse(context.req.param());
  const authUser = context.get("authUser");
  const authSession = context.get("authSession");

  return contentController.deleteLectureMaterial(
    context,
    params.materialId,
    authUser!.id,
    authSession!.role as UserRole
  );
});
