import { z } from "zod";

import { idSchema } from "./common";
import { userRoleSchema } from "../types/roles";

export const notificationTypeValues = [
  "SYSTEM",
  "COURSE",
  "NOTICE",
  "MESSAGE",
  "PAYMENT",
  "BUG_REPORT"
] as const;

export const notificationTypeSchema = z.enum(notificationTypeValues);

export type NotificationTypeValue = (typeof notificationTypeValues)[number];

export const deviceTypeSchema = z.enum(["WEB", "ANDROID", "IOS"]);

export const notificationsListQuerySchema = z.object({
  limit: z.coerce.number().int().positive().max(100).default(20),
  page: z.coerce.number().int().positive().default(1)
});

export const registerFcmDeviceSchema = z.object({
  deviceType: deviceTypeSchema,
  token: z.string().trim().min(1).max(4096)
});

export const notificationIdParamsSchema = z.object({
  id: idSchema
});

export const adminSendNotificationTargetSchema = z.discriminatedUnion("kind", [
  z.object({
    kind: z.literal("role"),
    role: userRoleSchema
  }),
  z.object({
    kind: z.literal("users"),
    userIds: z.array(idSchema).min(1).max(500)
  }),
  z.object({
    courseId: idSchema,
    kind: z.literal("course")
  })
]);

export const adminSendNotificationSchema = z.object({
  body: z.string().trim().min(1).max(4000),
  data: z.record(z.string(), z.union([z.string(), z.number(), z.boolean(), z.null()])).optional(),
  target: adminSendNotificationTargetSchema,
  title: z.string().trim().min(1).max(255),
  type: notificationTypeSchema
});

export type NotificationsListQuery = z.infer<typeof notificationsListQuerySchema>;
export type RegisterFcmDeviceInput = z.infer<typeof registerFcmDeviceSchema>;
export type AdminSendNotificationInput = z.infer<typeof adminSendNotificationSchema>;
