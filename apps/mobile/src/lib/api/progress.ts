import { apiGet, apiPost } from "@/src/lib/api-client";

/** Lesson completion and the progress it rolls up to. */

export interface CourseProgressLectureItem {
  chapterId: string;
  completedAt: string | null;
  isCompleted: boolean;
  lastViewedAt: string | null;
  lectureId: string;
}

export interface CourseProgressResponse {
  completedLectures: number;
  completionPercentage: number;
  courseId: string;
  enrollmentId: string;
  enrollmentStatus: "ACTIVE" | "CANCELLED" | "COMPLETED";
  lectures: readonly CourseProgressLectureItem[];
  nextLectureId: string | null;
  totalLectures: number;
}

export async function getCourseProgress(courseId: string): Promise<CourseProgressResponse> {
  return apiGet<CourseProgressResponse>(`courses/${courseId}/progress`);
}

export async function markLectureComplete(lectureId: string): Promise<void> {
  await apiPost(`progress/${lectureId}/complete`);
}
