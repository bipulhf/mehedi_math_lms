import type {
  BasicProfileInput,
  MarkingDocument,
  MarkingReviewMode,
  StudentProfileInput,
  TeacherProfileInput
} from "@genex/shared";

import {
  apiDelete,
  apiGet,
  apiGetPaginated,
  apiPatch,
  apiPost,
  apiPut,
  buildQueryString
} from "@/src/lib/api-client";

/**
 * One module for the endpoints the app uses. The response shapes mirror the
 * API's own view types; where a validator exists it comes from `@genex/shared`
 * rather than being redeclared.
 */

export interface CategoryNode {
  children: readonly CategoryNode[];
  id: string;
  name: string;
  slug: string;
}

export interface CourseSummary {
  category: { name: string; slug: string } | null;
  coverImageUrl: string | null;
  description: string;
  id: string;
  isExamOnly: boolean;
  price: string;
  slug: string;
  stats: {
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

export type CouponRejectionReason =
  | "NOT_FOUND"
  | "DISABLED"
  | "NOT_STARTED"
  | "EXPIRED"
  | "EXHAUSTED"
  | "ALREADY_USED"
  | "ALREADY_ENROLLED"
  | "COURSE_UNAVAILABLE"
  | "FREE_COURSE";

export interface CouponPreview {
  coupon: { code: string; id: string; kind: "FLAT" | "PERCENT"; value: string } | null;
  pricing: { discountAmount: string; listAmount: string; payable: string } | null;
  reason: CouponRejectionReason | null;
  status: "APPLIED" | "REJECTED";
}

export interface StudentEnrollment {
  accessGranted: boolean;
  cancelledAt: string | null;
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

export interface ContentMaterial {
  createdAt: string;
  fileSize: number;
  fileType: string;
  fileUrl: string;
  id: string;
  title: string;
  updatedAt: string;
}

export interface ContentLecture {
  chapterId: string;
  content: string | null;
  createdAt: string;
  description: string | null;
  id: string;
  isPreview: boolean;
  materials: readonly ContentMaterial[];
  sortOrder: number;
  title: string;
  type: "VIDEO_UPLOAD" | "VIDEO_LINK" | "TEXT";
  updatedAt: string;
  videoDuration: number | null;
  videoUrl: string | null;
}

export interface ContentChapter {
  courseId: string;
  createdAt: string;
  description: string | null;
  id: string;
  lectures: readonly ContentLecture[];
  materials: readonly ContentMaterial[];
  sortOrder: number;
  title: string;
  updatedAt: string;
}

/** The public outline — titles and lengths, no video and no materials. */
export interface CourseOutlineLesson {
  durationSeconds: number | null;
  id: string;
  isPreview: boolean;
  title: string;
}

export interface CourseOutlineChapter {
  id: string;
  lessons: readonly CourseOutlineLesson[];
  title: string;
}

/** A free lesson's playable body — served to anyone, no session needed. */
export interface CourseLecturePreview {
  content: string | null;
  description: string | null;
  durationSeconds: number | null;
  id: string;
  materials: readonly ContentMaterial[];
  title: string;
  type: "VIDEO_UPLOAD" | "VIDEO_LINK" | "TEXT";
  videoUrl: string | null;
}

export interface CourseProgressResponse {
  completedLectures: number;
  isCourseCompleted: boolean;
  lectures: readonly { isCompleted: boolean; lectureId: string }[];
  nextLectureId: string | null;
  progressPercentage: number;
  totalLectures: number;
}

export interface TestQuestionOption {
  id: string;
  isCorrect: boolean | null;
  optionText: string;
  sortOrder: number;
}

export interface TestQuestionImage {
  fileUrl: string;
  id: string;
  sortOrder: number;
}

export interface TestQuestion {
  id: string;
  images: readonly TestQuestionImage[];
  /** Staff only — the model answer. Null for a student. */
  markingGuide: string | null;
  marks: number;
  options: readonly TestQuestionOption[];
  questionText: string;
  sortOrder: number;
}

export interface AssessmentTestSummary {
  attemptsRemaining: number | null;
  attemptsUsed: number | null;
  chapterId: string;
  description: string | null;
  durationInMinutes: number | null;
  id: string;
  isPublished: boolean;
  lockAnswerOnSelect: boolean;
  maxAttempts: number | null;
  passingScore: number | null;
  questionCount: number;
  sortOrder: number;
  title: string;
  totalMarks: number;
  type: "MCQ" | "WRITTEN";
}

export interface AssessmentChapterSummary {
  chapterId: string;
  chapterTitle: string;
  tests: readonly AssessmentTestSummary[];
}

export interface AssessmentTestDetail extends AssessmentTestSummary {
  questions: readonly TestQuestion[];
}

export interface ScriptPageView {
  fileUrl: string;
  height: number | null;
  id: string;
  marking: MarkingDocument;
  sortOrder: number;
  width: number | null;
}

export interface SubmissionAnswerView {
  awardedMarks: number | null;
  id: string;
  isCorrect: boolean | null;
  questionId: string;
  scriptPages: readonly ScriptPageView[];
  selectedOptionId: string | null;
}

export interface SubmissionSummary {
  attemptNumber: number;
  createdAt: string;
  feedback: string | null;
  gradedAt: string | null;
  id: string;
  maxScore: number | null;
  passed: boolean | null;
  score: number | null;
  startedAt: string | null;
  status: "STARTED" | "SUBMITTED" | "GRADED";
  submittedAt: string | null;
}

export interface SubmissionDetail extends SubmissionSummary {
  answers: readonly SubmissionAnswerView[];
  gradedById: string | null;
  testId: string;
}

export interface MessageParticipant {
  id: string;
  image: string | null;
  isOnline: boolean;
  name: string;
  role: "STUDENT" | "TEACHER" | "ACCOUNTANT" | "ADMIN";
}

export interface ConversationMessage {
  content: string;
  conversationId: string;
  createdAt: string;
  id: string;
  isHidden: boolean;
  isOwn: boolean;
  readAt: string | null;
  sender: MessageParticipant;
  senderId: string;
}

export interface MessageConversation {
  id: string;
  lastMessage: ConversationMessage | null;
  lastMessageAt: string | null;
  unreadCount: number;
  user: MessageParticipant;
}

export interface ConversationThread {
  conversation: MessageConversation;
  items: readonly ConversationMessage[];
  nextCursor: string | null;
}

export interface LectureComment {
  content: string | null;
  createdAt: string;
  id: string;
  isDeleted: boolean;
  isEditable: boolean;
  isOwn: boolean;
  lectureId: string;
  parentId: string | null;
  replies: readonly LectureComment[];
  updatedAt: string;
  user: MessageParticipant;
}

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

export interface CourseNotice {
  author: { id: string; name: string };
  content: string;
  courseId: string;
  createdAt: string;
  id: string;
  isPinned: boolean;
  title: string;
  updatedAt: string;
}

export interface BugReportRecord {
  adminNotes: string | null;
  createdAt: string;
  description: string;
  id: string;
  priority: "LOW" | "MEDIUM" | "HIGH";
  screenshotUrl: string | null;
  status: "OPEN" | "IN_PROGRESS" | "RESOLVED" | "CLOSED";
  title: string;
  updatedAt: string;
}

export interface NotificationRecord {
  body: string;
  createdAt: string;
  data: Record<string, string | number | boolean | null> | null;
  id: string;
  readAt: string | null;
  title: string;
  type: "NOTICE" | "PAYMENT" | "COURSE" | "MESSAGE" | "BUG_REPORT" | "SYSTEM";
}

export interface PaymentHistoryItem {
  amount: string;
  course: { id: string; title: string };
  createdAt: string;
  currency: string;
  enrollmentId: string | null;
  id: string;
  paidAt: string | null;
  refundedAt: string | null;
  status: "PENDING" | "SUCCESS" | "FAILED" | "REFUNDED";
  transactionId: string;
}

export interface StudentProfileFields {
  address: string | null;
  classOrGrade: string | null;
  dateOfBirth: string | null;
  guardianName: string | null;
  guardianPhone: string | null;
  institution: string | null;
  phone: string | null;
  profilePhoto: string | null;
}

export interface TeacherProfileFields {
  bio: string | null;
  phone: string | null;
  profilePhoto: string | null;
  qualifications: string | null;
  socialLinks: string | null;
  specializations: string | null;
}

/**
 * The shape `GET /profiles/me` actually answers with — the user record and
 * whichever role-specific block applies, not a flattened summary.
 */
export interface OwnProfile {
  studentProfile: StudentProfileFields | null;
  teacherProfile: TeacherProfileFields | null;
  user: {
    email: string;
    id: string;
    image: string | null;
    isActive: boolean;
    name: string;
    profileCompleted: boolean;
    role: "STUDENT" | "TEACHER" | "ACCOUNTANT" | "ADMIN";
    slug: string | null;
  };
}

export async function listCategories(): Promise<readonly CategoryNode[]> {
  return apiGet<readonly CategoryNode[]>("categories");
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

export async function getCourseContent(courseId: string): Promise<readonly ContentChapter[]> {
  return apiGet<readonly ContentChapter[]>(`courses/${courseId}/content`);
}

/** The public outline — titles and lengths, no video and no materials. */
export async function getCourseOutline(courseId: string): Promise<readonly CourseOutlineChapter[]> {
  return apiGet<readonly CourseOutlineChapter[]>(`courses/${courseId}/outline`);
}

/** A single free lesson, playable without an account. */
export async function getLecturePreview(lectureId: string): Promise<CourseLecturePreview> {
  return apiGet<CourseLecturePreview>(`lectures/${lectureId}/preview`);
}

export async function getCourseProgress(courseId: string): Promise<CourseProgressResponse> {
  return apiGet<CourseProgressResponse>(`courses/${courseId}/progress`);
}

export async function markLectureComplete(lectureId: string): Promise<void> {
  await apiPost(`progress/${lectureId}/complete`);
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

/**
 * Checks a code without committing to it. Answers either way — a refusal is a
 * reason the screen renders in Bangla, not a thrown error. ADR-0013.
 */
export async function previewCoupon(input: {
  code: string;
  courseId: string;
}): Promise<CouponPreview> {
  return apiPost<typeof input, CouponPreview>("coupons/preview", input);
}

export async function getCourseAssessments(
  courseId: string
): Promise<readonly AssessmentChapterSummary[]> {
  return apiGet<readonly AssessmentChapterSummary[]>(`courses/${courseId}/tests`);
}

export async function getTestDetail(
  testId: string,
  revealAnswers = false
): Promise<AssessmentTestDetail> {
  return apiGet<AssessmentTestDetail>(
    `tests/${testId}${revealAnswers ? "?revealAnswers=true" : ""}`
  );
}

export async function startSubmission(testId: string): Promise<SubmissionDetail> {
  return apiPost<undefined, SubmissionDetail>(`tests/${testId}/submissions/start`);
}

export async function saveSubmissionAnswers(
  submissionId: string,
  input: {
    answers: readonly {
      questionId: string;
      selectedOptionId?: string | undefined;
    }[];
  }
): Promise<SubmissionDetail> {
  return apiPut<typeof input, SubmissionDetail>(`tests/submissions/${submissionId}/answers`, input);
}

/** Submitting is keyed on the *test*, and carries the answers with it. */
export async function submitTest(
  testId: string,
  input: {
    answers: readonly {
      questionId: string;
      selectedOptionId?: string | undefined;
    }[];
  }
): Promise<SubmissionDetail> {
  return apiPost<typeof input, SubmissionDetail>(`tests/${testId}/submit`, input);
}

/** The results screen. Returns the graded submission with per-answer marks. */
export async function getSubmissionDetail(submissionId: string): Promise<SubmissionDetail> {
  return apiGet<SubmissionDetail>(`tests/submissions/${submissionId}`);
}

/** Adds one photographed page to a question's Answer Script. */
export async function addScriptPage(
  submissionId: string,
  input: { questionId: string; uploadId: string }
): Promise<readonly ScriptPageView[]> {
  return apiPost<typeof input, readonly ScriptPageView[]>(
    `scripts/submissions/${submissionId}/pages`,
    input
  );
}

export async function reorderScriptPages(
  submissionId: string,
  input: { pageIds: readonly string[]; questionId: string }
): Promise<readonly ScriptPageView[]> {
  return apiPatch<typeof input, readonly ScriptPageView[]>(
    `scripts/submissions/${submissionId}/pages/order`,
    input
  );
}

export async function removeScriptPage(pageId: string): Promise<{ id: string }> {
  return apiDelete<{ id: string }>(`scripts/pages/${pageId}`);
}

export interface MarkingQuestionView {
  answerId: string | null;
  awardedMarks: number | null;
  id: string;
  lockedByName: string | null;
  markingGuide: string | null;
  marks: number;
  pageCount: number;
  questionText: string;
  sortOrder: number;
}

export interface MarkingPaperView {
  attemptNumber: number;
  isComplete: boolean;
  markedCount: number;
  questions: readonly MarkingQuestionView[];
  status: "STARTED" | "SUBMITTED" | "GRADED";
  student: { email: string; id: string; name: string };
  submissionId: string;
  toMarkCount: number;
}

export interface MarkingQueueView {
  mode: MarkingReviewMode;
  papers: readonly MarkingPaperView[];
  testId: string;
  testTitle: string;
  totalMarks: number;
}

export interface MarkingAnswerView {
  awardedMarks: number | null;
  id: string;
  lockedByName: string | null;
  markingGuide: string | null;
  marks: number;
  pages: readonly ScriptPageView[];
  questionId: string;
  questionText: string;
  student: { id: string; name: string };
  submissionId: string;
}

export async function getMarkingQueue(
  testId: string,
  mode: MarkingReviewMode
): Promise<MarkingQueueView> {
  return apiGet<MarkingQueueView>(`scripts/tests/${testId}/marking?mode=${mode}`);
}

/** Opening an answer claims it, so two teachers cannot mark the same one at once. */
export async function claimAnswer(answerId: string): Promise<MarkingAnswerView> {
  return apiPost<undefined, MarkingAnswerView>(`scripts/answers/${answerId}/claim`);
}

export async function renewAnswerClaim(answerId: string): Promise<{ expiresInMs: number }> {
  return apiPatch<Record<string, never>, { expiresInMs: number }>(
    `scripts/answers/${answerId}/claim`,
    {}
  );
}

export async function releaseAnswerClaim(answerId: string): Promise<{ id: string }> {
  return apiDelete<{ id: string }>(`scripts/answers/${answerId}/claim`);
}

export async function setAnswerMark(
  answerId: string,
  input: { awardedMarks: number }
): Promise<{ awardedMarks: number; id: string }> {
  return apiPut<typeof input, { awardedMarks: number; id: string }>(
    `scripts/answers/${answerId}/mark`,
    input
  );
}

export async function saveScriptPageMarking(
  pageId: string,
  marking: MarkingDocument
): Promise<{ id: string }> {
  return apiPut<{ marking: MarkingDocument }, { id: string }>(`scripts/pages/${pageId}/marking`, {
    marking
  });
}

export async function submitPaper(
  submissionId: string,
  input: { feedback?: string | undefined }
): Promise<{ score: number; submissionId: string }> {
  return apiPost<typeof input, { score: number; submissionId: string }>(
    `scripts/submissions/${submissionId}/marking/submit`,
    input
  );
}

/** Every attempt the current student has made on this test, oldest first. */
export async function listMySubmissions(testId: string): Promise<readonly SubmissionSummary[]> {
  return apiGet<readonly SubmissionSummary[]>(`tests/${testId}/submissions/mine`);
}

export async function listLectureComments(lectureId: string): Promise<readonly LectureComment[]> {
  const response = await apiGetPaginated<LectureComment>(
    `lectures/${lectureId}/comments${buildQueryString({ limit: 50, page: 1 })}`
  );

  return response.data;
}

export async function createLectureComment(input: {
  content: string;
  lectureId: string;
  parentId?: string | undefined;
}): Promise<LectureComment> {
  return apiPost<{ content: string; parentId?: string | undefined }, LectureComment>(
    `lectures/${input.lectureId}/comments`,
    { content: input.content, parentId: input.parentId }
  );
}

export async function updateLectureComment(id: string, content: string): Promise<LectureComment> {
  return apiPut<{ content: string }, LectureComment>(`comments/${id}`, { content });
}

export async function deleteLectureComment(id: string): Promise<{ id: string }> {
  return apiDelete<{ id: string }>(`comments/${id}`);
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

export async function listCourseNotices(courseId: string): Promise<readonly CourseNotice[]> {
  const data = await apiGet<{ items: readonly CourseNotice[] }>(`courses/${courseId}/notices`);

  return data.items;
}

export async function createBugReport(input: {
  description: string;
  title: string;
}): Promise<BugReportRecord> {
  return apiPost<typeof input, BugReportRecord>("bugs", input);
}

export async function listMyBugReports(): Promise<readonly BugReportRecord[]> {
  return apiGet<readonly BugReportRecord[]>("bugs/me");
}

export async function listConversations(): Promise<readonly MessageConversation[]> {
  return apiGet<readonly MessageConversation[]>("messages/conversations");
}

export async function searchMessageParticipants(
  search: string
): Promise<readonly MessageParticipant[]> {
  return apiGet<readonly MessageParticipant[]>(
    `messages/participants${buildQueryString({ limit: 20, search })}`
  );
}

export async function createConversation(input: {
  participantId: string;
}): Promise<MessageConversation> {
  return apiPost<{ participantId: string }, MessageConversation>("messages/conversations", input);
}

export async function getConversation(conversationId: string): Promise<ConversationThread> {
  return apiGet<ConversationThread>(
    `messages/conversations/${conversationId}${buildQueryString({ limit: 40 })}`
  );
}

export async function sendMessage(
  conversationId: string,
  content: string
): Promise<ConversationMessage> {
  return apiPost<{ content: string }, ConversationMessage>(
    `messages/conversations/${conversationId}`,
    { content }
  );
}

export async function markConversationRead(conversationId: string): Promise<void> {
  await apiPost(`messages/conversations/${conversationId}/read`);
}

export async function reportConversation(
  conversationId: string,
  reason: string
): Promise<{ id: string }> {
  return apiPost<{ reason: string }, { id: string }>(
    `messages/conversations/${conversationId}/report`,
    { reason }
  );
}

export async function listNotifications(): Promise<{ items: readonly NotificationRecord[] }> {
  return apiGet<{ items: readonly NotificationRecord[] }>(
    `notifications${buildQueryString({ limit: 30, page: 1 })}`
  );
}

export async function getNotificationUnreadCount(): Promise<number> {
  const data = await apiGet<{ count: number }>("notifications/unread-count");

  return data.count;
}

export async function markNotificationRead(notificationId: string): Promise<void> {
  await apiPut(`notifications/${notificationId}/read`, {});
}

export async function markAllNotificationsRead(): Promise<{ updated: number }> {
  return apiPut<Record<string, never>, { updated: number }>("notifications/read-all", {});
}

export async function listMyPayments(): Promise<readonly PaymentHistoryItem[]> {
  return apiGet<readonly PaymentHistoryItem[]>("payments/me");
}

export async function registerPushToken(input: {
  deviceType: "ANDROID" | "IOS" | "WEB";
  token: string;
}): Promise<void> {
  await apiPost("notifications/register-device", input);
}

export async function getOwnProfile(): Promise<OwnProfile> {
  return apiGet<OwnProfile>("profiles/me");
}

/**
 * One endpoint for every role: the API picks the schema from the session's role
 * rather than from anything sent here, so the caller sends the shape that
 * matches its own role and nothing else.
 */
export async function updateOwnProfile(
  input: BasicProfileInput | StudentProfileInput | TeacherProfileInput
): Promise<OwnProfile> {
  return apiPut<typeof input, OwnProfile>("profiles/me", input);
}
