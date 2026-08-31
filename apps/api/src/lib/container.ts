import { AdminController } from "@/controllers/admin-controller";
import { AnalyticsController } from "@/controllers/analytics-controller";
import { AnswerScriptController } from "@/controllers/answer-script-controller";
import { AuditLogController } from "@/controllers/audit-log-controller";
import { AdminDashboardController } from "@/controllers/admin-dashboard-controller";
import { AdminUserController } from "@/controllers/admin-user-controller";
import { AuthController } from "@/controllers/auth-controller";
import { BannerController } from "@/controllers/banner-controller";
import { BugReportController } from "@/controllers/bug-report-controller";
import { CategoryController } from "@/controllers/category-controller";
import { CommentController } from "@/controllers/comment-controller";
import { ContentController } from "@/controllers/content-controller";
import { CouponController } from "@/controllers/coupon-controller";
import { CourseController } from "@/controllers/course-controller";
import { EnrollmentController } from "@/controllers/enrollment-controller";
import { HealthController } from "@/controllers/health-controller";
import { LandingController } from "@/controllers/landing-controller";
import { MessageController } from "@/controllers/message-controller";
import { CourseRoutineController } from "@/controllers/course-routine-controller";
import { NoticeController } from "@/controllers/notice-controller";
import { NotificationController } from "@/controllers/notification-controller";
import { SmsController } from "@/controllers/sms-controller";
import { PaymentController } from "@/controllers/payment-controller";
import { ReviewController } from "@/controllers/review-controller";
import { ProgressController } from "@/controllers/progress-controller";
import { ProfileController } from "@/controllers/profile-controller";
import { TestController } from "@/controllers/test-controller";
import { UploadController } from "@/controllers/upload-controller";
import { queues } from "@/lib/queues";
import { env } from "@/lib/env";
import { redis } from "@/lib/redis";
import { AdminDashboardRepository } from "@/repositories/admin-dashboard-repository";
import { AnalyticsRepository } from "@/repositories/analytics-repository";
import { AnswerScriptRepository } from "@/repositories/answer-script-repository";
import { AuditLogRepository } from "@/repositories/audit-log-repository";
import { AdminUserRepository } from "@/repositories/admin-user-repository";
import { AuthSessionRepository } from "@/repositories/auth-session-repository";
import { BannerRepository } from "@/repositories/banner-repository";
import { BugReportRepository } from "@/repositories/bug-report-repository";
import { CategoryRepository } from "@/repositories/category-repository";
import { CommentRepository } from "@/repositories/comment-repository";
import { ContentRepository } from "@/repositories/content-repository";
import { CouponRepository } from "@/repositories/coupon-repository";
import { CourseRepository } from "@/repositories/course-repository";
import { EnrollmentRepository } from "@/repositories/enrollment-repository";
import { HealthRepository } from "@/repositories/health-repository";
import { LandingRepository } from "@/repositories/landing-repository";
import { ConversationReportRepository } from "@/repositories/conversation-report-repository";
import { MessageRepository } from "@/repositories/message-repository";
import { CourseRoutineRepository } from "@/repositories/course-routine-repository";
import { NoticeRepository } from "@/repositories/notice-repository";
import { NotificationRepository } from "@/repositories/notification-repository";
import { PaymentRepository } from "@/repositories/payment-repository";
import { ProfileRepository } from "@/repositories/profile-repository";
import { ReviewRepository } from "@/repositories/review-repository";
import { SeoRepository } from "@/repositories/seo-repository";
import { SmsRepository } from "@/repositories/sms-repository";
import { StaffAccountRepository } from "@/repositories/staff-account-repository";
import { TestRepository } from "@/repositories/test-repository";
import { UploadRepository } from "@/repositories/upload-repository";
import { AdminDashboardService } from "@/services/admin-dashboard-service";
import { AnalyticsService } from "@/services/analytics-service";
import { AnswerScriptService } from "@/services/answer-script-service";
import { PaperMarkingService } from "@/services/paper-marking-service";
import { TestSubmissionService } from "@/services/test-submission-service";
import { AuditLogService } from "@/services/audit-log-service";
import { AssessmentAccessGuards } from "@/services/assessment-access-guards";
import { AdminUserService } from "@/services/admin-user-service";
import { AuthGuardService } from "@/services/auth-guard-service";
import { BannerService } from "@/services/banner-service";
import { BugReportService } from "@/services/bug-report-service";
import { CategoryService } from "@/services/category-service";
import { CommentService } from "@/services/comment-service";
import { CommerceService } from "@/services/commerce-service";
import { EnrollmentPdfService } from "@/services/enrollment-pdf-service";
import { ContentService } from "@/services/content-service";
import { CouponService } from "@/services/coupon-service";
import { CourseService } from "@/services/course-service";
import { HealthService } from "@/services/health-service";
import { FcmPushService } from "@/services/fcm-push-service";
import { MessageRealtimeService } from "@/services/message-realtime-service";
import { MessageService } from "@/services/message-service";
import { CourseRoutineService } from "@/services/course-routine-service";
import { NoticeService } from "@/services/notice-service";
import { NotificationRealtimeService } from "@/services/notification-realtime-service";
import { NotificationService } from "@/services/notification-service";
import { LandingService } from "@/services/landing-service";
import { OgImageService } from "@/services/og-image-service";
import { OnecodesoftSmsProvider } from "@/services/onecodesoft-sms-provider";
import { SmsService } from "@/services/sms-service";
import { ProgressService } from "@/services/progress-service";
import { ProfileService } from "@/services/profile-service";
import { ReviewService } from "@/services/review-service";
import { SitemapService } from "@/services/sitemap-service";
import { SslCommerzService } from "@/services/sslcommerz-service";
import { StaffAccountService } from "@/services/staff-account-service";
import { TestService } from "@/services/test-service";
import { UploadService } from "@/services/upload-service";
import { S3StorageProvider } from "@/services/s3-storage-provider";
import { UploadThingStorageProvider } from "@/services/uploadthing-storage-provider";

