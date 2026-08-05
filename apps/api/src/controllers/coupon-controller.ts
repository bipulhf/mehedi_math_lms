import type { Context } from "hono";

import type {
  CouponActor,
  CouponService,
  CreateCouponServiceInput,
  UpdateCouponServiceInput
} from "@/services/coupon-service";
import type { AppBindings } from "@/types/app-bindings";
import { paginated, success } from "@/utils/response";

export class CouponController {
  public constructor(private readonly couponService: CouponService) {}

  public async listCoupons(
    context: Context<AppBindings>,
    query: Parameters<CouponService["list"]>[0],
    actor: CouponActor
  ): Promise<Response> {
    const result = await this.couponService.list(query, actor);

    return paginated(context, result.items, {
      limit: query.limit,
      page: query.page,
      pages: Math.max(Math.ceil(result.total / query.limit), 1),
      total: result.total
    });
  }

  public async getCoupon(
    context: Context<AppBindings>,
    id: string,
    actor: CouponActor
  ): Promise<Response> {
    const coupon = await this.couponService.getDetail(id, actor);

    return success(context, coupon);
  }

  public async listRedemptions(
    context: Context<AppBindings>,
    id: string,
    query: { limit: number; page: number },
    actor: CouponActor
  ): Promise<Response> {
    const result = await this.couponService.listRedemptions(id, query, actor);

    return paginated(context, result.items, {
      limit: query.limit,
      page: query.page,
      pages: Math.max(Math.ceil(result.total / query.limit), 1),
      total: result.total
    });
  }

  public async createCoupon(
    context: Context<AppBindings>,
    input: CreateCouponServiceInput,
    actor: CouponActor
  ): Promise<Response> {
    const coupon = await this.couponService.create(input, actor);

    return success(context, coupon, 201, "Coupon created successfully");
  }

  public async updateCoupon(
    context: Context<AppBindings>,
    id: string,
    input: UpdateCouponServiceInput,
    actor: CouponActor
  ): Promise<Response> {
    const coupon = await this.couponService.update(id, input, actor);

    return success(context, coupon, 200, "Coupon updated successfully");
  }

  public async deleteCoupon(
    context: Context<AppBindings>,
    id: string,
    actor: CouponActor
  ): Promise<Response> {
    await this.couponService.remove(id, actor);

    return success(context, { id }, 200, "Coupon deleted successfully");
  }

  /**
   * Answers 200 whether the code worked or not: a refusal carries a reason the
   * client renders in Bangla, and the shared error toast would otherwise show
   * the server's English. ADR-0013.
   */
  public async previewCoupon(
    context: Context<AppBindings>,
    input: { code: string; courseId: string },
    studentId: string
  ): Promise<Response> {
    const result = await this.couponService.preview(input.courseId, input.code, studentId);

    return success(context, result);
  }
}
