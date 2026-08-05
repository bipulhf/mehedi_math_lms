import type { CouponKind } from "@genex/shared";

export interface CouponPricing {
  /** Never more than the list price, and never negative. */
  discountAmount: string;
  listAmount: string;
  /** What the gateway is asked to collect. Zero settles locally. ADR-0013. */
  payable: string;
}

function round(value: number): number {
  return Math.round(value * 100) / 100;
}

function money(value: number): string {
  return value.toFixed(2);
}

/**
 * What a coupon takes off a price.
 *
 * A percentage keeps its paisa — 20% of ৳1499 is ৳299.80, and the student pays
 * ৳1199.20. A flat amount is clamped to the price, so a ৳2000 coupon on a ৳1499
 * course discounts ৳1499 and no more; the payable floors at zero rather than
 * going negative, and a zero payable is a real outcome the checkout handles.
 *
 * Pure, and separate from the service, because this is the arithmetic every
 * screen quotes and every payment is measured against.
 */
export function priceWithCoupon(
  price: string,
  kind: CouponKind,
  value: string
): CouponPricing {
  const listAmount = Math.max(round(Number(price)), 0);
  const couponValue = Number(value);
  const raw = kind === "FLAT" ? couponValue : (listAmount * couponValue) / 100;
  const discountAmount = Math.min(round(raw), listAmount);

  return {
    discountAmount: money(discountAmount),
    listAmount: money(listAmount),
    payable: money(round(listAmount - discountAmount))
  };
}

export function isZeroAmount(amount: string): boolean {
  return Number(amount) <= 0;
}
