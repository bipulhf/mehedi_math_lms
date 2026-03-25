import { z } from "zod";

import { userRoleSchema } from "../types/roles";

export const idSchema = z.string().uuid();
export const emailSchema = z.email();
export const nonEmptyStringSchema = z.string().trim().min(1);
export const paginationSchema = z.object({
  page: z.number().int().positive().default(1),
  limit: z.number().int().positive().max(100).default(10)
});

export * from "./admin";
export * from "./categories";
export * from "./profiles";
export { userRoleSchema };
