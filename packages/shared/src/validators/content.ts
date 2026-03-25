import { z } from "zod";

const idSchema = z.string().uuid();
const optionalTextSchema = z.string().trim().optional().or(z.literal(""));

export const lectureTypeSchema = z.enum(["VIDEO_UPLOAD", "VIDEO_LINK", "TEXT"]);

export const courseContentParamsSchema = z.object({
  courseId: idSchema
});

export const chapterIdParamsSchema = z.object({
  id: idSchema
});

export const lectureIdParamsSchema = z.object({
  id: idSchema
});

export const materialIdParamsSchema = z.object({
  materialId: idSchema
});

export const createChapterSchema = z.object({
  description: optionalTextSchema,
  title: z.string().trim().min(1).max(255)
});

export const updateChapterSchema = z
  .object({
    description: optionalTextSchema.optional(),
    title: z.string().trim().min(1).max(255).optional()
  })
  .refine((value) => Object.keys(value).length > 0, "At least one field must be provided");

export const reorderChaptersSchema = z.object({
  items: z.array(
    z.object({
      id: idSchema,
      sortOrder: z.number().int().min(0)
    })
  )
});

export const createLectureSchema = z
  .object({
    content: optionalTextSchema,
    description: optionalTextSchema,
    isPreview: z.boolean().default(false),
    title: z.string().trim().min(1).max(255),
    type: lectureTypeSchema,
    videoDuration: z.number().int().min(0).optional(),
    videoUrl: optionalTextSchema
  })
  .superRefine((value, context) => {
    const hasVideoUrl = typeof value.videoUrl === "string" && value.videoUrl.trim().length > 0;
    const hasContent = typeof value.content === "string" && value.content.trim().length > 0;

    if ((value.type === "VIDEO_LINK" || value.type === "VIDEO_UPLOAD") && !hasVideoUrl) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Video URL is required for video lectures",
        path: ["videoUrl"]
      });
    }

    if (value.type === "TEXT" && !hasContent) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Content is required for text lectures",
        path: ["content"]
      });
    }
  });

export const updateLectureSchema = z
  .object({
    content: optionalTextSchema.optional(),
    description: optionalTextSchema.optional(),
    isPreview: z.boolean().optional(),
    title: z.string().trim().min(1).max(255).optional(),
    type: lectureTypeSchema.optional(),
    videoDuration: z.number().int().min(0).optional(),
    videoUrl: optionalTextSchema.optional()
  })
  .refine((value) => Object.keys(value).length > 0, "At least one field must be provided");

export const reorderLecturesSchema = z.object({
  items: z.array(
    z.object({
      chapterId: idSchema,
      id: idSchema,
      sortOrder: z.number().int().min(0)
    })
  )
});

export const createMaterialSchema = z.object({
  fileSize: z.number().int().positive().max(50 * 1024 * 1024),
  fileType: z.string().trim().min(1).max(128),
  fileUrl: z.string().url(),
  title: z.string().trim().min(1).max(255)
});

export const updateMaterialSchema = z
  .object({
    fileSize: z.number().int().positive().max(50 * 1024 * 1024).optional(),
    fileType: z.string().trim().min(1).max(128).optional(),
    fileUrl: z.string().url().optional(),
    title: z.string().trim().min(1).max(255).optional()
  })
  .refine((value) => Object.keys(value).length > 0, "At least one field must be provided");
