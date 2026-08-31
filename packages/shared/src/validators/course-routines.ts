import { z } from "zod";

import { isEmptyRichText, richTextSchema } from "./common";

const attachmentUrlSchema = z.url().max(2048);

/**
 * Publishing a routine replaces whatever the course had, so this is one shape
 * for both the first save and every later edit — there is no create/update
 * pair the way there is for notices.
 *
 * Both halves are optional on their own and the refine forbids the empty case:
 * a routine that is neither written nor attached is a routine that does not
 * exist, and the caller should delete it rather than save a blank one.
 */
export const upsertCourseRoutineSchema = z
  .object({
    attachmentName: z.string().trim().max(255).nullish(),
    attachmentUrl: attachmentUrlSchema.nullish(),
    content: richTextSchema({ max: 20_000 }).nullish()
  })
  .refine(
    (value) =>
      (value.content != null && !isEmptyRichText(value.content)) ||
      (value.attachmentUrl != null && value.attachmentUrl.length > 0),
    { message: "Add a routine, attach a file, or both", path: ["content"] }
  );

export const courseRoutineParamsSchema = z.object({
  courseId: z.uuid()
});

export type UpsertCourseRoutineInput = z.infer<typeof upsertCourseRoutineSchema>;
