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
export * from "./comments";
export * from "./content";
export * from "./courses";
export * from "./messages";
export * from "./noticeboard";
export * from "./notifications";
export * from "./progress";
export * from "./reviews";
export * from "./profiles";
export * from "./payments";
export * from "./sms";
export * from "./tests";
export * from "./uploads";
export { userRoleSchema };
