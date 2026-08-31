import { apiGet, apiGetPaginated, apiPost, buildQueryString } from "@/src/lib/api-client";

/** Course ratings — the summary, the list, and leaving one. */

export interface CourseReview {
  authorName: string;
  comment: string | null;
  createdAt: string;
  id: string;
  rating: number;
  userId: string;
}

export interface CourseReviewSummary {
  average: number;
  count: number;
}

export async function getCourseReviewSummary(courseId: string): Promise<CourseReviewSummary> {
  return apiGet<CourseReviewSummary>(`courses/${courseId}/review-summary`);
}

export async function listCourseReviews(courseId: string): Promise<readonly CourseReview[]> {
  const response = await apiGetPaginated<CourseReview>(
    `courses/${courseId}/reviews${buildQueryString({ limit: 20, page: 1 })}`
  );

  return response.data;
}

export async function submitCourseReview(
  courseId: string,
  input: { comment?: string | undefined; rating: number }
): Promise<CourseReview> {
  return apiPost<typeof input, CourseReview>(`courses/${courseId}/reviews`, input);
}
