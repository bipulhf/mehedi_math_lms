import { z } from "zod";

export const uploadPurposeValues = [
  "PROFILE_PHOTO",
  "BUG_SCREENSHOT",
  "COURSE_COVER",
  "COURSE_MATERIAL",
  "LECTURE_VIDEO",
  "QUESTION_IMAGE",
  "ANSWER_SCRIPT_PAGE"
] as const;

export const uploadKindValues = ["IMAGE", "VIDEO", "DOCUMENT"] as const;
export const uploadStatusValues = ["PENDING", "READY", "FAILED"] as const;
export const storageProviderValues = ["s3", "uploadthing"] as const;

export const uploadPurposeSchema = z.enum(uploadPurposeValues);
export const uploadKindSchema = z.enum(uploadKindValues);
export const uploadStatusSchema = z.enum(uploadStatusValues);
export const storageProviderSchema = z.enum(storageProviderValues);

export const createPresignedUploadSchema = z.object({
  contentType: z.string().trim().min(1).max(255),
  fileName: z.string().trim().min(1).max(255),
  fileSize: z.number().int().positive(),
  purpose: uploadPurposeSchema
});

export const confirmUploadSchema = z.object({
  durationInSeconds: z.number().int().positive().optional(),
  height: z.number().int().positive().optional(),
  uploadId: z.string().uuid(),
  width: z.number().int().positive().optional()
});

export type UploadPurpose = z.infer<typeof uploadPurposeSchema>;
export type UploadKind = z.infer<typeof uploadKindSchema>;
export type UploadStatus = z.infer<typeof uploadStatusSchema>;
export type StorageProvider = z.infer<typeof storageProviderSchema>;
