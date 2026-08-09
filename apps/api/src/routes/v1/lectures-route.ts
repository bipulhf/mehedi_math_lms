import { Hono } from "hono";
import {
  commentsQuerySchema,
  createCommentSchema,
  createMaterialSchema,
  lectureCommentsParamsSchema,
  lectureIdParamsSchema,
  materialIdParamsSchema,
  setLectureVideoChaptersSchema,
  updateLectureSchema,
  updateMaterialSchema
} from "@mma/shared";
import type { UserRole } from "@mma/shared";

import { auditLogService, commentController, contentController } from "@/lib/container";
import { requireRole } from "@/middleware/auth";
import type { AppBindings } from "@/types/app-bindings";
import { extractCreatedId } from "@/utils/audit";

export const lecturesRoutes = new Hono<AppBindings>();

// Public: a free lesson plays on the course page without an account.
lecturesRoutes.get("/:id/preview", (context) => {
  const params = lectureIdParamsSchema.parse(context.req.param());

  return contentController.getLecturePreview(context, params.id);
});

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
  const response = await commentController.createComment(
    context,
    params.lectureId,
    payload,
    authUser!.id,
    authSession!.role as UserRole
  );

  auditLogService.log({
    action: "comment.created",
    actorId: authUser!.id,
    entityId: await extractCreatedId(response),
    entityType: "comment",
    metadata: { lectureId: params.lectureId }
  });

  return response;
});

lecturesRoutes.put("/:id", requireRole("ADMIN", "TEACHER"), async (context) => {
  const params = lectureIdParamsSchema.parse(context.req.param());
  const payload = updateLectureSchema.parse(await context.req.json());
  const authUser = context.get("authUser");
  const authSession = context.get("authSession");
  const response = await contentController.updateLecture(
    context,
    params.id,
    payload,
    authUser!.id,
    authSession!.role as UserRole
  );

  auditLogService.log({
    action: "lecture.updated",
    actorId: authUser!.id,
    entityId: params.id,
    entityType: "lecture"
  });

  return response;
});

lecturesRoutes.put("/:id/chapters", requireRole("ADMIN", "TEACHER"), async (context) => {
  const params = lectureIdParamsSchema.parse(context.req.param());
  const payload = setLectureVideoChaptersSchema.parse(await context.req.json());
  const authUser = context.get("authUser");
  const authSession = context.get("authSession");
  const response = await contentController.setLectureVideoChapters(
    context,
    params.id,
    payload,
    authUser!.id,
    authSession!.role as UserRole
  );

  auditLogService.log({
    action: "lecture.chapters_updated",
    actorId: authUser!.id,
    entityId: params.id,
    entityType: "lecture",
    metadata: { chapterCount: payload.chapters.length }
  });

  return response;
});

lecturesRoutes.delete("/:id", requireRole("ADMIN", "TEACHER"), async (context) => {
  const params = lectureIdParamsSchema.parse(context.req.param());
  const authUser = context.get("authUser");
  const authSession = context.get("authSession");
  const response = await contentController.deleteLecture(
    context,
    params.id,
    authUser!.id,
    authSession!.role as UserRole
  );

  auditLogService.log({
    action: "lecture.deleted",
    actorId: authUser!.id,
    entityId: params.id,
    entityType: "lecture"
  });

  return response;
});

lecturesRoutes.post("/:id/materials", requireRole("ADMIN", "TEACHER"), async (context) => {
  const params = lectureIdParamsSchema.parse(context.req.param());
  const payload = createMaterialSchema.parse(await context.req.json());
  const authUser = context.get("authUser");
  const authSession = context.get("authSession");
  const response = await contentController.createLectureMaterial(
    context,
    params.id,
    payload,
    authUser!.id,
    authSession!.role as UserRole
  );

  auditLogService.log({
    action: "material.created",
    actorId: authUser!.id,
    entityId: await extractCreatedId(response),
    entityType: "material",
    metadata: { lectureId: params.id }
  });

  return response;
});

lecturesRoutes.put("/materials/:materialId", requireRole("ADMIN", "TEACHER"), async (context) => {
  const params = materialIdParamsSchema.parse(context.req.param());
  const payload = updateMaterialSchema.parse(await context.req.json());
  const authUser = context.get("authUser");
  const authSession = context.get("authSession");
  const response = await contentController.updateLectureMaterial(
    context,
    params.materialId,
    payload,
    authUser!.id,
    authSession!.role as UserRole
  );

  auditLogService.log({
    action: "material.updated",
    actorId: authUser!.id,
    entityId: params.materialId,
    entityType: "material"
  });

  return response;
});

lecturesRoutes.delete("/materials/:materialId", requireRole("ADMIN", "TEACHER"), async (context) => {
  const params = materialIdParamsSchema.parse(context.req.param());
  const authUser = context.get("authUser");
  const authSession = context.get("authSession");
  const response = await contentController.deleteLectureMaterial(
    context,
    params.materialId,
    authUser!.id,
    authSession!.role as UserRole
  );

  auditLogService.log({
    action: "material.deleted",
    actorId: authUser!.id,
    entityId: params.materialId,
    entityType: "material"
  });

  return response;
});
