import { auth } from "@genex/auth/server";
import {
  scriptPageContentType,
  type StorageProvider,
  type UploadKind,
  type UploadPurpose
} from "@genex/shared";
import { createUploadthing, type FileRouter, UploadThingError } from "uploadthing/server";

import { AuthGuardService } from "@/services/auth-guard-service";
import { AuthSessionRepository } from "@/repositories/auth-session-repository";
import { UploadRepository, type UploadRecord } from "@/repositories/upload-repository";
import { queues } from "@/lib/queues";

const f = createUploadthing();
const authGuardService = new AuthGuardService(new AuthSessionRepository());
const uploadRepository = new UploadRepository();

interface CompletedUploadFile {
  name: string;
  size: number;
  type: string;
  key: string;
  ufsUrl: string;
}

interface UploadRequestFile {
  size: number;
  type: string;
}

const uploadLimits: Record<
  UploadPurpose,
  { allowedContentTypes: readonly string[]; maxFileSize: number }
> = {
  ANSWER_SCRIPT_PAGE: {
    allowedContentTypes: [scriptPageContentType],
    maxFileSize: 8 * 1024 * 1024
  },
  BUG_SCREENSHOT: { allowedContentTypes: ["image/*"], maxFileSize: 5 * 1024 * 1024 },
  COURSE_COVER: { allowedContentTypes: ["image/*"], maxFileSize: 5 * 1024 * 1024 },
  COURSE_MATERIAL: {
    allowedContentTypes: [
      "image/*",
      "application/pdf",
      "application/msword",
      "application/vnd.ms-powerpoint",
      "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
      "application/vnd.openxmlformats-officedocument.presentationml.presentation"
    ],
    maxFileSize: 50 * 1024 * 1024
  },
  LECTURE_VIDEO: { allowedContentTypes: ["video/*"], maxFileSize: 500 * 1024 * 1024 },
  PROFILE_PHOTO: { allowedContentTypes: ["image/*"], maxFileSize: 5 * 1024 * 1024 },
  QUESTION_IMAGE: { allowedContentTypes: ["image/*"], maxFileSize: 10 * 1024 * 1024 }
};

function matchesContentType(pattern: string, contentType: string): boolean {
  return pattern.endsWith("/*")
    ? contentType.startsWith(pattern.slice(0, pattern.length - 1))
    : pattern === contentType;
}

function getFileExtension(fileName: string, contentType: string): string {
  const extension = fileName
    .toLowerCase()
    .trim()
    .split(".")
    .at(-1)
    ?.replace(/[^a-z0-9]+/g, "-");

  if (extension && fileName.includes(".")) {
    return extension;
  }

  return (
    contentType
      .split("/")
      .at(-1)
      ?.replace(/[^a-z0-9]+/g, "-") || "bin"
  );
}

function resolveUploadKind(contentType: string): UploadKind {
  if (contentType.startsWith("image/")) {
    return "IMAGE";
  }

  if (contentType.startsWith("video/")) {
    return "VIDEO";
  }

  return "DOCUMENT";
}

async function authenticateUpload(
  req: Request,
  purpose: UploadPurpose,
  files: readonly UploadRequestFile[]
): Promise<{ purpose: UploadPurpose; userId: string }> {
  const limit = uploadLimits[purpose];

  if (files.length !== 1) {
    throw new UploadThingError({ code: "BAD_REQUEST", message: "Upload exactly one file" });
  }

  for (const file of files) {
    if (file.size > limit.maxFileSize) {
      throw new UploadThingError({ code: "BAD_REQUEST", message: "File is too large" });
    }

    if (
      !limit.allowedContentTypes.some((pattern) =>
        matchesContentType(pattern, file.type.toLowerCase())
      )
    ) {
      throw new UploadThingError({ code: "BAD_REQUEST", message: "This file type is not allowed" });
    }
  }

  const session = await auth.api.getSession({ headers: req.headers });
  const authenticated = await authGuardService.requireActiveSession(
    session?.session ?? null,
    session?.user ?? null
  );

  return { purpose, userId: authenticated.user.id };
}

