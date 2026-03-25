import type { Context } from "hono";
import type { UserRole } from "@mma/shared";

import { CommerceService } from "@/services/commerce-service";
import { EnrollmentPdfService } from "@/services/enrollment-pdf-service";
import type { AppBindings } from "@/types/app-bindings";
import { success } from "@/utils/response";

export class EnrollmentController {
  public constructor(
    private readonly commerceService: CommerceService,
    private readonly enrollmentPdfService: EnrollmentPdfService
  ) {}

  public async createEnrollment(
    context: Context<AppBindings>,
    courseId: string,
    callbackOrigin: string | undefined,
    currentUserId: string,
    currentUserRole: UserRole
  ): Promise<Response> {
    const data = await this.commerceService.createEnrollment(
      courseId,
      currentUserId,
      currentUserRole,
      callbackOrigin
    );

    return success(context, data, 201, "Enrollment created successfully");
  }

  public async listMyEnrollments(
    context: Context<AppBindings>,
    currentUserId: string
  ): Promise<Response> {
    const data = await this.commerceService.listMyEnrollments(currentUserId);

    return success(context, data);
  }

  public async getMyCourseEnrollment(
    context: Context<AppBindings>,
    courseId: string,
    currentUserId: string
  ): Promise<Response> {
    const data = await this.commerceService.getMyCourseEnrollment(currentUserId, courseId);

    return success(context, data);
  }

  public async downloadCertificate(
    context: Context<AppBindings>,
    enrollmentId: string,
    currentUserId: string
  ): Promise<Response> {
    const bytes = await this.enrollmentPdfService.buildCertificatePdf(enrollmentId, currentUserId);

    return new Response(bytes, {
      headers: {
        "Content-Disposition": `attachment; filename="certificate-${enrollmentId}.pdf"`,
        "Content-Type": "application/pdf"
      }
    });
  }

  public async downloadReceipt(
    context: Context<AppBindings>,
    enrollmentId: string,
    currentUserId: string
  ): Promise<Response> {
    const bytes = await this.enrollmentPdfService.buildReceiptPdf(enrollmentId, currentUserId);

    return new Response(bytes, {
      headers: {
        "Content-Disposition": `attachment; filename="receipt-${enrollmentId}.pdf"`,
        "Content-Type": "application/pdf"
      }
    });
  }
}
