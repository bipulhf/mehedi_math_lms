import { Hono } from "hono";
import type { UserRole } from "@genex/shared";
import {
  basicProfileInputSchema,
  profileIdParamsSchema,
  slugParamsSchema,
  studentProfileInputSchema,
  teacherProfileInputSchema
} from "@genex/shared";

import { auditLogService, profileController } from "@/lib/container";
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
    const response = await profileController.updateStudentProfile(context, authUser!.id, payload);

    auditLogService.log({
      action: "profile.updated",
      actorId: authUser!.id,
      entityId: authUser!.id,
      entityType: "profile"
    });

    return response;
  }

  if (role === "TEACHER") {
    const payload = teacherProfileInputSchema.parse(rawPayload);
    const response = await profileController.updateTeacherProfile(context, authUser!.id, payload);

    auditLogService.log({
      action: "profile.updated",
      actorId: authUser!.id,
      entityId: authUser!.id,
      entityType: "profile"
    });

    return response;
  }

  const payload = basicProfileInputSchema.parse(rawPayload);
  const response = await profileController.updateBasicProfile(context, authUser!.id, payload);

  auditLogService.log({
    action: "profile.updated",
    actorId: authUser!.id,
    entityId: authUser!.id,
    entityType: "profile"
  });

  return response;
});

// Registered before "/teachers/:id", which would otherwise match "teachers"
// as an id and fail its uuid parse.
profilesRoutes.get("/teachers", (context) => profileController.listPublicTeachers(context));

profilesRoutes.get("/teachers/by-slug/:slug", (context) => {
  const params = slugParamsSchema.parse(context.req.param());

  return profileController.getPublicTeacherProfileBySlug(context, params.slug);
});

profilesRoutes.get("/teachers/:id", async (context) => {
  const params = profileIdParamsSchema.parse(context.req.param());

  return profileController.getPublicTeacherProfile(context, params.id);
});