function formatUploadRecord(record: UploadRecord) {
  return {
    ...record,
    confirmedAt: record.confirmedAt?.toISOString() ?? null,
    createdAt: record.createdAt.toISOString(),
    updatedAt: record.updatedAt.toISOString()
  };
}

async function recordCompletedUpload(
  file: CompletedUploadFile,
  metadata: { purpose: UploadPurpose; userId: string }
): Promise<{
  confirmedAt: string | null;
  contentType: string;
  createdAt: string;
  durationInSeconds: number | null;
  fileExtension: string;
  fileKey: string;
  fileSize: number;
  fileUrl: string;
  height: number | null;
  id: string;
  kind: UploadKind;
  originalFileName: string;
  provider: StorageProvider;
  purpose: UploadPurpose;
  status: UploadRecord["status"];
  updatedAt: string;
  userId: string;
  variantWidths: number[] | null;
  width: number | null;
}> {
  const record = await uploadRepository.createReadyUpload({
    contentType: file.type.toLowerCase(),
    fileExtension: getFileExtension(file.name, file.type),
    fileKey: file.key,
    fileSize: file.size,
    fileUrl: file.ufsUrl,
    kind: resolveUploadKind(file.type.toLowerCase()),
    originalFileName: file.name.trim(),
    provider: "uploadthing" satisfies StorageProvider,
    purpose: metadata.purpose,
    userId: metadata.userId
  });

  if (record.kind === "VIDEO") {
    await queues["file-processing"].add("extract-video-metadata", {
      contentType: record.contentType,
      uploadId: record.id
    });
  }

  return formatUploadRecord(record);
}

export const uploadthingRouter = {
  answerScriptPage: f({ image: { maxFileCount: 1, maxFileSize: "8MB" } })
    .middleware(async ({ files, req }) => authenticateUpload(req, "ANSWER_SCRIPT_PAGE", files))
    .onUploadComplete(async ({ file, metadata }) => recordCompletedUpload(file, metadata)),
  bugScreenshot: f({ image: { maxFileCount: 1, maxFileSize: "8MB" } })
    .middleware(async ({ files, req }) => authenticateUpload(req, "BUG_SCREENSHOT", files))
    .onUploadComplete(async ({ file, metadata }) => recordCompletedUpload(file, metadata)),
  courseCover: f({ image: { maxFileCount: 1, maxFileSize: "8MB" } })
    .middleware(async ({ files, req }) => authenticateUpload(req, "COURSE_COVER", files))
    .onUploadComplete(async ({ file, metadata }) => recordCompletedUpload(file, metadata)),
  courseMaterial: f({
    blob: { maxFileCount: 1, maxFileSize: "64MB" },
    image: { maxFileCount: 1, maxFileSize: "64MB" },
    pdf: { maxFileCount: 1, maxFileSize: "64MB" }
  })
    .middleware(async ({ files, req }) => authenticateUpload(req, "COURSE_MATERIAL", files))
    .onUploadComplete(async ({ file, metadata }) => recordCompletedUpload(file, metadata)),
  lectureVideo: f({ video: { maxFileCount: 1, maxFileSize: "512MB" } })
    .middleware(async ({ files, req }) => authenticateUpload(req, "LECTURE_VIDEO", files))
    .onUploadComplete(async ({ file, metadata }) => recordCompletedUpload(file, metadata)),
  profilePhoto: f({ image: { maxFileCount: 1, maxFileSize: "8MB" } })
    .middleware(async ({ files, req }) => authenticateUpload(req, "PROFILE_PHOTO", files))
    .onUploadComplete(async ({ file, metadata }) => recordCompletedUpload(file, metadata)),
  questionImage: f({ image: { maxFileCount: 1, maxFileSize: "16MB" } })
    .middleware(async ({ files, req }) => authenticateUpload(req, "QUESTION_IMAGE", files))
    .onUploadComplete(async ({ file, metadata }) => recordCompletedUpload(file, metadata))
} satisfies FileRouter;

export type UploadthingRouter = typeof uploadthingRouter;
