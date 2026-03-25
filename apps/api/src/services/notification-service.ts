import type { AdminSendNotificationInput, RegisterFcmDeviceInput } from "@mma/shared";
import type { UserRole } from "@mma/shared";

import { queues } from "@/lib/queues";
import {
  type NotificationRepository,
  type NotificationRecord,
  type NotificationType
} from "@/repositories/notification-repository";
import type { CourseRepository } from "@/repositories/course-repository";
import type { EnrollmentRepository } from "@/repositories/enrollment-repository";
import type { NotificationRealtimeService } from "@/services/notification-realtime-service";
import { ForbiddenError, NotFoundError, ValidationError } from "@/utils/errors";

export interface NotificationView {
  body: string;
  createdAt: string;
  data: Record<string, string | number | boolean | null> | null;
  id: string;
  readAt: string | null;
  title: string;
  type: NotificationType;
}

function mapRecord(record: NotificationRecord): NotificationView {
  return {
    body: record.body,
    createdAt: record.createdAt.toISOString(),
    data: record.data,
    id: record.id,
    readAt: record.readAt ? record.readAt.toISOString() : null,
    title: record.title,
    type: record.type
  };
}

export class NotificationService {
  public constructor(
    private readonly notificationRepository: NotificationRepository,
    private readonly enrollmentRepository: EnrollmentRepository,
    private readonly courseRepository: CourseRepository,
    private readonly notificationRealtimeService: NotificationRealtimeService
  ) {}

  private async publishNewForUsers(records: readonly NotificationRecord[]): Promise<void> {
    if (records.length === 0) {
      return;
    }

    const byUser = new Map<string, NotificationView[]>();

    for (const record of records) {
      const view = mapRecord(record);
      const current = byUser.get(record.userId) ?? [];

      current.push(view);
      byUser.set(record.userId, current);
    }

    for (const [userId, items] of byUser) {
      await this.notificationRealtimeService.publish({
        data: {
          items: JSON.stringify(items)
        },
        type: "notification:new",
        userIds: [userId]
      });
    }
  }

  public async registerDevice(currentUserId: string, input: RegisterFcmDeviceInput): Promise<void> {
    await this.notificationRepository.upsertFcmToken({
      deviceType: input.deviceType,
      token: input.token,
      userId: currentUserId
    });
  }

  public async listForUser(
    userId: string,
    query: { limit: number; page: number }
  ): Promise<{ items: readonly NotificationView[]; limit: number; page: number; total: number }> {
    const result = await this.notificationRepository.listForUser(userId, query);

    return {
      items: result.items.map(mapRecord),
      limit: query.limit,
      page: query.page,
      total: result.total
    };
  }

  public async getUnreadCount(userId: string): Promise<number> {
    return this.notificationRepository.countUnreadForUser(userId);
  }

  public async markRead(notificationId: string, userId: string): Promise<NotificationView> {
    const record = await this.notificationRepository.markRead(notificationId, userId);

    if (!record) {
      throw new NotFoundError("Notification not found");
    }

    const view = mapRecord(record);

    await this.notificationRealtimeService.publish({
      data: {
        id: view.id,
        readAt: view.readAt
      },
      type: "notification:read",
      userIds: [userId]
    });

    return view;
  }

  public async markAllRead(userId: string): Promise<{ updated: number }> {
    const updated = await this.notificationRepository.markAllRead(userId);

    await this.notificationRealtimeService.publish({
      data: {},
      type: "notification:read-all",
      userIds: [userId]
    });

    return { updated };
  }

  private async resolveTargetUserIds(input: AdminSendNotificationInput["target"]): Promise<readonly string[]> {
    if (input.kind === "role") {
      return this.notificationRepository.listActiveUserIdsByRole(input.role);
    }

    if (input.kind === "users") {
      return input.userIds;
    }

    return this.enrollmentRepository.listEnrolledUserIdsByCourse(input.courseId);
  }

  private ensureTeacherCanTarget(senderRole: UserRole, target: AdminSendNotificationInput["target"]): void {
    if (senderRole === "ADMIN") {
      return;
    }

    if (senderRole !== "TEACHER") {
      throw new ForbiddenError("Only admins and teachers can broadcast notifications");
    }

    if (target.kind === "role") {
      throw new ForbiddenError("Teachers cannot target an entire role");
    }
  }

  private async ensureTeacherManagesCourse(teacherId: string, courseId: string): Promise<void> {
    const course = await this.courseRepository.findById(courseId);

    if (!course) {
      throw new NotFoundError("Course not found");
    }

    const isManager =
      course.creator.id === teacherId || course.teachers.some((teacher) => teacher.id === teacherId);

    if (!isManager) {
      throw new ForbiddenError("You do not manage this course");
    }
  }

  public async adminOrTeacherSend(
    input: AdminSendNotificationInput,
    senderId: string,
    senderRole: UserRole
  ): Promise<{ delivered: number }> {
    this.ensureTeacherCanTarget(senderRole, input.target);

    if (senderRole === "TEACHER" && input.target.kind === "course") {
      await this.ensureTeacherManagesCourse(senderId, input.target.courseId);
    }

    const userIds = await this.resolveTargetUserIds(input.target);

    if (userIds.length === 0) {
      throw new ValidationError("No recipients matched this target");
    }

    let uniqueUserIds = [...new Set(userIds)];

    if (senderRole === "TEACHER" && input.target.kind === "users") {
      uniqueUserIds = uniqueUserIds.filter((userId) => userId !== senderId);
    }

    if (uniqueUserIds.length === 0) {
      throw new ValidationError("No recipients matched this target");
    }

    const records = await this.notificationRepository.insertForUsers(uniqueUserIds, {
      body: input.body,
      data: input.data,
      title: input.title,
      type: input.type
    });

    await this.publishNewForUsers(records);

    const notificationIds = records.map((record) => record.id);

    await queues.notification.add(
      "fcm-deliver",
      { notificationIds },
      {
        attempts: 3,
        backoff: {
          delay: 2000,
          type: "exponential"
        }
      }
    );

    return { delivered: records.length };
  }
}
