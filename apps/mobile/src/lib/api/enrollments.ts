import { apiGet, apiPost } from "@/src/lib/api-client";

/** A student's enrolments, and starting a new one. */

export interface StudentEnrollment {
  accessGranted: boolean;
  cancelledAt: string | null;
  category: { name: string; slug: string };
  completedAt: string | null;
  course: {
    coverImageUrl: string | null;
    id: string;
    price: string;
    slug: string;
    title: string;
  };
  enrolledAt: string;
  id: string;
  latestPaymentStatus: "PENDING" | "SUCCESS" | "FAILED" | "REFUNDED" | null;
  progressPercentage: number;
  status: "ACTIVE" | "COMPLETED";
}

export interface EnrollmentActionResponse {
  accessGranted: boolean;
  enrollmentId: string | null;
  payment: { gatewayUrl: string; id: string; isMock: boolean } | null;
  requiresPayment: boolean;
}

export async function listMyEnrollments(): Promise<readonly StudentEnrollment[]> {
  return apiGet<readonly StudentEnrollment[]>("enrollments/me");
}

export async function getMyCourseEnrollment(courseId: string): Promise<StudentEnrollment | null> {
  return apiGet<StudentEnrollment | null>(`enrollments/courses/${courseId}/me`);
}

export async function createEnrollment(input: {
  callbackOrigin?: string;
  /** A path on `callbackOrigin`. See `src/lib/payment.ts`. */
  callbackPath?: string;
  /** Checked and priced again server-side; the preview is only a quote. */
  couponCode?: string;
  courseId: string;
}): Promise<EnrollmentActionResponse> {
  return apiPost<typeof input, EnrollmentActionResponse>("enrollments", input);
}
