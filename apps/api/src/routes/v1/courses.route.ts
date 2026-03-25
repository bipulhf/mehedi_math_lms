import { Hono } from "hono";
import {
  courseContentParamsSchema,
  courseProgressParamsSchema,
  courseIdParamsSchema,
  courseTeacherIdsSchema,
  courseReviewsQuerySchema,
  createCourseNoticeSchema,
  createCourseReviewSchema,
  createCourseSchema,
  createChapterSchema,
  listCoursesQuerySchema,
  reorderChaptersSchema,
  teacherDirectoryQuerySchema,
  updateCourseSchema
} from "@mma/shared";
import type { UserRole } from "@mma/shared";

import {
  contentController,
  courseController,
  noticeController,
  progressController,
  reviewController,
  testController
} from "@/lib/container";
import { requireAuth, requireRole } from "@/middleware/auth";
import type { AppBindings } from "@/types/app-bindings";

export const coursesRoutes = new Hono<AppBindings>();

coursesRoutes.get("/", (context) => {
  const query = listCoursesQuerySchema.parse(context.req.query());
  const authUser = context.get("authUser");
  const authSession = context.get("authSession");

  return courseController.listCourses(
    context,
    query,
    authUser?.id,
    authSession?.role as UserRole | undefined
  );
});

coursesRoutes.get("/support/teachers", requireRole("ADMIN", "TEACHER"), (context) => {
  const query = teacherDirectoryQuerySchema.parse(context.req.query());

  return courseController.listTeacherDirectory(context, query.search);
});

coursesRoutes.get("/:id/review-summary", (context) => {
  const params = courseIdParamsSchema.parse(context.req.param());

  return reviewController.summaryForCourse(context, params.id);
});

coursesRoutes.get("/:id/reviews", (context) => {
  const params = courseIdParamsSchema.parse(context.req.param());
  const query = courseReviewsQuerySchema.parse(context.req.query());

  return reviewController.listForCourse(context, params.id, query);
});

coursesRoutes.post("/:id/reviews", requireRole("STUDENT"), async (context) => {
  const params = courseIdParamsSchema.parse(context.req.param());
  const payload = createCourseReviewSchema.parse(await context.req.json());
  const authUser = context.get("authUser");
  const authSession = context.get("authSession");

  return reviewController.create(context, params.id, payload, authUser!.id, authSession!.role as UserRole);
});

coursesRoutes.get("/:id", (context) => {
  const params = courseIdParamsSchema.parse(context.req.param());
  const authUser = context.get("authUser");
  const authSession = context.get("authSession");

  return courseController.getCourseById(
    context,
    params.id,
    authUser?.id,
    authSession?.role as UserRole | undefined
  );
});

coursesRoutes.get("/:courseId/content", requireAuth(), (context) => {
  const params = courseContentParamsSchema.parse(context.req.param());
  const authUser = context.get("authUser");
  const authSession = context.get("authSession");

  return contentController.getCourseContent(
    context,
    params.courseId,
    authUser!.id,
    authSession!.role as UserRole
  );
});

coursesRoutes.get("/:courseId/progress", requireRole("STUDENT"), (context) => {
  const params = courseProgressParamsSchema.parse(context.req.param());
  const authUser = context.get("authUser");

  return progressController.getCourseProgress(context, params.courseId, authUser!.id);
});

coursesRoutes.get("/:courseId/tests", requireAuth(), (context) => {
  const params = courseContentParamsSchema.parse(context.req.param());
  const authUser = context.get("authUser");
  const authSession = context.get("authSession");

  return testController.listCourseAssessments(
    context,
    params.courseId,
    authUser!.id,
    authSession!.role as UserRole
  );
});

coursesRoutes.post("/", requireRole("ADMIN", "TEACHER"), async (context) => {
  const payload = createCourseSchema.parse(await context.req.json());
  const authUser = context.get("authUser");
  const authSession = context.get("authSession");

  return courseController.createCourse(
    context,
    payload,
    authUser!.id,
    authSession!.role as UserRole
  );
});

coursesRoutes.put("/:id", requireRole("ADMIN", "TEACHER"), async (context) => {
  const params = courseIdParamsSchema.parse(context.req.param());
  const payload = updateCourseSchema.parse(await context.req.json());
  const authUser = context.get("authUser");
  const authSession = context.get("authSession");

  return courseController.updateCourse(
    context,
    params.id,
    payload,
    authUser!.id,
    authSession!.role as UserRole
  );
});

coursesRoutes.delete("/:id", requireRole("ADMIN", "TEACHER"), (context) => {
  const params = courseIdParamsSchema.parse(context.req.param());
  const authUser = context.get("authUser");
  const authSession = context.get("authSession");

  return courseController.deleteCourse(
    context,
    params.id,
    authUser!.id,
    authSession!.role as UserRole
  );
});

coursesRoutes.post("/:id/submit", requireRole("ADMIN", "TEACHER"), (context) => {
  const params = courseIdParamsSchema.parse(context.req.param());
  const authUser = context.get("authUser");
  const authSession = context.get("authSession");

  return courseController.submitCourse(
    context,
    params.id,
    authUser!.id,
    authSession!.role as UserRole
  );
});

coursesRoutes.post("/:id/teachers", requireRole("ADMIN", "TEACHER"), async (context) => {
  const params = courseIdParamsSchema.parse(context.req.param());
  const payload = courseTeacherIdsSchema.parse(await context.req.json());
  const authUser = context.get("authUser");
  const authSession = context.get("authSession");

  return courseController.replaceTeachers(
    context,
    params.id,
    payload.teacherIds,
    authUser!.id,
    authSession!.role as UserRole
  );
});

coursesRoutes.post("/:courseId/chapters", requireRole("ADMIN", "TEACHER"), async (context) => {
  const params = courseContentParamsSchema.parse(context.req.param());
  const payload = createChapterSchema.parse(await context.req.json());
  const authUser = context.get("authUser");
  const authSession = context.get("authSession");

  return contentController.createChapter(
    context,
    params.courseId,
    payload,
    authUser!.id,
    authSession!.role as UserRole
  );
});

coursesRoutes.patch("/:courseId/chapters/reorder", requireRole("ADMIN", "TEACHER"), async (context) => {
  const params = courseContentParamsSchema.parse(context.req.param());
  const payload = reorderChaptersSchema.parse(await context.req.json());
  const authUser = context.get("authUser");
  const authSession = context.get("authSession");

  return contentController.reorderChapters(
    context,
    params.courseId,
    payload,
    authUser!.id,
    authSession!.role as UserRole
  );
});

coursesRoutes.get("/:courseId/notices", requireAuth(), (context) => {
  const params = courseContentParamsSchema.parse(context.req.param());
  const authUser = context.get("authUser");
  const authSession = context.get("authSession");

  return noticeController.listForCourse(
    context,
    params.courseId,
    authUser!.id,
    authSession!.role as UserRole
  );
});

coursesRoutes.post("/:courseId/notices", requireRole("ADMIN", "TEACHER"), async (context) => {
  const params = courseContentParamsSchema.parse(context.req.param());
  const payload = createCourseNoticeSchema.parse(await context.req.json());
  const authUser = context.get("authUser");
  const authSession = context.get("authSession");

  return noticeController.createForCourse(
    context,
    params.courseId,
    payload,
    authUser!.id,
    authSession!.role as UserRole
  );
});

