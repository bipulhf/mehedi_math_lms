import { z } from "zod";

import { idSchema } from "./index";
import { userRoleSchema } from "../types/roles";

export const adminSmsTargetSchema = z.discriminatedUnion("kind", [
  z.object({
    kind: z.literal("all_students")
  }),
  z.object({
    kind: z.literal("role"),
    role: userRoleSchema
  }),
  z.object({
    courseId: idSchema,
    kind: z.literal("course")
  })
]);

export const adminSendSmsSchema = z.object({
  message: z.string().trim().min(1).max(1000),
  target: adminSmsTargetSchema
});

export const adminSmsHistoryQuerySchema = z.object({
  limit: z.coerce.number().int().positive().max(100).default(20),
  page: z.coerce.number().int().positive().default(1)
});

export type AdminSendSmsInput = z.infer<typeof adminSendSmsSchema>;
export type AdminSmsHistoryQuery = z.infer<typeof adminSmsHistoryQuerySchema>;
