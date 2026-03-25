import { AdminController } from "@/controllers/admin-controller";
import { AnalyticsController } from "@/controllers/analytics-controller";
import { AdminDashboardController } from "@/controllers/admin-dashboard-controller";
import { AdminUserController } from "@/controllers/admin-user-controller";
import { AuthController } from "@/controllers/auth-controller";
import { BugReportController } from "@/controllers/bug-report-controller";
import { CategoryController } from "@/controllers/category-controller";
import { CommentController } from "@/controllers/comment-controller";
import { ContentController } from "@/controllers/content-controller";
import { CourseController } from "@/controllers/course-controller";
import { EnrollmentController } from "@/controllers/enrollment-controller";
import { HealthController } from "@/controllers/health-controller";
import { MessageController } from "@/controllers/message-controller";
import { NotImplementedController } from "@/controllers/not-implemented-controller";
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
import { redis } from "@/lib/redis";
import { AdminDashboardRepository } from "@/repositories/admin-dashboard-repository";
import { AnalyticsRepository } from "@/repositories/analytics-repository";
import { AdminUserRepository } from "@/repositories/admin-user-repository";
import { AuthSessionRepository } from "@/repositories/auth-session-repository";
import { BugReportRepository } from "@/repositories/bug-report-repository";
import { CategoryRepository } from "@/repositories/category-repository";
import { CommentRepository } from "@/repositories/comment-repository";
import { ContentRepository } from "@/repositories/content-repository";
import { CourseRepository } from "@/repositories/course-repository";
import { EnrollmentRepository } from "@/repositories/enrollment-repository";
import { HealthRepository } from "@/repositories/health-repository";
import { MessageRepository } from "@/repositories/message-repository";
import { NoticeRepository } from "@/repositories/notice-repository";
import { NotificationRepository } from "@/repositories/notification-repository";
import { PaymentRepository } from "@/repositories/payment-repository";
import { ProfileRepository } from "@/repositories/profile-repository";
import { ReviewRepository } from "@/repositories/review-repository";
import { SmsRepository } from "@/repositories/sms-repository";
import { StaffAccountRepository } from "@/repositories/staff-account-repository";
import { TestRepository } from "@/repositories/test-repository";
import { UploadRepository } from "@/repositories/upload-repository";
import { AdminDashboardService } from "@/services/admin-dashboard-service";
import { AnalyticsService } from "@/services/analytics-service";
import { AdminUserService } from "@/services/admin-user-service";
import { AuthGuardService } from "@/services/auth-guard-service";
import { BugReportService } from "@/services/bug-report-service";
import { CategoryService } from "@/services/category-service";
import { CommentService } from "@/services/comment-service";
import { CommerceService } from "@/services/commerce-service";
import { EnrollmentPdfService } from "@/services/enrollment-pdf-service";
import { ContentService } from "@/services/content-service";
import { CourseService } from "@/services/course-service";
import { HealthService } from "@/services/health-service";
import { FcmPushService } from "@/services/fcm-push-service";
import { MessageRealtimeService } from "@/services/message-realtime-service";
import { MessageService } from "@/services/message-service";
import { NoticeService } from "@/services/notice-service";
import { NotImplementedService } from "@/services/not-implemented-service";
import { NotificationRealtimeService } from "@/services/notification-realtime-service";
import { NotificationService } from "@/services/notification-service";
import { OnecodesoftSmsProvider } from "@/services/onecodesoft-sms-provider";
import { SmsService } from "@/services/sms-service";
import { ProgressService } from "@/services/progress-service";
import { ProfileService } from "@/services/profile-service";
import { ReviewService } from "@/services/review-service";
import { SslCommerzService } from "@/services/sslcommerz-service";
import { StaffAccountService } from "@/services/staff-account-service";
import { TestService } from "@/services/test-service";
import { UploadService } from "@/services/upload-service";

