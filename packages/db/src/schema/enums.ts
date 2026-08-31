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

// A Test is one kind for its whole life -- there is no mixed paper, and no
// per-question type to keep in step with this one. ADR-0008.
export const testTypeEnum = pgEnum("test_type", ["MCQ", "WRITTEN"]);

export const testSubmissionStatusEnum = pgEnum("test_submission_status", [
  "STARTED",
  "SUBMITTED",
  "GRADED"
]);

// Authority over a course. OWNER controls the roster, price, and catalog
// standing; TEACHER works on content. ADR-0006.
export const courseTeacherRoleEnum = pgEnum("course_teacher_role", ["OWNER", "TEACHER"]);

// Progress only. Withdrawal of the right to study is enrollments.cancelled_at,
// not a status — a refunded student who finished stays COMPLETED. ADR-0001.
export const enrollmentStatusEnum = pgEnum("enrollment_status", [
  "ACTIVE",
  "COMPLETED"
]);

export const paymentStatusEnum = pgEnum("payment_status", [
  "PENDING",
  "SUCCESS",
  "FAILED",
  "REFUNDED"
]);

// COUPON is not a gateway. It marks a purchase that settled locally because a
// coupon took the Payable to zero -- there was nothing to collect. ADR-0013.
export const paymentProviderEnum = pgEnum("payment_provider", ["SSLCOMMERZ", "COUPON"]);

// How a coupon computes its discount. A coupon is one kind for its whole life.
export const couponKindEnum = pgEnum("coupon_kind", ["FLAT", "PERCENT"]);

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
  "LECTURE_VIDEO",
  "QUESTION_IMAGE",
  // A photographed page of a student's Answer Script. Stored sized-down only --
  // the camera's original never reaches the bucket. ADR-0009.
  "ANSWER_SCRIPT_PAGE"
]);

export const uploadKindEnum = pgEnum("upload_kind", ["IMAGE", "VIDEO", "DOCUMENT"]);

export const uploadStatusEnum = pgEnum("upload_status", [
  "PENDING",
  "READY",
  "FAILED"
]);

export const storageProviderEnum = pgEnum("storage_provider", ["s3", "uploadthing"]);

export const smsBatchStatusEnum = pgEnum("sms_batch_status", [
  "QUEUED",
  "SENDING",
  "COMPLETED",
  "FAILED"
]);

export const smsRecipientStatusEnum = pgEnum("sms_recipient_status", [
  "PENDING",
  "SENT",
  "FAILED",
  "SKIPPED_NO_PHONE"
]);

export const smsTargetKindEnum = pgEnum("sms_target_kind", ["ALL_STUDENTS", "ROLE", "COURSE"]);

// A curated set of on-brand backgrounds, not a free colour picker -- each one
// is paired with a text colour that is already known to read on it.
export const bannerPresetEnum = pgEnum("banner_preset", [
  "INK",
  "ORANGE",
  "CYAN",
  "YELLOW",
  "SPECTRUM"
]);

/**
 * Where a student's challenge against their marked script stands.
 *
 * There is no DECLINED: the teacher answers a challenge by marking the paper
 * again and handing it back, whether or not the score moves. What the student
 * is owed is the second look, and RESOLVED records that it happened.
 */
export const scriptChallengeStatusEnum = pgEnum("script_challenge_status", ["OPEN", "RESOLVED"]);
