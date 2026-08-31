import { apiGet } from "@/src/lib/api-client";

/** The class routine a teacher publishes on a course. */

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
  return apiGet<CourseRoutine | null>(`courses/${courseId}/routine`);
}