const healthRepository = new HealthRepository(redis, queues);
const adminDashboardRepository = new AdminDashboardRepository();
const auditLogRepository = new AuditLogRepository();
export const auditLogService = new AuditLogService(auditLogRepository);
const adminUserRepository = new AdminUserRepository();
const authSessionRepository = new AuthSessionRepository();
const bannerRepository = new BannerRepository();
const bugReportRepository = new BugReportRepository();
const categoryRepository = new CategoryRepository();
const commentRepository = new CommentRepository();
const contentRepository = new ContentRepository();
const courseRepository = new CourseRepository();
const enrollmentRepository = new EnrollmentRepository();
const messageRepository = new MessageRepository();
const conversationReportRepository = new ConversationReportRepository();
const notificationRepository = new NotificationRepository();
const noticeRepository = new NoticeRepository();
const courseRoutineRepository = new CourseRoutineRepository();
const smsRepository = new SmsRepository();
const profileRepository = new ProfileRepository();
const paymentRepository = new PaymentRepository();
const reviewRepository = new ReviewRepository();
const seoRepository = new SeoRepository();
const analyticsRepository = new AnalyticsRepository();
const staffAccountRepository = new StaffAccountRepository();
const testRepository = new TestRepository();
const uploadRepository = new UploadRepository();
const adminDashboardService = new AdminDashboardService(adminDashboardRepository);
const healthService = new HealthService(healthRepository);
const authGuardService = new AuthGuardService(authSessionRepository);
// Null means local-only delivery and an in-process presence map. Read from
// `env` rather than `process.env`, which this used to do -- the repo's own rule,
// and the reason the switch would not otherwise reach these two.
const realtimeRedisUrl = env.isRedisEnabled ? env.REDIS_URL : null;
const messageRealtimeService = new MessageRealtimeService(realtimeRedisUrl);
const notificationRealtimeService = new NotificationRealtimeService(realtimeRedisUrl);
const fcmPushService = new FcmPushService();
const messageService = new MessageService(
  messageRepository,
  conversationReportRepository,
  messageRealtimeService
);
const notificationService = new NotificationService(
  notificationRepository,
  enrollmentRepository,
  courseRepository,
  notificationRealtimeService,
  fcmPushService
);
const onecodesoftSmsProvider = new OnecodesoftSmsProvider();
const smsService = new SmsService(smsRepository, courseRepository, onecodesoftSmsProvider);
const noticeService = new NoticeService(
  noticeRepository,
  courseRepository,
  enrollmentRepository,
  notificationService
);
const courseRoutineService = new CourseRoutineService(
  courseRoutineRepository,
  courseRepository,
  enrollmentRepository
);
const staffAccountService = new StaffAccountService(staffAccountRepository);
const adminUserService = new AdminUserService(
  adminUserRepository,
  authSessionRepository,
  staffAccountService
);
const bannerService = new BannerService(bannerRepository);
const bugReportService = new BugReportService(bugReportRepository, notificationService);
const categoryService = new CategoryService(categoryRepository);
const commentService = new CommentService(
  commentRepository,
  contentRepository,
  courseRepository,
  enrollmentRepository
);
const sslCommerzService = new SslCommerzService();
const couponRepository = new CouponRepository();
const couponService = new CouponService(couponRepository, courseRepository, enrollmentRepository);
const commerceService = new CommerceService(
  enrollmentRepository,
  paymentRepository,
  courseRepository,
  profileRepository,
  sslCommerzService,
  reviewRepository,
  notificationService,
  couponService
);
const enrollmentPdfService = new EnrollmentPdfService(enrollmentRepository, paymentRepository);
const reviewService = new ReviewService(reviewRepository, enrollmentRepository, courseRepository);
const analyticsService = new AnalyticsService(analyticsRepository, courseRepository);
const contentService = new ContentService(
  contentRepository,
  courseRepository,
  enrollmentRepository
);
const courseService = new CourseService(
  courseRepository,
  categoryRepository,
  notificationService,
  couponRepository
);
const profileService = new ProfileService(profileRepository);
const progressService = new ProgressService(
  enrollmentRepository,
  contentRepository,
  testRepository
);
// TestService promotes an enrolment through ProgressService once grading
// finishes, which is how an Exam-Only Course completes at all. ADR-0005.
const assessmentAccessGuards = new AssessmentAccessGuards(
  testRepository,
  contentRepository,
  courseRepository,
  enrollmentRepository
);
const answerScriptRepository = new AnswerScriptRepository();
const testSubmissionService = new TestSubmissionService(
  testRepository,
  answerScriptRepository,
  contentRepository,
  enrollmentRepository,
  assessmentAccessGuards,
  progressService
);
const testService = new TestService(
  testRepository,
  answerScriptRepository,
  contentRepository,
  enrollmentRepository,
  assessmentAccessGuards,
  progressService,
  testSubmissionService
);
const answerScriptService = new AnswerScriptService(
  testRepository,
  answerScriptRepository,
  uploadRepository
);
// Marking promotes an enrolment through the submission service once a paper is
// submitted, which is how an Exam-Only Course of written papers completes.
const paperMarkingService = new PaperMarkingService(
  testRepository,
  answerScriptRepository,
  assessmentAccessGuards,
  testSubmissionService,
  notificationService
);
const uploadService = new UploadService(
  uploadRepository,
  {
    s3: new S3StorageProvider(),
    uploadthing: new UploadThingStorageProvider()
  },
  env.STORAGE_PROVIDER
);
export const sitemapService = new SitemapService(seoRepository, redis);
export const ogImageService = new OgImageService(courseRepository, profileRepository);
const landingRepository = new LandingRepository();
const landingService = new LandingService(landingRepository, courseRepository, redis);

