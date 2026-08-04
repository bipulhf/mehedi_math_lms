import { z } from "zod";

import { idSchema, richTextSchema } from "./common";

export const createCourseNoticeSchema = z.object({
  content: richTextSchema({ min: 1, max: 8000 }),
  isPinned: z.boolean().default(false),
  title: z.string().trim().min(1).max(255)
});

export const updateCourseNoticeSchema = z.object({
  content: richTextSchema({ min: 1, max: 8000 }).optional(),
  isPinned: z.boolean().optional(),
  title: z.string().trim().min(1).max(255).optional()
});

export const noticeIdParamsSchema = z.object({
  id: idSchema
});

export type CreateCourseNoticeInput = z.infer<typeof createCourseNoticeSchema>;
export type UpdateCourseNoticeInput = z.infer<typeof updateCourseNoticeSchema>;
