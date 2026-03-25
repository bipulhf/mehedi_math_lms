import { apiGet, apiPost } from "@/lib/api/client";

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
  enrollmentStatus: "ACTIVE" | "COMPLETED" | "CANCELLED";
  lectures: readonly CourseProgressLectureItem[];
  nextLectureId: string | null;
  totalLectures: number;
}

export async function getCourseProgress(courseId: string): Promise<CourseProgressResponse> {
  const response = await apiGet<CourseProgressResponse>(`courses/${courseId}/progress`);

  return response.data;
}

export async function markLectureComplete(lectureId: string): Promise<CourseProgressResponse> {
  const response = await apiPost<Record<string, never>, CourseProgressResponse>(
    `progress/${lectureId}/complete`,
    {}
  );

  return response.data;
}
