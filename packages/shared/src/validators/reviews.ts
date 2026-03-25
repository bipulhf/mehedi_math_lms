import { z } from "zod";

import { idSchema } from "./common";

export const createCourseReviewSchema = z.object({
  comment: z.string().trim().max(2000).optional(),
  rating: z.coerce.number().int().min(1).max(5)
});

export const courseReviewsQuerySchema = z.object({
  limit: z.coerce.number().int().positive().max(50).default(20),
  page: z.coerce.number().int().positive().default(1)
});

export type CreateCourseReviewInput = z.infer<typeof createCourseReviewSchema>;
export type CourseReviewsQuery = z.infer<typeof courseReviewsQuerySchema>;

export const enrollmentIdParamsSchema = z.object({
  id: idSchema
});
