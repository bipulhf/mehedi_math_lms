import { Hono } from "hono";
import type { Context } from "hono";
import {
  createEnrollmentSchema,
  paymentIdParamsSchema,
  paymentListQuerySchema,
  paymentValidationParamsSchema,
  refundPaymentSchema
} from "@mma/shared";
import type { UserRole } from "@mma/shared";

import { paymentController } from "@/lib/container";
import { requireAuth, requireRole } from "@/middleware/auth";
import type { AppBindings } from "@/types/app-bindings";

async function readCallbackInput(context: Context<AppBindings>): Promise<{
  origin?: string | undefined;
  paymentId?: string | undefined;
  tranId?: string | undefined;
  valId?: string | undefined;
}> {
  const body = (await context.req.parseBody().catch(() => ({}))) as Record<
    string,
    string | File | (string | File)[] | undefined
  >;
  const query = context.req.query();
  const getString = (value: string | File | (string | File)[] | undefined): string | undefined =>
    typeof value === "string" && value.trim().length > 0 ? value : undefined;

  return {
    origin: getString(body.origin) ?? query.origin,
    paymentId: getString(body.paymentId) ?? query.paymentId ?? getString(body.value_a),
    tranId: getString(body.tran_id) ?? query.tran_id,
    valId: getString(body.val_id) ?? query.val_id
  };
}

export const paymentsRoutes = new Hono<AppBindings>();

paymentsRoutes.post("/init", requireRole("STUDENT"), async (context) => {
  const payload = createEnrollmentSchema.parse(await context.req.json());
  const authUser = context.get("authUser");
  const authSession = context.get("authSession");

  return paymentController.initializePayment(
    context,
    payload.courseId,
    payload.callbackOrigin,
    authUser!.id,
    authSession!.role as UserRole
  );
});

paymentsRoutes.get("/me", requireRole("STUDENT"), (context) => {
  const authUser = context.get("authUser");

  return paymentController.listMyPayments(context, authUser!.id);
});

paymentsRoutes.get("/", requireRole("ACCOUNTANT", "ADMIN"), (context) => {
  const query = paymentListQuerySchema.parse(context.req.query());
  const authSession = context.get("authSession");

  return paymentController.listAccountingPayments(
    context,
    query,
    authSession!.role as UserRole
  );
});

paymentsRoutes.get("/success", async (context) => {
  const input = await readCallbackInput(context);

  return paymentController.handleSuccessCallback(context, input);
});

paymentsRoutes.post("/success", async (context) => {
  const input = await readCallbackInput(context);

  return paymentController.handleSuccessCallback(context, input);
});

paymentsRoutes.get("/fail", async (context) => {
  const input = await readCallbackInput(context);

  return paymentController.handleFailCallback(context, input);
});

paymentsRoutes.post("/fail", async (context) => {
  const input = await readCallbackInput(context);

  return paymentController.handleFailCallback(context, input);
});

paymentsRoutes.get("/cancel", async (context) => {
  const input = await readCallbackInput(context);

  return paymentController.handleCancelCallback(context, input);
});

paymentsRoutes.post("/cancel", async (context) => {
  const input = await readCallbackInput(context);

  return paymentController.handleCancelCallback(context, input);
});

paymentsRoutes.get("/validate/:valId", async (context) => {
  const params = paymentValidationParamsSchema.parse(context.req.param());

  return paymentController.validatePayment(context, params.valId);
});

paymentsRoutes.get("/:id", requireAuth(), (context) => {
  const params = paymentIdParamsSchema.parse(context.req.param());
  const authUser = context.get("authUser");
  const authSession = context.get("authSession");

  return paymentController.getPaymentById(
    context,
    params.id,
    authUser!.id,
    authSession!.role as UserRole
  );
});

paymentsRoutes.post("/:id/refund", requireRole("ACCOUNTANT", "ADMIN"), async (context) => {
  const params = paymentIdParamsSchema.parse(context.req.param());
  const payload = refundPaymentSchema.parse(await context.req.json());
  const authSession = context.get("authSession");

  return paymentController.refundPayment(
    context,
    params.id,
    payload.remarks || undefined,
    authSession!.role as UserRole
  );
});
