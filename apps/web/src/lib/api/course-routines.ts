import type { UpsertCourseRoutineInput } from "@genex/shared";

import { apiDelete, apiGet, apiPut } from "@/lib/api/client";

export interface CourseRoutine {
  attachmentName: string | null;
  attachmentUrl: string | null;
  content: string | null;
  courseId: string;
  createdAt: string;
  id: string;
  updatedAt: string;
  updatedBy: {
    id: string;
    name: string;
  };
}

/** Null is a course that has no routine yet, which is not an error. */
export async function getCourseRoutine(courseId: string): Promise<CourseRoutine | null> {
  const response = await apiGet<CourseRoutine | null>(`courses/${courseId}/routine`);

  return response.data;
}

export async function saveCourseRoutine(
  courseId: string,
  input: UpsertCourseRoutineInput
): Promise<CourseRoutine> {
  const response = await apiPut<UpsertCourseRoutineInput, CourseRoutine>(
    `courses/${courseId}/routine`,
    input
  );

  return response.data;
}

export async function deleteCourseRoutine(courseId: string): Promise<void> {
  await apiDelete<{ deleted: boolean }>(`courses/${courseId}/routine`);
}
