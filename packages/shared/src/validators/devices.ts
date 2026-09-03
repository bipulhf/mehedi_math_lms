import { z } from "zod";

import { deviceIdMaxLength, devicePlatforms } from "../constants/devices";
import { paginationQuerySchema } from "./admin";

export const deviceConflictStatusValues = ["OPEN", "REVIEWED", "DISMISSED"] as const;
export const deviceConflictStatusSchema = z.enum(deviceConflictStatusValues);

export const devicePlatformSchema = z.enum(devicePlatforms);

/** What a client is allowed to call itself. Anything else is dropped. */
export const deviceIdSchema = z
  .string()
  .trim()
  .min(8)
  .max(deviceIdMaxLength)
  .regex(/^[A-Za-z0-9:_-]+$/u);

export const deviceConflictsQuerySchema = paginationQuerySchema.extend({
  search: z.string().trim().min(1).optional(),
  status: deviceConflictStatusSchema.optional()
});

export const resolveDeviceConflictSchema = z.object({
  note: z.string().trim().max(500).optional(),
  // OPEN is allowed so a reviewer can put one back after opening it by
  // mistake -- the list is a queue, and a queue you cannot undo is a trap.
  status: deviceConflictStatusSchema
});

export const updateDevicePolicySchema = z.object({
  multiDeviceAllowed: z.boolean()
});

export type DeviceConflictStatus = z.infer<typeof deviceConflictStatusSchema>;
