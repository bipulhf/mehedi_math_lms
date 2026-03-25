import { z } from "zod";

const idSchema = z.string().uuid();

export const lectureCommentsParamsSchema = z.object({
  lectureId: idSchema
});

export const commentIdParamsSchema = z.object({
  id: idSchema
});

export const commentsQuerySchema = z.object({
  limit: z.coerce.number().int().positive().max(50).default(10),
  page: z.coerce.number().int().positive().default(1)
});

export const createCommentSchema = z.object({
  content: z.string().trim().min(1).max(2000),
  parentId: idSchema.optional()
});

export const updateCommentSchema = z.object({
  content: z.string().trim().min(1).max(2000)
});
