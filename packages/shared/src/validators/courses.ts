import { z } from "zod";

const idSchema = z.string().uuid();

export const courseStatusSchema = z.enum(["DRAFT", "PENDING", "PUBLISHED", "ARCHIVED"]);

export const courseIdParamsSchema = z.object({
  id: idSchema
});

const courseTitleSchema = z.string().trim().min(3).max(255);
const courseDescriptionSchema = z.string().trim().min(24).max(10000);
const coursePriceSchema = z.coerce.number().min(0).max(999999);
const optionalUrlSchema = z
  .union([z.string().url(), z.literal("")])
  .optional()
  .transform((value) => value || undefined);

export const createCourseSchema = z.object({
  categoryId: idSchema,
  coverImageUrl: optionalUrlSchema,
  description: courseDescriptionSchema,
  isExamOnly: z.boolean().default(false),
  price: coursePriceSchema,
  title: courseTitleSchema
});

export const updateCourseSchema = createCourseSchema.partial().refine(
  (value) => Object.keys(value).length > 0,
  "At least one field must be provided"
);

export const courseTeacherIdsSchema = z.object({
  teacherIds: z.array(idSchema).max(10)
});

export const rejectCourseSchema = z.object({
  feedback: z.string().trim().min(8).max(2000)
});

export const listCoursesQuerySchema = z.object({
  categoryId: idSchema.optional(),
  limit: z.coerce.number().int().positive().max(50).default(12),
  maxPrice: z.coerce.number().min(0).max(999999).optional(),
  minPrice: z.coerce.number().min(0).max(999999).optional(),
  mine: z.coerce.boolean().optional(),
  page: z.coerce.number().int().positive().default(1),
  search: z.string().trim().max(100).optional(),
  status: courseStatusSchema.optional()
});

export const teacherDirectoryQuerySchema = z.object({
  search: z.string().trim().max(100).optional()
});
