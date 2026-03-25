import type { z } from "zod";
import {
  createChapterSchema,
  createLectureSchema,
  createMaterialSchema,
  reorderChaptersSchema,
  reorderLecturesSchema,
  updateChapterSchema,
  updateLectureSchema,
  updateMaterialSchema
} from "@mma/shared";

import { apiDelete, apiGet, apiPatch, apiPost, apiPut } from "@/lib/api/client";

export interface ContentMaterial {
  createdAt: string;
  fileSize: number;
  fileType: string;
  fileUrl: string;
  id: string;
  title: string;
  updatedAt: string;
}

export interface ContentLecture {
  chapterId: string;
  content: string | null;
  createdAt: string;
  description: string | null;
  id: string;
  isPreview: boolean;
  materials: readonly ContentMaterial[];
  sortOrder: number;
  title: string;
  type: "VIDEO_UPLOAD" | "VIDEO_LINK" | "TEXT";
  updatedAt: string;
  videoDuration: number | null;
  videoUrl: string | null;
}

export interface ContentChapter {
  courseId: string;
  createdAt: string;
  description: string | null;
  id: string;
  lectures: readonly ContentLecture[];
  materials: readonly ContentMaterial[];
  sortOrder: number;
  title: string;
  updatedAt: string;
}

export type CreateChapterInput = z.infer<typeof createChapterSchema>;
export type UpdateChapterInput = z.infer<typeof updateChapterSchema>;
export type ReorderChaptersInput = z.infer<typeof reorderChaptersSchema>;
export type CreateLectureInput = z.infer<typeof createLectureSchema>;
export type UpdateLectureInput = z.infer<typeof updateLectureSchema>;
export type ReorderLecturesInput = z.infer<typeof reorderLecturesSchema>;
export type CreateMaterialInput = z.infer<typeof createMaterialSchema>;
export type UpdateMaterialInput = z.infer<typeof updateMaterialSchema>;

export async function getCourseContent(courseId: string): Promise<readonly ContentChapter[]> {
  const response = await apiGet<readonly ContentChapter[]>(`courses/${courseId}/content`);

  return response.data;
}

export async function createChapter(
  courseId: string,
  values: CreateChapterInput
): Promise<ContentChapter> {
  const response = await apiPost<CreateChapterInput, ContentChapter>(
    `courses/${courseId}/chapters`,
    values
  );

  return response.data;
}

export async function updateChapter(
  chapterId: string,
  values: UpdateChapterInput
): Promise<ContentChapter> {
  const response = await apiPut<UpdateChapterInput, ContentChapter>(
    `chapters/${chapterId}`,
    values
  );

  return response.data;
}

export async function deleteChapter(chapterId: string): Promise<{ id: string }> {
  const response = await apiDelete<{ id: string }>(`chapters/${chapterId}`);

  return response.data;
}

export async function reorderChapters(
  courseId: string,
  values: ReorderChaptersInput
): Promise<readonly ContentChapter[]> {
  const response = await apiPatch<ReorderChaptersInput, readonly ContentChapter[]>(
    `courses/${courseId}/chapters/reorder`,
    values
  );

  return response.data;
}

export async function createLecture(
  chapterId: string,
  values: CreateLectureInput
): Promise<ContentLecture> {
  const response = await apiPost<CreateLectureInput, ContentLecture>(
    `chapters/${chapterId}/lectures`,
    values
  );

  return response.data;
}

export async function updateLecture(
  lectureId: string,
  values: UpdateLectureInput
): Promise<ContentLecture> {
  const response = await apiPut<UpdateLectureInput, ContentLecture>(
    `lectures/${lectureId}`,
    values
  );

  return response.data;
}

export async function deleteLecture(lectureId: string): Promise<{ id: string }> {
  const response = await apiDelete<{ id: string }>(`lectures/${lectureId}`);

  return response.data;
}

export async function reorderLectures(
  chapterId: string,
  values: ReorderLecturesInput
): Promise<readonly ContentChapter[]> {
  const response = await apiPatch<ReorderLecturesInput, readonly ContentChapter[]>(
    `chapters/${chapterId}/lectures/reorder`,
    values
  );

  return response.data;
}

export async function createChapterMaterial(
  chapterId: string,
  values: CreateMaterialInput
): Promise<ContentMaterial> {
  const response = await apiPost<CreateMaterialInput, ContentMaterial>(
    `chapters/${chapterId}/materials`,
    values
  );

  return response.data;
}

export async function updateChapterMaterial(
  materialId: string,
  values: UpdateMaterialInput
): Promise<ContentMaterial> {
  const response = await apiPut<UpdateMaterialInput, ContentMaterial>(
    `chapters/materials/${materialId}`,
    values
  );

  return response.data;
}

export async function deleteChapterMaterial(materialId: string): Promise<{ id: string }> {
  const response = await apiDelete<{ id: string }>(`chapters/materials/${materialId}`);

  return response.data;
}

export async function createLectureMaterial(
  lectureId: string,
  values: CreateMaterialInput
): Promise<ContentMaterial> {
  const response = await apiPost<CreateMaterialInput, ContentMaterial>(
    `lectures/${lectureId}/materials`,
    values
  );

  return response.data;
}

export async function updateLectureMaterial(
  materialId: string,
  values: UpdateMaterialInput
): Promise<ContentMaterial> {
  const response = await apiPut<UpdateMaterialInput, ContentMaterial>(
    `lectures/materials/${materialId}`,
    values
  );

  return response.data;
}

export async function deleteLectureMaterial(materialId: string): Promise<{ id: string }> {
  const response = await apiDelete<{ id: string }>(`lectures/materials/${materialId}`);

  return response.data;
}
