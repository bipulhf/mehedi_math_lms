import { apiGet } from "@/src/lib/api-client";

/** Course notices as an enrolled student reads them. */

export interface CourseNotice {
  author: { id: string; name: string };
  content: string;
  courseId: string;
  createdAt: string;
  id: string;
  isPinned: boolean;
  title: string;
  updatedAt: string;
}

export async function listCourseNotices(courseId: string): Promise<readonly CourseNotice[]> {
  const data = await apiGet<{ items: readonly CourseNotice[] }>(`courses/${courseId}/notices`);

  return data.items;
}
