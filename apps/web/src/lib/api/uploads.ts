import { apiPost } from "@/lib/api/client";

interface ImageUploadPayload {
  contentType: string;
  fileName: string;
}

interface ImageUploadResponse {
  key: string;
  publicUrl: string;
  uploadUrl: string;
}

async function uploadImage(path: string, file: File): Promise<string> {
  const response = await apiPost<ImageUploadPayload, ImageUploadResponse>(path, {
    contentType: file.type,
    fileName: file.name
  });
  const uploadResponse = await fetch(response.data.uploadUrl, {
    body: file,
    headers: {
      "Content-Type": file.type
    },
    method: "PUT"
  });

  if (!uploadResponse.ok) {
    throw new Error("Image upload failed");
  }

  return response.data.publicUrl;
}

export async function uploadBugScreenshot(file: File): Promise<string> {
  return uploadImage("upload/bug-screenshot/presign", file);
}

export async function uploadCourseCover(file: File): Promise<string> {
  return uploadImage("upload/course-cover/presign", file);
}

export async function uploadCourseMaterial(file: File): Promise<string> {
  return uploadImage("upload/course-material/presign", file);
}

export async function uploadLectureVideo(file: File): Promise<string> {
  return uploadImage("upload/lecture-video/presign", file);
}
