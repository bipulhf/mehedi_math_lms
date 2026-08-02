import { Hono } from "hono";
import type { UserRole } from "@mma/shared";
import {
  basicProfileInputSchema,
  profileIdParamsSchema,
  slugParamsSchema,
  studentProfileInputSchema,
  teacherProfileInputSchema
} from "@mma/shared";

import { profileController } from "@/lib/container";
import { requireAuth } from "@/middleware/auth";
import type { AppBindings } from "@/types/app-bindings";

export const profilesRoutes = new Hono<AppBindings>();

profilesRoutes.get("/me", requireAuth(), (context) => {
  const authUser = context.get("authUser");

  return profileController.getOwnProfile(context, authUser!.id);
});

profilesRoutes.put("/me", requireAuth(), async (context) => {
  const authUser = context.get("authUser");
  const authSession = context.get("authSession");
  const rawPayload = await context.req.json();
  const role = authSession!.role as UserRole;

  if (role === "STUDENT") {
    const payload = studentProfileInputSchema.parse(rawPayload);
    return profileController.updateStudentProfile(context, authUser!.id, payload);
  }

  if (role === "TEACHER") {
    const payload = teacherProfileInputSchema.parse(rawPayload);
    return profileController.updateTeacherProfile(context, authUser!.id, payload);
  }

  const payload = basicProfileInputSchema.parse(rawPayload);
  return profileController.updateBasicProfile(context, authUser!.id, payload);
});

profilesRoutes.get("/teachers/by-slug/:slug", (context) => {
  const params = slugParamsSchema.parse(context.req.param());

  return profileController.getPublicTeacherProfileBySlug(context, params.slug);
});

profilesRoutes.get("/teachers/:id", async (context) => {
  const params = profileIdParamsSchema.parse(context.req.param());

  return profileController.getPublicTeacherProfile(context, params.id);
});
