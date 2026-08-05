import type { StorageProvider, UploadPurpose, UploadStatus } from "@genex/shared";
import { genUploader } from "uploadthing/client";
import type { FileRouter } from "uploadthing/server";

import { apiDelete, apiGet, apiPost } from "@/lib/api/client";

type UploadthingRouter = FileRouter;
const uploadthingUploader = genUploader<UploadthingRouter>({ url: "/api/v1/uploadthing" });

interface CreatePresignedUploadPayload {
  contentType: string;
  fileName: string;
  fileSize: number;
  purpose: UploadPurpose;
}

interface PreparedUploadResponse {
  fileUrl: string;
  id: string;
  key: string;
  purpose: UploadPurpose;
  status: UploadStatus;
  uploadUrl: string;
}

interface ConfirmUploadPayload {
  durationInSeconds?: number | undefined;
  height?: number | undefined;
  uploadId: string;
  width?: number | undefined;
}

export interface UploadRecord {
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
  kind: "IMAGE" | "VIDEO" | "DOCUMENT";
  originalFileName: string;
  provider: StorageProvider;
  purpose: UploadPurpose;
  status: UploadStatus;
  updatedAt: string;
  userId: string;
  /** Widths of the resized copies the API generated, or null when it made none. */
  variantWidths: number[] | null;
  width: number | null;
}

export interface UploadFileOptions {
  onProgress?: ((progress: number) => void) | undefined;
  purpose: UploadPurpose;
}

async function readImageDimensions(
  file: File
): Promise<Pick<ConfirmUploadPayload, "height" | "width">> {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const image = new Image();

    image.onload = () => {
      URL.revokeObjectURL(url);
      resolve({
        height: image.naturalHeight,
        width: image.naturalWidth
      });
    };

    image.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error("Unable to read image metadata"));
    };

    image.src = url;
  });
}

async function readVideoMetadata(
  file: File
): Promise<Pick<ConfirmUploadPayload, "durationInSeconds">> {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const video = document.createElement("video");
    video.preload = "metadata";

    video.onloadedmetadata = () => {
      URL.revokeObjectURL(url);
      resolve({
        durationInSeconds: Number.isFinite(video.duration) ? Math.round(video.duration) : undefined
      });
    };

    video.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error("Unable to read video metadata"));
    };

    video.src = url;
  });
}

async function buildConfirmPayload(uploadId: string, file: File): Promise<ConfirmUploadPayload> {
  if (file.type.startsWith("image/")) {
    const imageDimensions = await readImageDimensions(file);

    return {
      ...imageDimensions,
      uploadId
    };
  }

  if (file.type.startsWith("video/")) {
    const metadata = await readVideoMetadata(file);

    return {
      ...metadata,
      uploadId
    };
  }

  return { uploadId };
}

async function prepareS3Upload(
  options: CreatePresignedUploadPayload
): Promise<PreparedUploadResponse> {
  const response = await apiPost<CreatePresignedUploadPayload, PreparedUploadResponse>(
    "upload/presigned",
    options
  );

  return response.data;
}

async function putToS3(
  uploadUrl: string,
  file: File,
  onProgress?: (progress: number) => void
): Promise<void> {
  return new Promise((resolve, reject) => {
    const request = new XMLHttpRequest();

    request.upload.addEventListener("progress", (event) => {
      if (!onProgress || !event.lengthComputable) {
        return;
      }

      onProgress(Math.round((event.loaded / event.total) * 100));
    });

    request.addEventListener("load", () => {
      if (request.status >= 200 && request.status < 300) {
        onProgress?.(100);
        resolve();
        return;
      }

      reject(new Error("File upload failed"));
    });

    request.addEventListener("error", () => {
      reject(new Error("File upload failed"));
    });

    request.open("PUT", uploadUrl);
    request.setRequestHeader("Content-Type", file.type);
    request.send(file);
  });
}

let activeStorageProvider: Promise<StorageProvider> | undefined;

async function getActiveStorageProvider(): Promise<StorageProvider> {
  activeStorageProvider ??= apiGet<{ provider: StorageProvider }>("upload/provider").then(
    (response) => response.data.provider
  );

  return activeStorageProvider;
}

