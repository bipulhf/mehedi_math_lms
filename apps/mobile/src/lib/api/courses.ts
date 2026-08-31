import { ApiError, apiGet, apiGetPaginated, buildQueryString } from "@/src/lib/api-client";

/** The catalogue and one course's own page. */

export interface CourseSummary {
  category: { name: string; slug: string } | null;
  coverImageUrl: string | null;
  description: string;
  id: string;
  isExamOnly: boolean;
  price: string;
  slug: string;
  stats: {
    /** Students on the course now — a refunded one is not counted. ADR-0001. */
    enrolledStudentCount: number;
    freeLessonCount: number;
    lectureCount: number;
    reviewAverage: number | null;
    reviewCount: number;
    totalDurationSeconds: number;
  };
  status: "DRAFT" | "PENDING" | "PUBLISHED" | "ARCHIVED";
  teachers: readonly CourseTeacher[];
  title: string;
}

export interface CourseTeacher {
  id: string;
  name: string;
  profilePhoto: string | null;
  role?: "OWNER" | "TEACHER";
  slug: string | null;
}

export interface CourseDetail extends CourseSummary {
  creator: { id: string; name: string };
  /**
   * The one advertised coupon on this course, already priced against it. It
   * rides on the detail response so the offer is there with the price rather
   * than a request later. ADR-0013.
   */
  publicCoupon?: {
    code: string;
    discountAmount: string;
    id: string;
    kind: "FLAT" | "PERCENT";
    payable: string;
    value: string;
  } | null;
}

export async function listCourses(query: {
  categoryId?: string | undefined;
  hasFreeLesson?: boolean | undefined;
  limit?: number;
  maxPrice?: number | undefined;
  minPrice?: number | undefined;
  page?: number;
  search?: string | undefined;
}): Promise<{ items: readonly CourseSummary[]; pages: number }> {
  const response = await apiGetPaginated<CourseSummary>(
    `courses${buildQueryString({
      categoryId: query.categoryId,
      hasFreeLesson: query.hasFreeLesson,
      limit: query.limit ?? 20,
      maxPrice: query.maxPrice,
      minPrice: query.minPrice,
      page: query.page ?? 1,
      search: query.search
    })}`
  );

  return { items: response.data, pages: response.pagination.pages };
}

export async function getCourse(courseId: string): Promise<CourseDetail> {
  return apiGet<CourseDetail>(`courses/${courseId}`);
}

export async function getCourseBySlug(slug: string): Promise<CourseDetail> {
  return apiGet<CourseDetail>(`courses/by-slug/${encodeURIComponent(slug)}`);
}

export async function getCourseBySlugOrId(value: string): Promise<CourseDetail> {
  try {
    return await getCourseBySlug(value);
  } catch (error) {
    if (error instanceof ApiError && error.status === 404) {
      return getCourse(value);
    }

    throw error;
  }
}
