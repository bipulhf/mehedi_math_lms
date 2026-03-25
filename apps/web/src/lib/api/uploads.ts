import type { UploadPurpose, UploadStatus } from "@mma/shared";

import { apiDelete, apiPost } from "@/lib/api/client";

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
  purpose: UploadPurpose;
  status: UploadStatus;
  updatedAt: string;
  userId: string;
  width: number | null;
}

export interface UploadFileOptions {
  onProgress?: ((progress: number) => void) | undefined;
  purpose: UploadPurpose;
}

function uploadFileToSignedUrl(
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

async function readImageDimensions(file: File): Promise<Pick<ConfirmUploadPayload, "height" | "width">> {
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

async function readVideoMetadata(file: File): Promise<Pick<ConfirmUploadPayload, "durationInSeconds">> {
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

async function buildConfirmPayload(
  uploadId: string,
  file: File
): Promise<ConfirmUploadPayload> {
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

export async function requestPresignedUpload(
  options: CreatePresignedUploadPayload
): Promise<PreparedUploadResponse> {
  const response = await apiPost<CreatePresignedUploadPayload, PreparedUploadResponse>(
    "upload/presigned",
    options
  );

  return response.data;
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
  const preparedUpload = await requestPresignedUpload({
    contentType: file.type,
    fileName: file.name,
    fileSize: file.size,
    purpose: options.purpose
  });

  try {
    await uploadFileToSignedUrl(preparedUpload.uploadUrl, file, options.onProgress);
    const confirmPayload = await buildConfirmPayload(preparedUpload.id, file);

    return await confirmUpload(confirmPayload);
  } catch (error) {
    await deleteUpload(preparedUpload.id).catch(() => undefined);
    throw error;
  }
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

export async function uploadProfilePhoto(
  file: File,
  onProgress?: (progress: number) => void
): Promise<string> {
  const upload = await uploadManagedFile(file, { onProgress, purpose: "PROFILE_PHOTO" });

  return upload.fileUrl;
}
