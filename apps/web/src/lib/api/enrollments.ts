import { createEnrollmentSchema } from "@mma/shared";
import type { z } from "zod";

import { apiGet, apiPost } from "@/lib/api/client";

export type CreateEnrollmentInput = z.infer<typeof createEnrollmentSchema>;

export interface EnrollmentAction {
  accessGranted: boolean;
  enrollmentId: string;
  payment: {
    gatewayUrl: string;
    id: string;
    isMock: boolean;
    status: "PENDING" | "SUCCESS" | "FAILED" | "REFUNDED";
    transactionId: string;
  } | null;
  requiresPayment: boolean;
}

export interface StudentEnrollment {
  accessGranted: boolean;
  category: {
    name: string;
    slug: string;
  };
  course: {
    coverImageUrl: string | null;
    id: string;
    price: string;
    slug: string;
    status: "DRAFT" | "PENDING" | "PUBLISHED" | "ARCHIVED";
    title: string;
  };
  enrolledAt: string;
  id: string;
  latestPaymentStatus: "PENDING" | "SUCCESS" | "FAILED" | "REFUNDED" | null;
  progressPercentage: number;
  status: "ACTIVE" | "COMPLETED" | "CANCELLED";
}

export async function createEnrollment(values: CreateEnrollmentInput): Promise<EnrollmentAction> {
  const response = await apiPost<CreateEnrollmentInput, EnrollmentAction>("enrollments", values);

  return response.data;
}

export async function listMyEnrollments(): Promise<readonly StudentEnrollment[]> {
  const response = await apiGet<readonly StudentEnrollment[]>("enrollments/me");

  return response.data;
}

export async function getMyCourseEnrollment(courseId: string): Promise<StudentEnrollment | null> {
  const response = await apiGet<StudentEnrollment | null>(`enrollments/courses/${courseId}/me`);

  return response.data;
}
