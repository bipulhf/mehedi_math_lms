import { PDFDocument, StandardFonts, rgb } from "pdf-lib";

import type { EnrollmentRepository } from "@/repositories/enrollment-repository";
import type { PaymentRepository } from "@/repositories/payment-repository";
import { ForbiddenError, NotFoundError, ValidationError } from "@/utils/errors";

export class EnrollmentPdfService {
  public constructor(
    private readonly enrollmentRepository: EnrollmentRepository,
    private readonly paymentRepository: PaymentRepository
  ) {}

  public async buildCertificatePdf(enrollmentId: string, userId: string): Promise<Uint8Array> {
    const detail = await this.enrollmentRepository.findOwnedCertificateDetail(enrollmentId, userId);

    if (!detail) {
      throw new NotFoundError("Enrollment not found");
    }

    if (detail.status !== "COMPLETED") {
      throw new ValidationError("Certificate is available after you complete the course");
    }

    const issuedAt = detail.completedAt ?? new Date();

    return this.buildCertificateBuffer({
      courseTitle: detail.courseTitle,
      issuedAt,
      studentName: detail.studentName
    });
  }

  public async buildReceiptPdf(enrollmentId: string, userId: string): Promise<Uint8Array> {
    const detail = await this.enrollmentRepository.findOwnedCertificateDetail(enrollmentId, userId);

    if (!detail) {
      throw new NotFoundError("Enrollment not found");
    }

    const payment = await this.paymentRepository.findLatestSuccessByEnrollmentId(enrollmentId);

    if (!payment || payment.userId !== userId) {
      throw new ForbiddenError("No successful payment for this enrollment");
    }

    return this.buildReceiptBuffer({
      amount: payment.amount,
      courseTitle: detail.courseTitle,
      currency: payment.currency,
      paidAt: payment.paidAt ?? payment.createdAt,
      studentName: detail.studentName,
      transactionId: payment.transactionId
    });
  }

  private async buildCertificateBuffer(input: {
    courseTitle: string;
    issuedAt: Date;
    studentName: string;
  }): Promise<Uint8Array> {
    const pdf = await PDFDocument.create();
    const page = pdf.addPage([612, 792]);
    const font = await pdf.embedFont(StandardFonts.Helvetica);
    const fontBold = await pdf.embedFont(StandardFonts.HelveticaBold);

    const title = "Certificate of Completion";
    const subtitle = "Mehedi's Math Academy";

    page.drawText(title, {
      color: rgb(0.15, 0.15, 0.2),
      font: fontBold,
      size: 22,
      x: 72,
      y: 680
    });

    page.drawText(subtitle, {
      color: rgb(0.35, 0.35, 0.42),
      font,
      size: 12,
      x: 72,
      y: 650
    });

    page.drawText("This certifies that", {
      font,
      size: 11,
      x: 72,
      y: 590
    });

    page.drawText(input.studentName, {
      font: fontBold,
      size: 16,
      x: 72,
      y: 560
    });

    page.drawText(`has successfully completed`, {
      font,
      size: 11,
      x: 72,
      y: 520
    });

    page.drawText(input.courseTitle, {
      font: fontBold,
      size: 14,
      x: 72,
      y: 490
    });

    page.drawText(`Issued on ${input.issuedAt.toISOString().slice(0, 10)}`, {
      font,
      size: 10,
      x: 72,
      y: 420
    });

    return pdf.save();
  }

  private async buildReceiptBuffer(input: {
    amount: string;
    courseTitle: string;
    currency: string;
    paidAt: Date;
    studentName: string;
    transactionId: string;
  }): Promise<Uint8Array> {
    const pdf = await PDFDocument.create();
    const page = pdf.addPage([612, 792]);
    const font = await pdf.embedFont(StandardFonts.Helvetica);
    const fontBold = await pdf.embedFont(StandardFonts.HelveticaBold);

    page.drawText("Payment receipt", {
      color: rgb(0.15, 0.15, 0.2),
      font: fontBold,
      size: 20,
      x: 72,
      y: 720
    });

    page.drawText("Mehedi's Math Academy", {
      font,
      size: 11,
      x: 72,
      y: 690
    });

    const lines = [
      `Student: ${input.studentName}`,
      `Course: ${input.courseTitle}`,
      `Amount: ${input.amount} ${input.currency}`,
      `Transaction ID: ${input.transactionId}`,
      `Paid at: ${input.paidAt.toISOString()}`
    ];

    let y = 620;
    for (const line of lines) {
      page.drawText(line, {
        font,
        size: 11,
        x: 72,
        y
      });
      y -= 26;
    }

    return pdf.save();
  }
}