const healthRepository = new HealthRepository(redis, queues);
const adminDashboardRepository = new AdminDashboardRepository();
const adminUserRepository = new AdminUserRepository();
const authSessionRepository = new AuthSessionRepository();
const bugReportRepository = new BugReportRepository();
const categoryRepository = new CategoryRepository();
const commentRepository = new CommentRepository();
const contentRepository = new ContentRepository();
const courseRepository = new CourseRepository();
const enrollmentRepository = new EnrollmentRepository();
const messageRepository = new MessageRepository();
const notificationRepository = new NotificationRepository();
const noticeRepository = new NoticeRepository();
const smsRepository = new SmsRepository();
const profileRepository = new ProfileRepository();
const paymentRepository = new PaymentRepository();
const reviewRepository = new ReviewRepository();
const analyticsRepository = new AnalyticsRepository();
const staffAccountRepository = new StaffAccountRepository();
const testRepository = new TestRepository();
const uploadRepository = new UploadRepository();
const adminDashboardService = new AdminDashboardService(adminDashboardRepository);
const healthService = new HealthService(healthRepository);
const authGuardService = new AuthGuardService(authSessionRepository);
const messageRealtimeService = new MessageRealtimeService(process.env.REDIS_URL ?? "redis://localhost:6379");
const notificationRealtimeService = new NotificationRealtimeService(
  process.env.REDIS_URL ?? "redis://localhost:6379"
);
const fcmPushService = new FcmPushService();
const messageService = new MessageService(messageRepository, messageRealtimeService);
const notificationService = new NotificationService(
  notificationRepository,
  enrollmentRepository,
  courseRepository,
  notificationRealtimeService
);
const onecodesoftSmsProvider = new OnecodesoftSmsProvider();
const smsService = new SmsService(smsRepository, courseRepository, onecodesoftSmsProvider);
const noticeService = new NoticeService(noticeRepository, courseRepository, enrollmentRepository);
const staffAccountService = new StaffAccountService(staffAccountRepository);
const adminUserService = new AdminUserService(adminUserRepository, authSessionRepository, staffAccountService);
const bugReportService = new BugReportService(bugReportRepository);
const categoryService = new CategoryService(categoryRepository);
const commentService = new CommentService(
  commentRepository,
  contentRepository,
  courseRepository,
  enrollmentRepository
);
const sslCommerzService = new SslCommerzService();
const commerceService = new CommerceService(
  enrollmentRepository,
  paymentRepository,
  courseRepository,
  profileRepository,
  sslCommerzService,
  reviewRepository
);
const enrollmentPdfService = new EnrollmentPdfService(enrollmentRepository, paymentRepository);
const reviewService = new ReviewService(reviewRepository, enrollmentRepository, courseRepository);
const analyticsService = new AnalyticsService(analyticsRepository, courseRepository);
const contentService = new ContentService(contentRepository, courseRepository, enrollmentRepository);
const courseService = new CourseService(courseRepository, categoryRepository);
const profileService = new ProfileService(profileRepository);
const notImplementedService = new NotImplementedService();
const progressService = new ProgressService(enrollmentRepository, contentRepository);
const testService = new TestService(
  testRepository,
  contentRepository,
  courseRepository,
  enrollmentRepository
);
const uploadService = new UploadService(uploadRepository);

export const adminController = new AdminController(staffAccountService);
export const adminDashboardController = new AdminDashboardController(adminDashboardService);
export const adminUserController = new AdminUserController(adminUserService);
export const authController = new AuthController();
export { authGuardService };
export const bugReportController = new BugReportController(bugReportService);
export const categoryController = new CategoryController(categoryService);
export const commentController = new CommentController(commentService);
export const contentController = new ContentController(contentService);
export const courseController = new CourseController(courseService);
export const analyticsController = new AnalyticsController(analyticsService);
export const enrollmentController = new EnrollmentController(commerceService, enrollmentPdfService);
export const reviewController = new ReviewController(reviewService);
export const healthController = new HealthController(healthService);
export const messageController = new MessageController(messageService);
export const notificationController = new NotificationController(notificationService);
export const noticeController = new NoticeController(noticeService);
export const smsController = new SmsController(smsService);
export {
  fcmPushService,
  messageRealtimeService,
  messageService,
  notificationRealtimeService,
  notificationService
};
export const notImplementedController = new NotImplementedController(notImplementedService);
export const paymentController = new PaymentController(commerceService);
export const progressController = new ProgressController(progressService);
export const profileController = new ProfileController(profileService);
export const testController = new TestController(testService);
export const uploadController = new UploadController(uploadService);
