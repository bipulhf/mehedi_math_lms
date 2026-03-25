import type { AdminSendSmsInput, AdminSmsHistoryQuery } from "@mma/shared";

import { env } from "@/lib/env";
import { queues } from "@/lib/queues";
import type { CourseRepository } from "@/repositories/course-repository";
import type { SmsRepository, SmsTargetKind } from "@/repositories/sms-repository";
import type { OnecodesoftSmsProvider } from "@/services/onecodesoft-sms-provider";
import { normalizeBdPhoneE164 } from "@/utils/phone-bd";
import { ValidationError } from "@/utils/errors";

export interface SmsBatchListView {
  completedAt: string | null;
  courseId: string | null;
  createdAt: string;
  createdByName: string;
  failedCount: number;
  id: string;
  messageBody: string;
  providerLastResponse: string | null;
  sentCount: number;
  skippedCount: number;
  status: string;
  targetKind: string;
  targetRole: string | null;
  totalRecipients: number;
}

export class SmsService {
  public constructor(
    private readonly smsRepository: SmsRepository,
    private readonly courseRepository: CourseRepository,
    private readonly smsProvider: OnecodesoftSmsProvider
  ) {}

  public async queueBulkSend(
    adminUserId: string,
    input: AdminSendSmsInput
  ): Promise<{ batchId: string }> {
    if (!env.isOnecodesoftSmsConfigured) {
      throw new ValidationError(
        "SMS provider is not configured (ONECODESOFT_API_KEY, ONECODESOFT_SENDER_ID)"
      );
    }

    const { kind: targetKind, rows } = await this.resolveTargetRows(input.target);

    if (input.target.kind === "course") {
      const course = await this.courseRepository.findById(input.target.courseId);

      if (!course) {
        throw new ValidationError("Course not found");
      }
    }

    const unique = new Map<string, string | null>();

    for (const row of rows) {
      if (!unique.has(row.userId)) {
        unique.set(row.userId, row.phone);
      }
    }

    const recipients: {
      phoneE164: string | null;
      status: "PENDING" | "SKIPPED_NO_PHONE";
      userId: string;
    }[] = [];

    let skipped = 0;

    for (const [userId, phoneRaw] of unique) {
      const trimmed = phoneRaw?.trim();

      if (!trimmed || trimmed.length === 0) {
        recipients.push({ phoneE164: null, status: "SKIPPED_NO_PHONE", userId });
        skipped++;
        continue;
      }

      const normalized = normalizeBdPhoneE164(trimmed);

      if (!normalized) {
        recipients.push({ phoneE164: null, status: "SKIPPED_NO_PHONE", userId });
        skipped++;
        continue;
      }

      recipients.push({ phoneE164: normalized, status: "PENDING", userId });
    }

    const sendable = recipients.filter((recipient) => recipient.status === "PENDING").length;

    if (sendable === 0) {
      throw new ValidationError("No recipients with a valid Bangladesh mobile number");
    }

    const { batchId } = await this.smsRepository.createBatchWithRecipients({
      courseId: input.target.kind === "course" ? input.target.courseId : null,
      createdByUserId: adminUserId,
      failedCount: 0,
      messageBody: input.message,
      recipients: recipients.map((recipient) => ({
        phoneE164: recipient.phoneE164,
        status: recipient.status,
        userId: recipient.userId
      })),
      sentCount: 0,
      skippedCount: skipped,
      status: "QUEUED",
      targetKind,
      targetRole: input.target.kind === "role" ? input.target.role : null,
      totalRecipients: recipients.length
    });

    await queues.sms.add(
      "sms-deliver",
      { batchId },
      {
        attempts: 3,
        backoff: {
          delay: 3000,
          type: "exponential"
        }
      }
    );

    return { batchId };
  }

  public async listHistory(query: AdminSmsHistoryQuery): Promise<{
    items: readonly SmsBatchListView[];
    limit: number;
    page: number;
    total: number;
  }> {
    const result = await this.smsRepository.listBatches({
      limit: query.limit,
      page: query.page
    });

    return {
      items: result.items.map((item) => ({
        completedAt: item.completedAt ? item.completedAt.toISOString() : null,
        courseId: item.courseId,
        createdAt: item.createdAt.toISOString(),
        createdByName: item.createdByName,
        failedCount: item.failedCount,
        id: item.id,
        messageBody: item.messageBody,
        providerLastResponse: item.providerLastResponse,
        sentCount: item.sentCount,
        skippedCount: item.skippedCount,
        status: item.status,
        targetKind: item.targetKind,
        targetRole: item.targetRole,
        totalRecipients: item.totalRecipients
      })),
      limit: query.limit,
      page: query.page,
      total: result.total
    };
  }

  public getProviderReadiness(): { configured: boolean } {
    return { configured: this.smsProvider.isConfigured() };
  }

  private async resolveTargetRows(target: AdminSendSmsInput["target"]): Promise<{
    kind: SmsTargetKind;
    rows: readonly { phone: string | null; userId: string }[];
  }> {
    if (target.kind === "all_students") {
      return {
        kind: "ALL_STUDENTS",
        rows: await this.smsRepository.listActiveStudentPhones()
      };
    }

    if (target.kind === "role") {
      return {
        kind: "ROLE",
        rows: await this.smsRepository.listPhonesForRole(target.role)
      };
    }

    return {
      kind: "COURSE",
      rows: await this.smsRepository.listPhonesForCourseEnrollments(target.courseId)
    };
  }
}
