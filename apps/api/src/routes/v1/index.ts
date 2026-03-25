import { Hono } from "hono";

import type { AppBindings } from "@/types/app-bindings";

import { adminRoutes } from "./admin.route";
import { analyticsRoutes } from "./analytics.route";
import { authRoutes } from "./auth.route";
import { bugsRoutes } from "./bugs.route";
import { categoriesRoutes } from "./categories.route";
import { chaptersRoutes } from "./chapters.route";
import { commentsRoutes } from "./comments.route";
import { coursesRoutes } from "./courses.route";
import { enrollmentsRoutes } from "./enrollments.route";
import { lecturesRoutes } from "./lectures.route";
import { messagesRoutes } from "./messages.route";
import { notificationsRoutes } from "./notifications.route";
import { paymentsRoutes } from "./payments.route";
import { progressRoutes } from "./progress.route";
import { profilesRoutes } from "./profiles.route";
import { questionsRoutes } from "./questions.route";
import { testsRoutes } from "./tests.route";
import { uploadRoutes } from "./upload.route";
import { usersRoutes } from "./users.route";

export const v1Routes = new Hono<AppBindings>();

v1Routes.route("/auth", authRoutes);
v1Routes.route("/bugs", bugsRoutes);
v1Routes.route("/users", usersRoutes);
v1Routes.route("/profiles", profilesRoutes);
v1Routes.route("/categories", categoriesRoutes);
v1Routes.route("/comments", commentsRoutes);
v1Routes.route("/courses", coursesRoutes);
v1Routes.route("/chapters", chaptersRoutes);
v1Routes.route("/enrollments", enrollmentsRoutes);
v1Routes.route("/lectures", lecturesRoutes);
v1Routes.route("/payments", paymentsRoutes);
v1Routes.route("/progress", progressRoutes);
v1Routes.route("/questions", questionsRoutes);
v1Routes.route("/tests", testsRoutes);
v1Routes.route("/messages", messagesRoutes);
v1Routes.route("/notifications", notificationsRoutes);
v1Routes.route("/admin", adminRoutes);
v1Routes.route("/analytics", analyticsRoutes);
v1Routes.route("/upload", uploadRoutes);
