import { Hono } from "hono";
import {
  chapterIdParamsSchema,
  createTestSchema,
  createLectureSchema,
  createMaterialSchema,
  materialIdParamsSchema,
  reorderCourseItemsSchema,
  reorderLecturesSchema,
  updateChapterSchema,
  updateMaterialSchema
} from "@genex/shared";
import type { UserRole } from "@genex/shared";

import { auditLogService, contentController } from "@/lib/container";
import { testController } from "@/lib/container";
import { requireRole } from "@/middleware/auth";
import type { AppBindings } from "@/types/app-bindings";
import { extractCreatedId } from "@/utils/audit";

export const chaptersRoutes = new Hono<AppBindings>();

chaptersRoutes.put("/:id", requireRole("ADMIN", "TEACHER"), async (context) => {
  const params = chapterIdParamsSchema.parse(context.req.param());
  const payload = updateChapterSchema.parse(await context.req.json());
  const authUser = context.get("authUser");
  const authSession = context.get("authSession");
  const response = await contentController.updateChapter(
    context,
    params.id,
    payload,
    authUser!.id,
    authSession!.role as UserRole
  );

  auditLogService.log({
    action: "chapter.updated",
    actorId: authUser!.id,
    entityId: params.id,
    entityType: "chapter"
  });

  return response;
});

chaptersRoutes.delete("/:id", requireRole("ADMIN", "TEACHER"), async (context) => {
  const params = chapterIdParamsSchema.parse(context.req.param());
  const authUser = context.get("authUser");
  const authSession = context.get("authSession");
  const response = await contentController.deleteChapter(
    context,
    params.id,
    authUser!.id,
    authSession!.role as UserRole
  );

  auditLogService.log({
    action: "chapter.deleted",
    actorId: authUser!.id,
    entityId: params.id,
    entityType: "chapter"
  });

  return response;
});

chaptersRoutes.post("/:id/lectures", requireRole("ADMIN", "TEACHER"), async (context) => {
  const params = chapterIdParamsSchema.parse(context.req.param());
  const payload = createLectureSchema.parse(await context.req.json());
  const authUser = context.get("authUser");
  const authSession = context.get("authSession");
  const response = await contentController.createLecture(
    context,
    params.id,
    payload,
    authUser!.id,
    authSession!.role as UserRole
  );

  auditLogService.log({
    action: "lecture.created",
    actorId: authUser!.id,
    entityId: await extractCreatedId(response),
    entityType: "lecture",
    metadata: { chapterId: params.id }
  });

  return response;
});

chaptersRoutes.post("/:id/tests", requireRole("ADMIN", "TEACHER"), async (context) => {
  const params = chapterIdParamsSchema.parse(context.req.param());
  const payload = createTestSchema.parse(await context.req.json());
  const authUser = context.get("authUser");
  const authSession = context.get("authSession");
  const response = await testController.createTest(
    context,
    params.id,
    payload,
    authUser!.id,
    authSession!.role as UserRole
  );

  auditLogService.log({
    action: "test.created",
    actorId: authUser!.id,
    entityId: await extractCreatedId(response),
    entityType: "test",
    metadata: { chapterId: params.id }
  });

  return response;
});

chaptersRoutes.patch("/:id/lectures/reorder", requireRole("ADMIN", "TEACHER"), async (context) => {
  const params = chapterIdParamsSchema.parse(context.req.param());
  const payload = reorderLecturesSchema.parse(await context.req.json());
  const authUser = context.get("authUser");
  const authSession = context.get("authSession");
  const response = await contentController.reorderLectures(
    context,
    params.id,
    payload,
    authUser!.id,
    authSession!.role as UserRole
  );

  auditLogService.log({
    action: "chapter.lectures_reordered",
    actorId: authUser!.id,
    entityId: params.id,
    entityType: "chapter"
  });

  return response;
});

chaptersRoutes.patch("/:id/items/reorder", requireRole("ADMIN", "TEACHER"), async (context) => {
  const params = chapterIdParamsSchema.parse(context.req.param());
  const payload = reorderCourseItemsSchema.parse(await context.req.json());
  const authUser = context.get("authUser");
  const authSession = context.get("authSession");
  const response = await testController.reorderCourseItems(
    context,
    params.id,
    payload,
    authUser!.id,
    authSession!.role as UserRole
  );

  auditLogService.log({
    action: "chapter.items_reordered",
    actorId: authUser!.id,
    entityId: params.id,
    entityType: "chapter"
  });

  return response;
});

chaptersRoutes.post("/:id/materials", requireRole("ADMIN", "TEACHER"), async (context) => {
  const params = chapterIdParamsSchema.parse(context.req.param());
  const payload = createMaterialSchema.parse(await context.req.json());
  const authUser = context.get("authUser");
  const authSession = context.get("authSession");
  const response = await contentController.createChapterMaterial(
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
    metadata: { chapterId: params.id }
  });

  return response;
});

chaptersRoutes.put("/materials/:materialId", requireRole("ADMIN", "TEACHER"), async (context) => {
  const params = materialIdParamsSchema.parse(context.req.param());
  const payload = updateMaterialSchema.parse(await context.req.json());
  const authUser = context.get("authUser");
  const authSession = context.get("authSession");
  const response = await contentController.updateChapterMaterial(
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

chaptersRoutes.delete("/materials/:materialId", requireRole("ADMIN", "TEACHER"), async (context) => {
  const params = materialIdParamsSchema.parse(context.req.param());
  const authUser = context.get("authUser");
  const authSession = context.get("authSession");
  const response = await contentController.deleteChapterMaterial(
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
