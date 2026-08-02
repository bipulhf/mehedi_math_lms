import { z } from "zod";

export const userRoleValues = [
  "STUDENT",
  "TEACHER",
  "ACCOUNTANT",
  "ADMIN"
] as const;

export const userRoleSchema = z.enum(userRoleValues);

export type UserRole = z.infer<typeof userRoleSchema>;

/**
 * Authority over a single course, distinct from the platform-wide UserRole.
 * An Owner controls the roster, the price, and the course's standing in the
 * catalog; a Teacher works on its content. ADR-0006.
 */
export const courseTeacherRoleValues = ["OWNER", "TEACHER"] as const;

export const courseTeacherRoleSchema = z.enum(courseTeacherRoleValues);

export type CourseTeacherRole = z.infer<typeof courseTeacherRoleSchema>;
