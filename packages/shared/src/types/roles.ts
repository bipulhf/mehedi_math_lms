import { z } from "zod";

export const userRoleValues = [
  "STUDENT",
  "TEACHER",
  "ACCOUNTANT",
  "ADMIN"
] as const;

export const userRoleSchema = z.enum(userRoleValues);

export type UserRole = z.infer<typeof userRoleSchema>;
