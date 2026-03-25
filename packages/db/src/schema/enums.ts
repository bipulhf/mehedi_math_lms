import { pgEnum } from "drizzle-orm/pg-core";

export const userRoleEnum = pgEnum("user_role", [
  "STUDENT",
  "TEACHER",
  "ACCOUNTANT",
  "ADMIN"
]);

export const courseStatusEnum = pgEnum("course_status", [
  "DRAFT",
  "PENDING",
  "PUBLISHED",
  "ARCHIVED"
]);

export const lectureTypeEnum = pgEnum("lecture_type", [
  "VIDEO_UPLOAD",
  "VIDEO_LINK",
  "TEXT"
]);

export const testTypeEnum = pgEnum("test_type", ["MCQ", "WRITTEN", "MIXED"]);

export const questionTypeEnum = pgEnum("question_type", ["MCQ", "WRITTEN"]);

export const testSubmissionStatusEnum = pgEnum("test_submission_status", [
  "STARTED",
  "SUBMITTED",
  "GRADED"
]);

export const enrollmentStatusEnum = pgEnum("enrollment_status", [
  "ACTIVE",
  "COMPLETED",
  "CANCELLED"
]);

export const paymentStatusEnum = pgEnum("payment_status", [
  "PENDING",
  "SUCCESS",
  "FAILED",
  "REFUNDED"
]);

export const paymentProviderEnum = pgEnum("payment_provider", ["SSLCOMMERZ"]);

export const bugReportStatusEnum = pgEnum("bug_report_status", [
  "OPEN",
  "IN_PROGRESS",
  "RESOLVED",
  "CLOSED"
]);

export const bugReportPriorityEnum = pgEnum("bug_report_priority", [
  "LOW",
  "MEDIUM",
  "HIGH"
]);

export const notificationTypeEnum = pgEnum("notification_type", [
  "SYSTEM",
  "COURSE",
  "NOTICE",
  "MESSAGE",
  "PAYMENT",
  "BUG_REPORT"
]);

export const deviceTypeEnum = pgEnum("device_type", ["WEB", "ANDROID", "IOS"]);

export const uploadPurposeEnum = pgEnum("upload_purpose", [
  "PROFILE_PHOTO",
  "BUG_SCREENSHOT",
  "COURSE_COVER",
  "COURSE_MATERIAL",
  "LECTURE_VIDEO"
]);

export const uploadKindEnum = pgEnum("upload_kind", ["IMAGE", "VIDEO", "DOCUMENT"]);

export const uploadStatusEnum = pgEnum("upload_status", [
  "PENDING",
  "READY",
  "FAILED"
]);
