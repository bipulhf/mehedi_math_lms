import { Hono } from "hono";
import {
  chapterIdParamsSchema,
  createTestSchema,
  createLectureSchema,
  createMaterialSchema,
  materialIdParamsSchema,
  reorderLecturesSchema,
  updateChapterSchema,
  updateMaterialSchema
} from "@mma/shared";
import type { UserRole } from "@mma/shared";

import { contentController } from "@/lib/container";
import { testController } from "@/lib/container";
import { requireRole } from "@/middleware/auth";
import type { AppBindings } from "@/types/app-bindings";

export const chaptersRoutes = new Hono<AppBindings>();

chaptersRoutes.put("/:id", requireRole("ADMIN", "TEACHER"), async (context) => {
  const params = chapterIdParamsSchema.parse(context.req.param());
  const payload = updateChapterSchema.parse(await context.req.json());
  const authUser = context.get("authUser");
  const authSession = context.get("authSession");

  return contentController.updateChapter(
    context,
    params.id,
    payload,
    authUser!.id,
    authSession!.role as UserRole
  );
});

chaptersRoutes.delete("/:id", requireRole("ADMIN", "TEACHER"), (context) => {
  const params = chapterIdParamsSchema.parse(context.req.param());
  const authUser = context.get("authUser");
  const authSession = context.get("authSession");

  return contentController.deleteChapter(
    context,
    params.id,
    authUser!.id,
    authSession!.role as UserRole
  );
});

chaptersRoutes.post("/:id/lectures", requireRole("ADMIN", "TEACHER"), async (context) => {
  const params = chapterIdParamsSchema.parse(context.req.param());
  const payload = createLectureSchema.parse(await context.req.json());
  const authUser = context.get("authUser");
  const authSession = context.get("authSession");

  return contentController.createLecture(
    context,
    params.id,
    payload,
    authUser!.id,
    authSession!.role as UserRole
  );
});

chaptersRoutes.post("/:id/tests", requireRole("ADMIN", "TEACHER"), async (context) => {
  const params = chapterIdParamsSchema.parse(context.req.param());
  const payload = createTestSchema.parse(await context.req.json());
  const authUser = context.get("authUser");
  const authSession = context.get("authSession");

  return testController.createTest(
    context,
    params.id,
    payload,
    authUser!.id,
    authSession!.role as UserRole
  );
});

chaptersRoutes.patch("/:id/lectures/reorder", requireRole("ADMIN", "TEACHER"), async (context) => {
  const params = chapterIdParamsSchema.parse(context.req.param());
  const payload = reorderLecturesSchema.parse(await context.req.json());
  const authUser = context.get("authUser");
  const authSession = context.get("authSession");

  return contentController.reorderLectures(
    context,
    params.id,
    payload,
    authUser!.id,
    authSession!.role as UserRole
  );
});

chaptersRoutes.post("/:id/materials", requireRole("ADMIN", "TEACHER"), async (context) => {
  const params = chapterIdParamsSchema.parse(context.req.param());
  const payload = createMaterialSchema.parse(await context.req.json());
  const authUser = context.get("authUser");
  const authSession = context.get("authSession");

  return contentController.createChapterMaterial(
    context,
    params.id,
    payload,
    authUser!.id,
    authSession!.role as UserRole
  );
});

chaptersRoutes.put("/materials/:materialId", requireRole("ADMIN", "TEACHER"), async (context) => {
  const params = materialIdParamsSchema.parse(context.req.param());
  const payload = updateMaterialSchema.parse(await context.req.json());
  const authUser = context.get("authUser");
  const authSession = context.get("authSession");

  return contentController.updateChapterMaterial(
    context,
    params.materialId,
    payload,
    authUser!.id,
    authSession!.role as UserRole
  );
});

chaptersRoutes.delete("/materials/:materialId", requireRole("ADMIN", "TEACHER"), (context) => {
  const params = materialIdParamsSchema.parse(context.req.param());
  const authUser = context.get("authUser");
  const authSession = context.get("authSession");

  return contentController.deleteChapterMaterial(
    context,
    params.materialId,
    authUser!.id,
    authSession!.role as UserRole
  );
});
