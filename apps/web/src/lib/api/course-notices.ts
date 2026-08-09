import type { CreateCourseNoticeInput, UpdateCourseNoticeInput } from "@mma/shared";

import { apiDelete, apiGet, apiPost, apiPut } from "@/lib/api/client";

export interface CourseNotice {
  author: {
    id: string;
    name: string;
  };
  content: string;
  courseId: string;
  createdAt: string;
  id: string;
  isPinned: boolean;
  title: string;
  updatedAt: string;
}

export async function listCourseNotices(courseId: string): Promise<readonly CourseNotice[]> {
  const response = await apiGet<{ items: readonly CourseNotice[] }>(
    `courses/${courseId}/notices`
  );

  return response.data.items;
}

export async function createCourseNotice(
  courseId: string,
  input: CreateCourseNoticeInput
): Promise<CourseNotice> {
  const response = await apiPost<CreateCourseNoticeInput, CourseNotice>(
    `courses/${courseId}/notices`,
    input
  );

  return response.data;
}

export async function updateCourseNotice(
  noticeId: string,
  input: UpdateCourseNoticeInput
): Promise<CourseNotice> {
  const response = await apiPut<UpdateCourseNoticeInput, CourseNotice>(`notices/${noticeId}`, input);

  return response.data;
}

export async function deleteCourseNotice(noticeId: string): Promise<void> {
  await apiDelete<{ deleted: boolean }>(`notices/${noticeId}`);
}
