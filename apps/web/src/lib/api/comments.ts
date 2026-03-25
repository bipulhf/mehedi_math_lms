import type { PaginatedEnvelope } from "@/lib/api/client";
import { apiDelete, apiGet, apiPost, apiPut } from "@/lib/api/client";

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
  user: {
    id: string;
    image: string | null;
    name: string;
    role: "STUDENT" | "TEACHER" | "ACCOUNTANT" | "ADMIN";
  };
}

function buildQueryString(query: Record<string, number | undefined>): string {
  const searchParams = new URLSearchParams();

  Object.entries(query).forEach(([key, value]) => {
    if (value === undefined) {
      return;
    }

    searchParams.set(key, String(value));
  });

  const serialized = searchParams.toString();

  return serialized.length > 0 ? `?${serialized}` : "";
}

export async function listLectureComments(
  lectureId: string,
  query?: { limit?: number | undefined; page?: number | undefined }
): Promise<PaginatedEnvelope<LectureComment>> {
  return apiGet<readonly LectureComment[]>(
    `lectures/${lectureId}/comments${buildQueryString({
      limit: query?.limit,
      page: query?.page
    })}`
  ) as Promise<PaginatedEnvelope<LectureComment>>;
}

export async function createLectureComment(input: {
  content: string;
  lectureId: string;
  parentId?: string | undefined;
}): Promise<LectureComment> {
  const response = await apiPost<
    { content: string; parentId?: string | undefined },
    LectureComment
  >(`lectures/${input.lectureId}/comments`, {
    content: input.content,
    parentId: input.parentId
  });

  return response.data;
}

export async function updateComment(
  id: string,
  input: { content: string }
): Promise<LectureComment> {
  const response = await apiPut<{ content: string }, LectureComment>(`comments/${id}`, input);

  return response.data;
}

export async function deleteComment(id: string): Promise<{ id: string }> {
  const response = await apiDelete<{ id: string }>(`comments/${id}`);

  return response.data;
}
