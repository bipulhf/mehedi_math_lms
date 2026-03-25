import { z } from "zod";

const idSchema = z.string().uuid();

export const courseProgressParamsSchema = z.object({
  courseId: idSchema
});

export const lectureProgressParamsSchema = z.object({
  lectureId: idSchema
});
