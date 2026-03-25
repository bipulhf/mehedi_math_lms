import {
  createCourseSchema,
  courseStatusSchema,
  rejectCourseSchema,
  updateCourseSchema
} from "@mma/shared";
import type { z } from "zod";

import { apiDelete, apiGet, apiPost, apiPut, type PaginatedEnvelope } from "@/lib/api/client";

export interface CourseTeacherOption {
  bio: string | null;
  email: string;
  id: string;
  name: string;
  profilePhoto: string | null;
  slug: string | null;
}

export interface CourseTeacherSummary {
  email: string;
  id: string;
  name: string;
  profilePhoto: string | null;
  slug: string | null;
}

export interface CourseSummary {
  category: {
    id: string;
    name: string;
    slug: string;
  };
  coverImageUrl: string | null;
  createdAt: string;
  creator: {
    email: string;
    id: string;
    name: string;
    role: "STUDENT" | "TEACHER" | "ACCOUNTANT" | "ADMIN";
    slug: string | null;
  };
  description: string;
  id: string;
  isExamOnly: boolean;
  price: string;
  publishedAt: string | null;
  rejectedAt: string | null;
  reviewFeedback: string | null;
  slug: string;
  status: z.infer<typeof courseStatusSchema>;
  submittedAt: string | null;
  teachers: readonly CourseTeacherSummary[];
  title: string;
  updatedAt: string;
}

export type CourseDetail = CourseSummary;
export type CreateCourseInput = z.infer<typeof createCourseSchema>;
export type UpdateCourseInput = z.infer<typeof updateCourseSchema>;
export type RejectCourseInput = z.infer<typeof rejectCourseSchema>;

function buildQueryString(
  query: Record<string, boolean | number | string | undefined>
): string {
  const searchParams = new URLSearchParams();

  Object.entries(query).forEach(([key, value]) => {
    if (value === undefined || value === "") {
      return;
    }

    searchParams.set(key, String(value));
  });

  const serialized = searchParams.toString();

  return serialized.length > 0 ? `?${serialized}` : "";
}

export async function listCourses(query?: {
  categoryId?: string | undefined;
  limit?: number | undefined;
  maxPrice?: number | undefined;
  minPrice?: number | undefined;
  mine?: boolean | undefined;
  page?: number | undefined;
  search?: string | undefined;
  status?: CourseSummary["status"] | undefined;
}): Promise<PaginatedEnvelope<CourseSummary>> {
  return apiGet<readonly CourseSummary[]>(
    `courses${buildQueryString({
      categoryId: query?.categoryId,
      limit: query?.limit,
      maxPrice: query?.maxPrice,
      minPrice: query?.minPrice,
      mine: query?.mine,
      page: query?.page,
      search: query?.search,
      status: query?.status
    })}`
  ) as Promise<PaginatedEnvelope<CourseSummary>>;
}

export async function getCourse(id: string): Promise<CourseDetail> {
  const response = await apiGet<CourseDetail>(`courses/${id}`);

  return response.data;
}

export async function createCourse(values: CreateCourseInput): Promise<CourseDetail> {
  const response = await apiPost<CreateCourseInput, CourseDetail>("courses", values);

  return response.data;
}

export async function updateCourse(id: string, values: UpdateCourseInput): Promise<CourseDetail> {
  const response = await apiPut<UpdateCourseInput, CourseDetail>(`courses/${id}`, values);

  return response.data;
}

export async function archiveCourse(id: string): Promise<{ id: string }> {
  const response = await apiDelete<{ id: string }>(`courses/${id}`);

  return response.data;
}

export async function submitCourse(id: string): Promise<CourseDetail> {
  const response = await apiPost<Record<string, never>, CourseDetail>(`courses/${id}/submit`, {});

  return response.data;
}

export async function replaceCourseTeachers(
  id: string,
  teacherIds: readonly string[]
): Promise<CourseDetail> {
  const response = await apiPost<{ teacherIds: readonly string[] }, CourseDetail>(`courses/${id}/teachers`, {
    teacherIds
  });

  return response.data;
}

export async function listTeacherDirectory(search?: string | undefined): Promise<readonly CourseTeacherOption[]> {
  const response = await apiGet<readonly CourseTeacherOption[]>(
    `courses/support/teachers${buildQueryString({ search })}`
  );

  return response.data;
}

export async function approveCourse(id: string): Promise<CourseDetail> {
  const response = await apiPost<Record<string, never>, CourseDetail>(`admin/courses/${id}/approve`, {});

  return response.data;
}

export async function rejectCourse(id: string, values: RejectCourseInput): Promise<CourseDetail> {
  const response = await apiPost<RejectCourseInput, CourseDetail>(`admin/courses/${id}/reject`, values);

  return response.data;
}
