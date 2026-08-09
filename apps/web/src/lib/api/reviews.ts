import type { CreateCourseReviewInput } from "@mma/shared";

import { apiGet, apiGetPaginated, apiPost, type PaginatedApiResponse } from "@/lib/api/client";

export interface CourseReviewPublic {
  authorName: string;
  comment: string | null;
  createdAt: string;
  id: string;
  rating: number;
  userId: string;
}

export async function getCourseReviewSummary(
  courseId: string
): Promise<{ average: number; count: number }> {
  const response = await apiGet<{ average: number; count: number }>(
    `courses/${courseId}/review-summary`
  );

  return response.data;
}

export async function listCourseReviews(
  courseId: string,
  query?: { limit?: number; page?: number }
): Promise<PaginatedApiResponse<CourseReviewPublic>> {
  return apiGetPaginated<CourseReviewPublic>(`courses/${courseId}/reviews`, query);
}

export async function submitCourseReview(
  courseId: string,
  payload: CreateCourseReviewInput
): Promise<CourseReviewPublic> {
  const response = await apiPost<CreateCourseReviewInput, CourseReviewPublic>(
    `courses/${courseId}/reviews`,
    payload
  );

  return response.data;
}