export const adminController = new AdminController(staffAccountService);
export const auditLogController = new AuditLogController(auditLogService);
export const adminDashboardController = new AdminDashboardController(adminDashboardService);
export const adminUserController = new AdminUserController(adminUserService);
export const authController = new AuthController();
export { authGuardService };
export const bannerController = new BannerController(bannerService);
export const bugReportController = new BugReportController(bugReportService);
export const categoryController = new CategoryController(categoryService);
export const commentController = new CommentController(commentService);
export const contentController = new ContentController(contentService);
export const couponController = new CouponController(couponService);
export const courseController = new CourseController(courseService);
export const analyticsController = new AnalyticsController(analyticsService);
export const enrollmentController = new EnrollmentController(commerceService, enrollmentPdfService);
export const reviewController = new ReviewController(reviewService);
export const healthController = new HealthController(healthService);
export const landingController = new LandingController(landingService);
export const messageController = new MessageController(messageService);
export const notificationController = new NotificationController(notificationService);
export const noticeController = new NoticeController(noticeService);
export const courseRoutineController = new CourseRoutineController(courseRoutineService);
export const smsController = new SmsController(smsService);
export {
  fcmPushService,
  messageRealtimeService,
  messageService,
  notificationRealtimeService,
  notificationService
};
export const paymentController = new PaymentController(commerceService);
export const progressController = new ProgressController(progressService);
export const profileController = new ProfileController(profileService);
export const answerScriptController = new AnswerScriptController(
  answerScriptService,
  paperMarkingService
);
export const testController = new TestController(testService);
export const uploadController = new UploadController(uploadService);
