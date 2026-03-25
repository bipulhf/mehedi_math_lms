import { Hono } from "hono";
import { z } from "zod";

import { uploadController } from "@/lib/container";
import { requireAuth } from "@/middleware/auth";
import type { AppBindings } from "@/types/app-bindings";

const createProfilePhotoUploadSchema = z.object({
  contentType: z.string().trim().min(1),
  fileName: z.string().trim().min(1).max(255)
});

export const uploadRoutes = new Hono<AppBindings>();

uploadRoutes.post("/profile-photo/presign", requireAuth(), async (context) => {
  const payload = createProfilePhotoUploadSchema.parse(await context.req.json());

  return uploadController.createProfilePhotoUpload(context, payload);
});

uploadRoutes.post("/bug-screenshot/presign", requireAuth(), async (context) => {
  const payload = createProfilePhotoUploadSchema.parse(await context.req.json());

  return uploadController.createBugScreenshotUpload(context, payload);
});

uploadRoutes.post("/course-cover/presign", requireAuth(), async (context) => {
  const payload = createProfilePhotoUploadSchema.parse(await context.req.json());

  return uploadController.createCourseCoverUpload(context, payload);
});

uploadRoutes.post("/course-material/presign", requireAuth(), async (context) => {
  const payload = createProfilePhotoUploadSchema.parse(await context.req.json());

  return uploadController.createCourseMaterialUpload(context, payload);
});

uploadRoutes.post("/lecture-video/presign", requireAuth(), async (context) => {
  const payload = createProfilePhotoUploadSchema.parse(await context.req.json());

  return uploadController.createLectureVideoUpload(context, payload);
});
