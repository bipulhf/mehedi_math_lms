import { z } from "zod";

import { booleanQueryParamSchema, richTextSchema } from "./common";

const idSchema = z.string().uuid();

export const courseStatusSchema = z.enum(["DRAFT", "PENDING", "PUBLISHED", "ARCHIVED"]);

export const courseIdParamsSchema = z.object({
  id: idSchema
});

const courseTitleSchema = z.string().trim().min(3).max(255);
const courseDescriptionSchema = richTextSchema({ min: 24, max: 10000 });
const coursePriceSchema = z.coerce.number().min(0).max(999999);
const optionalUrlSchema = z
  .union([z.string().url(), z.literal("")])
  .optional()
  .transform((value) => value || undefined);

const courseFieldsSchema = z.object({
  categoryId: idSchema,
  coverImageUrl: optionalUrlSchema,
  description: courseDescriptionSchema,
  isExamOnly: z.boolean(),
  price: coursePriceSchema,
  title: courseTitleSchema
});

export const createCourseSchema = courseFieldsSchema.extend({
  isExamOnly: z.boolean().default(false)
});

/**
 * Derived from the field shapes rather than from `createCourseSchema`, because
 * `.partial()` does not remove a `.default()`. Patching only the title would
 * otherwise arrive carrying `isExamOnly: false` and silently clear the flag —
 * and would satisfy the "at least one field" guard while changing nothing the
 * caller asked to change.
 */
export const updateCourseSchema = courseFieldsSchema
  .partial()
  .refine((value) => Object.keys(value).length > 0, "At least one field must be provided");

export const courseTeacherIdsSchema = z.object({
  teacherIds: z.array(idSchema).max(10)
});

export const rejectCourseSchema = z.object({
  feedback: richTextSchema({ max: 2000, min: 8 })
});

export const listCoursesQuerySchema = z.object({
  categoryId: idSchema.optional(),
  categorySlug: z.string().trim().min(1).max(255).optional(),
  /** ফ্রি ক্লাস — courses offering at least one preview lesson. */
  hasFreeLesson: booleanQueryParamSchema.optional(),
  limit: z.coerce.number().int().positive().max(50).default(12),
  maxPrice: z.coerce.number().min(0).max(999999).optional(),
  minPrice: z.coerce.number().min(0).max(999999).optional(),
  mine: booleanQueryParamSchema.optional(),
  /**
   * Narrows `mine` to the courses this teacher *owns* rather than every course
   * they work on. Authority over price is the Owner's alone (ADR-0006), so a
   * picker that offers pricing decisions has to offer exactly these.
   */
  ownedOnly: booleanQueryParamSchema.optional(),
  page: z.coerce.number().int().positive().default(1),
  search: z.string().trim().max(100).optional(),
  status: courseStatusSchema.optional()
});

export const teacherDirectoryQuerySchema = z.object({
  search: z.string().trim().max(100).optional()
});
