import { Hono } from "hono";
import { createBugReportSchema } from "@mma/shared";

import { bugReportController } from "@/lib/container";
import { requireRole } from "@/middleware/auth";
import type { AppBindings } from "@/types/app-bindings";

export const bugsRoutes = new Hono<AppBindings>();

bugsRoutes.post("/", requireRole("STUDENT", "TEACHER"), async (context) => {
  const payload = createBugReportSchema.parse(await context.req.json());
  const authUser = context.get("authUser");

  return bugReportController.createBugReport(context, authUser!.id, {
    description: payload.description,
    screenshotUrl: payload.screenshotUrl && payload.screenshotUrl.trim().length > 0 ? payload.screenshotUrl : null,
    title: payload.title
  });
});

bugsRoutes.get("/me", requireRole("STUDENT", "TEACHER"), (context) => {
  const authUser = context.get("authUser");

  return bugReportController.listMine(context, authUser!.id);
});
