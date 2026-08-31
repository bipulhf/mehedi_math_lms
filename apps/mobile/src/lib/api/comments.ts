import {
  apiDelete,
  apiGetPaginated,
  apiPost,
  apiPut,
  buildQueryString
} from "@/src/lib/api-client";
import type { MessageParticipant } from "@/src/lib/api/messages";

/** Lecture discussion — the thread under one lesson. */

export interface LectureComment {
  content: string | null;
  createdAt: string;
  id: string;
  isDeleted: boolean;
  isEditable: boolean;
  isOwn: boolean;
  lectureId: string;
  parentId: string | null;
  replies: readonly LectureComment[];
  updatedAt: string;
  user: MessageParticipant;
}

export async function listLectureComments(lectureId: string): Promise<readonly LectureComment[]> {
  const response = await apiGetPaginated<LectureComment>(
    `lectures/${lectureId}/comments${buildQueryString({ limit: 50, page: 1 })}`
  );

  return response.data;
}

export async function createLectureComment(input: {
  content: string;
  lectureId: string;
  parentId?: string | undefined;
}): Promise<LectureComment> {
  return apiPost<{ content: string; parentId?: string | undefined }, LectureComment>(
    `lectures/${input.lectureId}/comments`,
    { content: input.content, parentId: input.parentId }
  );
}

export async function updateLectureComment(id: string, content: string): Promise<LectureComment> {
  return apiPut<{ content: string }, LectureComment>(`comments/${id}`, { content });
}

export async function deleteLectureComment(id: string): Promise<{ id: string }> {
  return apiDelete<{ id: string }>(`comments/${id}`);
}
