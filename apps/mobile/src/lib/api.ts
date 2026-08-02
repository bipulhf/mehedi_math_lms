import { apiGet, apiGetPaginated, apiPost, apiPut, buildQueryString } from "@/src/lib/api-client";

/**
 * One module for the endpoints the app uses. The response shapes mirror the
 * API's own view types; where a validator exists it comes from `@mma/shared`
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
  status: "DRAFT" | "PENDING" | "PUBLISHED" | "ARCHIVED";
  title: string;
}

export interface CourseTeacher {
  id: string;
  name: string;
  role?: "OWNER" | "TEACHER";
}

export interface CourseDetail extends CourseSummary {
  creator: { id: string; name: string };
  teachers: readonly CourseTeacher[];
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
  progressPercentage: number;
  status: "ACTIVE" | "COMPLETED";
}

export interface EnrollmentActionResponse {
  accessGranted: boolean;
  enrollmentId: string | null;
  payment: { gatewayUrl: string; id: string; isMock: boolean } | null;
  requiresPayment: boolean;
}

export interface ContentLecture {
  description: string | null;
  durationInSeconds: number | null;
  id: string;
  title: string;
  videoUrl: string | null;
}

export interface ContentChapter {
  id: string;
  lectures: readonly ContentLecture[];
  title: string;
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
  text: string;
}

export interface TestQuestion {
  id: string;
  marks: number;
  options: readonly TestQuestionOption[];
  prompt: string;
  type: "MCQ" | "WRITTEN";
}

export interface AssessmentTestDetail {
  durationInMinutes: number | null;
  id: string;
  isPublished: boolean;
  passingScore: number | null;
  questions: readonly TestQuestion[];
  title: string;
  type: "MCQ" | "WRITTEN" | "MIXED";
}

export interface AssessmentChapterSummary {
  chapterId: string;
  chapterTitle: string;
  tests: readonly { id: string; isPublished: boolean; title: string }[];
}

export interface SubmissionAnswer {
  id: string;
  questionId: string;
  selectedOptionId: string | null;
  writtenAnswer: string | null;
}

export interface SubmissionDetail {
  answers: readonly SubmissionAnswer[];
  id: string;
  startedAt: string | null;
  status: "IN_PROGRESS" | "SUBMITTED" | "GRADED";
  totalMarks: number | null;
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

export interface NotificationRecord {
  body: string;
  createdAt: string;
  id: string;
  readAt: string | null;
  title: string;
  type: "NOTICE" | "PAYMENT" | "COURSE" | "MESSAGE" | "BUG_REPORT" | "SYSTEM";
}

export interface OwnProfile {
  email: string;
  id: string;
  isProfileComplete: boolean;
  name: string;
  role: "STUDENT" | "TEACHER" | "ACCOUNTANT" | "ADMIN";
}

export async function listCategories(): Promise<readonly CategoryNode[]> {
  return apiGet<readonly CategoryNode[]>("categories");
}

export async function listCourses(query: {
  categoryId?: string | undefined;
  limit?: number;
  page?: number;
  search?: string | undefined;
}): Promise<{ items: readonly CourseSummary[]; pages: number }> {
  const response = await apiGetPaginated<CourseSummary>(
    `courses${buildQueryString({
      categoryId: query.categoryId,
      limit: query.limit ?? 20,
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
  courseId: string;
}): Promise<EnrollmentActionResponse> {
  return apiPost<typeof input, EnrollmentActionResponse>("enrollments", input);
}

export async function getCourseAssessments(
  courseId: string
): Promise<readonly AssessmentChapterSummary[]> {
  return apiGet<readonly AssessmentChapterSummary[]>(`courses/${courseId}/tests`);
}

export async function getTestDetail(testId: string): Promise<AssessmentTestDetail> {
  return apiGet<AssessmentTestDetail>(`tests/${testId}`);
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
      writtenAnswer?: string | undefined;
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
      writtenAnswer?: string | undefined;
    }[];
  }
): Promise<SubmissionDetail> {
  return apiPost<typeof input, SubmissionDetail>(`tests/${testId}/submit`, input);
}

export async function listConversations(): Promise<readonly MessageConversation[]> {
  return apiGet<readonly MessageConversation[]>("messages/conversations");
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

export async function registerPushToken(input: {
  deviceType: "ANDROID" | "IOS" | "WEB";
  token: string;
}): Promise<void> {
  await apiPost("notifications/register-device", input);
}

export async function getOwnProfile(): Promise<OwnProfile> {
  return apiGet<OwnProfile>("profiles/me");
}