async function uploadViaUploadThing(file: File, options: UploadFileOptions): Promise<UploadRecord> {
  const routeByPurpose: Record<UploadPurpose, string> = {
    ANSWER_SCRIPT_PAGE: "answerScriptPage",
    BUG_SCREENSHOT: "bugScreenshot",
    COURSE_COVER: "courseCover",
    COURSE_MATERIAL: "courseMaterial",
    LECTURE_VIDEO: "lectureVideo",
    PROFILE_PHOTO: "profilePhoto",
    QUESTION_IMAGE: "questionImage"
  };
  const [uploaded] = await uploadthingUploader.uploadFiles(routeByPurpose[options.purpose], {
    files: [file],
    onUploadProgress: ({ progress }) => options.onProgress?.(Math.round(progress))
  });

  if (!uploaded) {
    throw new Error("UploadThing returned no uploaded file");
  }

  if (!uploaded.serverData) {
    throw new Error("UploadThing returned no upload record");
  }

  return uploaded.serverData as unknown as UploadRecord;
}

async function uploadViaS3(file: File, options: UploadFileOptions): Promise<UploadRecord> {
  const preparedUpload = await prepareS3Upload({
    contentType: file.type,
    fileName: file.name,
    fileSize: file.size,
    purpose: options.purpose
  });

  try {
    await putToS3(preparedUpload.uploadUrl, file, options.onProgress);
    const confirmPayload = await buildConfirmPayload(preparedUpload.id, file);

    return await confirmUpload(confirmPayload);
  } catch (error) {
    await deleteUpload(preparedUpload.id).catch(() => undefined);
    throw error;
  }
}

export async function confirmUpload(payload: ConfirmUploadPayload): Promise<UploadRecord> {
  const response = await apiPost<ConfirmUploadPayload, UploadRecord>("upload/confirm", payload);

  return response.data;
}

export async function deleteUpload(uploadId: string): Promise<void> {
  await apiDelete<{ id: string }>(`upload/${uploadId}`);
}

export async function uploadManagedFile(
  file: File,
  options: UploadFileOptions
): Promise<UploadRecord> {
  const provider = await getActiveStorageProvider();

  return provider === "uploadthing"
    ? uploadViaUploadThing(file, options)
    : uploadViaS3(file, options);
}

export async function uploadBugScreenshot(
  file: File,
  onProgress?: (progress: number) => void
): Promise<string> {
  const upload = await uploadManagedFile(file, { onProgress, purpose: "BUG_SCREENSHOT" });

  return upload.fileUrl;
}

export async function uploadCourseCover(
  file: File,
  onProgress?: (progress: number) => void
): Promise<string> {
  const upload = await uploadManagedFile(file, { onProgress, purpose: "COURSE_COVER" });

  return upload.fileUrl;
}

export async function uploadCourseMaterial(
  file: File,
  onProgress?: (progress: number) => void
): Promise<string> {
  const upload = await uploadManagedFile(file, { onProgress, purpose: "COURSE_MATERIAL" });

  return upload.fileUrl;
}

export async function uploadLectureVideo(
  file: File,
  onProgress?: (progress: number) => void
): Promise<string> {
  const upload = await uploadManagedFile(file, { onProgress, purpose: "LECTURE_VIDEO" });

  return upload.fileUrl;
}

/** A photographed page of an Answer Script, already sized down by the caller. */
export async function uploadAnswerScriptPage(
  file: File,
  onProgress?: (progress: number) => void
): Promise<UploadRecord> {
  return uploadManagedFile(file, { onProgress, purpose: "ANSWER_SCRIPT_PAGE" });
}

export async function uploadQuestionImage(
  file: File,
  onProgress?: (progress: number) => void
): Promise<UploadRecord> {
  return uploadManagedFile(file, { onProgress, purpose: "QUESTION_IMAGE" });
}

export async function uploadProfilePhoto(
  file: File,
  onProgress?: (progress: number) => void
): Promise<string> {
  const upload = await uploadManagedFile(file, { onProgress, purpose: "PROFILE_PHOTO" });

  return upload.fileUrl;
}
