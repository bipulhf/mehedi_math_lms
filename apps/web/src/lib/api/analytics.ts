import { apiGet } from "@/lib/api/client";

export interface AnalyticsTimeSeriesPoint {
  period: string;
  value: number;
}

export interface CourseCompletionRow {
  completedCount: number;
  completionRate: number;
  courseId: string;
  courseTitle: string;
  enrollmentCount: number;
}

export interface AdminAnalyticsOverview {
  completions: readonly CourseCompletionRow[];
  demographics: readonly { count: number; label: string }[];
  enrollmentTrend: readonly AnalyticsTimeSeriesPoint[];
  revenueTrend: readonly AnalyticsTimeSeriesPoint[];
}

export interface TeacherAnalyticsOverview {
  completions: readonly CourseCompletionRow[];
  courseCount: number;
  enrollmentTrend: readonly AnalyticsTimeSeriesPoint[];
  lectureCount: number;
  revenueTrend: readonly AnalyticsTimeSeriesPoint[];
  totalEnrollments: number;
}

export interface AccountantAnalyticsOverview {
  paymentStatusDistribution: readonly { count: number; status: string }[];
  refundedCount: number;
  revenueByCourse: readonly { courseId: string; courseTitle: string; revenue: number }[];
  totalRefunded: number;
  totalRevenue: number;
}

export interface CourseAnalyticsDetail {
  averageRating: number;
  completedEnrollments: number;
  completionRate: number;
  enrollmentTrend: readonly AnalyticsTimeSeriesPoint[];
  revenueTotal: number;
  reviewCount: number;
  totalEnrollments: number;
}

export async function getAdminAnalyticsOverview(): Promise<AdminAnalyticsOverview> {
  const response = await apiGet<AdminAnalyticsOverview>("analytics/admin/overview");

  return response.data;
}

export async function getTeacherAnalyticsOverview(): Promise<TeacherAnalyticsOverview> {
  const response = await apiGet<TeacherAnalyticsOverview>("analytics/teacher/overview");

  return response.data;
}

export async function getAccountantAnalyticsOverview(): Promise<AccountantAnalyticsOverview> {
  const response = await apiGet<AccountantAnalyticsOverview>("analytics/accountant/overview");

  return response.data;
}

export async function getCourseAnalytics(courseId: string): Promise<CourseAnalyticsDetail> {
  const response = await apiGet<CourseAnalyticsDetail>(`analytics/courses/${courseId}`);

  return response.data;
}
