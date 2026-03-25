import type { Context } from "hono";
import type { UserRole } from "@mma/shared";

import { CommerceService } from "@/services/commerce-service";
import type { AppBindings } from "@/types/app-bindings";
import { success } from "@/utils/response";

export class PaymentController {
  public constructor(private readonly commerceService: CommerceService) {}

  public async initializePayment(
    context: Context<AppBindings>,
    courseId: string,
    callbackOrigin: string | undefined,
    currentUserId: string,
    currentUserRole: UserRole
  ): Promise<Response> {
    const data = await this.commerceService.initializePayment(
      courseId,
      currentUserId,
      currentUserRole,
      callbackOrigin
    );

    return success(context, data, 201, "Payment initialized successfully");
  }

  public async listMyPayments(
    context: Context<AppBindings>,
    currentUserId: string
  ): Promise<Response> {
    const data = await this.commerceService.listMyPayments(currentUserId);

    return success(context, data);
  }

  public async getPaymentById(
    context: Context<AppBindings>,
    paymentId: string,
    currentUserId: string,
    currentUserRole: UserRole
  ): Promise<Response> {
    const data = await this.commerceService.getPaymentById(
      paymentId,
      currentUserId,
      currentUserRole
    );

    return success(context, data);
  }

  public async listAccountingPayments(
    context: Context<AppBindings>,
    query: {
      limit: number;
      page: number;
      status?: "PENDING" | "SUCCESS" | "FAILED" | "REFUNDED" | undefined;
    },
    currentUserRole: UserRole
  ): Promise<Response> {
    const data = await this.commerceService.listAccountingPayments(currentUserRole, query);

    return success(context, data);
  }

  public async handleSuccessCallback(
    context: Context<AppBindings>,
    input: {
      origin?: string | undefined;
      paymentId?: string | undefined;
      tranId?: string | undefined;
      valId?: string | undefined;
    }
  ): Promise<Response> {
    const redirectUrl = await this.commerceService.handlePaymentCallback({
      ...input,
      status: "SUCCESS"
    });

    return context.redirect(redirectUrl, 302);
  }

  public async handleFailCallback(
    context: Context<AppBindings>,
    input: {
      origin?: string | undefined;
      paymentId?: string | undefined;
      tranId?: string | undefined;
    }
  ): Promise<Response> {
    const redirectUrl = await this.commerceService.handlePaymentCallback({
      ...input,
      status: "FAILED"
    });

    return context.redirect(redirectUrl, 302);
  }

  public async handleCancelCallback(
    context: Context<AppBindings>,
    input: {
      origin?: string | undefined;
      paymentId?: string | undefined;
      tranId?: string | undefined;
    }
  ): Promise<Response> {
    const redirectUrl = await this.commerceService.handlePaymentCallback({
      ...input,
      status: "CANCELLED"
    });

    return context.redirect(redirectUrl, 302);
  }

  public async validatePayment(
    context: Context<AppBindings>,
    valId: string
  ): Promise<Response> {
    const data = await this.commerceService.validatePayment(valId);

    return success(context, data);
  }

  public async refundPayment(
    context: Context<AppBindings>,
    paymentId: string,
    remarks: string | undefined,
    currentUserRole: UserRole
  ): Promise<Response> {
    const data = await this.commerceService.refundPayment(paymentId, remarks, currentUserRole);

    return success(context, data, 200, "Payment refunded successfully");
  }
}
