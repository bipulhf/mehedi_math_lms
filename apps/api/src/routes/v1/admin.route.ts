import { z } from "zod";
import { Hono } from "hono";

import { adminController } from "@/lib/container";
import { requireAdmin } from "@/middleware/auth";
import { createNotImplementedRoute } from "@/routes/create-not-implemented-route";
import type { AppBindings } from "@/types/app-bindings";

const createStaffAccountSchema = z.object({
  email: z.email(),
  name: z.string().trim().min(1),
  role: z.enum(["TEACHER", "ACCOUNTANT"])
});

export const adminRoutes = new Hono<AppBindings>();

adminRoutes.post("/staff-accounts", requireAdmin(), async (context) => {
  const payload = createStaffAccountSchema.parse(await context.req.json());

  return adminController.createStaffAccount(context, payload);
});

adminRoutes.route("/", createNotImplementedRoute("admin"));
