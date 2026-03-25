import { env } from "@/lib/env";
import { ConflictError } from "@/utils/errors";

interface InitiatePaymentInput {
  amount: string;
  callbackOrigin: string;
  courseTitle: string;
  customerEmail: string;
  customerName: string;
  customerPhone?: string | undefined;
  paymentId: string;
  transactionId: string;
}

interface InitiatePaymentResult {
  gatewayUrl: string;
  isMock: boolean;
  metadata: Record<string, string | number | boolean | null>;
}

interface ValidationResult {
  metadata: Record<string, string | number | boolean | null>;
  status: string;
  transactionId: string;
  validationId: string;
}

interface SslCommerzInitResponse {
  GatewayPageURL?: string;
  failedreason?: string;
  sessionkey?: string;
  status?: string;
  storeBanner?: string;
}

interface SslCommerzValidationResponse {
  amount?: string;
  bank_tran_id?: string;
  card_type?: string;
  status?: string;
  tran_id?: string;
  val_id?: string;
}

function toFlatMetadata(
  input: Record<string, string | number | boolean | null | undefined>
): Record<string, string | number | boolean | null> {
  return Object.fromEntries(
    Object.entries(input).filter(([, value]) => value !== undefined)
  ) as Record<string, string | number | boolean | null>;
}

export class SslCommerzService {
  private getApiRoot(): string {
    return env.SSLCOMMERZ_SANDBOX_MODE
      ? "https://sandbox.sslcommerz.com"
      : "https://securepay.sslcommerz.com";
  }

  public buildSuccessCallbackUrl(
    paymentId: string,
    transactionId: string,
    callbackOrigin: string
  ): string {
    return `${env.API_PUBLIC_URL}/payments/success?paymentId=${encodeURIComponent(paymentId)}&tran_id=${encodeURIComponent(transactionId)}&origin=${encodeURIComponent(callbackOrigin)}`;
  }

  public buildFailCallbackUrl(
    paymentId: string,
    transactionId: string,
    callbackOrigin: string
  ): string {
    return `${env.API_PUBLIC_URL}/payments/fail?paymentId=${encodeURIComponent(paymentId)}&tran_id=${encodeURIComponent(transactionId)}&origin=${encodeURIComponent(callbackOrigin)}`;
  }

  public buildCancelCallbackUrl(
    paymentId: string,
    transactionId: string,
    callbackOrigin: string
  ): string {
    return `${env.API_PUBLIC_URL}/payments/cancel?paymentId=${encodeURIComponent(paymentId)}&tran_id=${encodeURIComponent(transactionId)}&origin=${encodeURIComponent(callbackOrigin)}`;
  }

  public buildIpnCallbackUrl(paymentId: string, callbackOrigin: string): string {
    return `${env.API_PUBLIC_URL}/payments/success?paymentId=${encodeURIComponent(paymentId)}&origin=${encodeURIComponent(callbackOrigin)}`;
  }

  public async initiatePayment(input: InitiatePaymentInput): Promise<InitiatePaymentResult> {
    if (!env.isSslCommerzConfigured) {
      return {
        gatewayUrl: `${input.callbackOrigin}/dashboard/payments/mock?paymentId=${encodeURIComponent(input.paymentId)}&transactionId=${encodeURIComponent(input.transactionId)}`,
        isMock: true,
        metadata: {
          gatewayMode: "mock"
        }
      };
    }

    const requestBody = new URLSearchParams({
      cancel_url: this.buildCancelCallbackUrl(
        input.paymentId,
        input.transactionId,
        input.callbackOrigin
      ),
      currency: "BDT",
      cus_add1: "N/A",
      cus_city: "Dhaka",
      cus_country: "Bangladesh",
      cus_email: input.customerEmail,
      cus_name: input.customerName,
      cus_phone: input.customerPhone ?? "N/A",
      fail_url: this.buildFailCallbackUrl(
        input.paymentId,
        input.transactionId,
        input.callbackOrigin
      ),
      ipn_url: this.buildIpnCallbackUrl(input.paymentId, input.callbackOrigin),
      num_of_item: "1",
      product_category: "Course",
      product_name: input.courseTitle,
      product_profile: "general",
      shipping_method: "NO",
      store_id: env.SSLCOMMERZ_STORE_ID,
      store_passwd: env.SSLCOMMERZ_STORE_PASSWORD,
      success_url: this.buildSuccessCallbackUrl(
        input.paymentId,
        input.transactionId,
        input.callbackOrigin
      ),
      total_amount: input.amount,
      tran_id: input.transactionId,
      value_a: input.paymentId,
      value_b: input.callbackOrigin
    });

    const response = await fetch(`${this.getApiRoot()}/gwprocess/v4/api.php`, {
      body: requestBody,
      headers: {
        "Content-Type": "application/x-www-form-urlencoded"
      },
      method: "POST"
    });
    const payload = (await response.json()) as SslCommerzInitResponse;

    if (!response.ok || payload.status !== "SUCCESS" || !payload.GatewayPageURL) {
      throw new ConflictError(payload.failedreason ?? "Unable to initialize payment gateway session");
    }

    return {
      gatewayUrl: payload.GatewayPageURL,
      isMock: false,
      metadata: toFlatMetadata({
        gatewayMode: "sslcommerz",
        sessionKey: payload.sessionkey ?? null,
        storeBanner: payload.storeBanner ?? null
      })
    };
  }

  public async validatePayment(valId: string): Promise<ValidationResult> {
    if (!env.isSslCommerzConfigured) {
      if (!valId.startsWith("MOCK-")) {
        throw new ConflictError("Mock validation id is invalid");
      }

      return {
        metadata: {
          gatewayMode: "mock",
          validationStatus: "VALIDATED"
        },
        status: "VALIDATED",
        transactionId: valId.replace("MOCK-", ""),
        validationId: valId
      };
    }

    const url = new URL(`${this.getApiRoot()}/validator/api/validationserverAPI.php`);
    url.searchParams.set("format", "json");
    url.searchParams.set("store_id", env.SSLCOMMERZ_STORE_ID);
    url.searchParams.set("store_passwd", env.SSLCOMMERZ_STORE_PASSWORD);
    url.searchParams.set("val_id", valId);
    const response = await fetch(url.toString());
    const payload = (await response.json()) as SslCommerzValidationResponse;

    if (!response.ok || !payload.status || !payload.tran_id || !payload.val_id) {
      throw new ConflictError("Unable to validate payment transaction");
    }

    return {
      metadata: toFlatMetadata({
        amount: payload.amount ?? null,
        bankTransactionId: payload.bank_tran_id ?? null,
        cardType: payload.card_type ?? null,
        gatewayMode: "sslcommerz",
        validationStatus: payload.status
      }),
      status: payload.status,
      transactionId: payload.tran_id,
      validationId: payload.val_id
    };
  }
}
