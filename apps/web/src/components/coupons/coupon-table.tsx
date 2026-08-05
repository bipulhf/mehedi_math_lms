import { Link } from "@tanstack/react-router";
import type { JSX } from "react";

import { CouponStateBadge } from "@/components/coupons/coupon-state-badge";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import type { CouponListItem } from "@/lib/api/coupons";
import { useFormat, useT } from "@/lib/i18n/locale-context";

interface CouponTableProps {
  coupons: readonly CouponListItem[];
  onDelete: (coupon: CouponListItem) => void;
  onEdit: (coupon: CouponListItem) => void;
  onToggle: (coupon: CouponListItem) => void;
  toggling: boolean;
  /** Admins see who made each coupon; a teacher's own list has one answer. */
  showCreator: boolean;
}

function useDiscountLabel(): (coupon: CouponListItem) => string {
  const format = useFormat();

  return (coupon) =>
    coupon.kind === "PERCENT"
      ? format.percent(Number(coupon.value))
      : format.currency(coupon.value);
}

function UsesText({ coupon }: { coupon: CouponListItem }): JSX.Element {
  const t = useT();
  const format = useFormat();

  // A cap can be passed — a coupon that expired mid-payment is still honoured,
  // so "102 / 100" is a true statement about the campaign. ADR-0013.
  return (
    <span>
      {coupon.maxRedemptions === null
        ? t("coupon.usesUnlimited", { used: format.number(coupon.redemptionCount) })
        : t("coupon.usesOf", {
            max: format.number(coupon.maxRedemptions),
            used: format.number(coupon.redemptionCount)
          })}
    </span>
  );
}

/**
 * A table from `md` up and stacked cards below it. Below that width a seven
 * column table becomes a horizontal scroll nobody finds.
 */
export function CouponTable({
  coupons,
  onDelete,
  onEdit,
  onToggle,
  toggling,
  showCreator
}: CouponTableProps): JSX.Element {
  const t = useT();
  const format = useFormat();
  const discountLabel = useDiscountLabel();

  return (
    <>
      <div className="hidden overflow-x-auto md:block">
        <table className="w-full text-left text-sm">
          <thead>
            <tr className="border-b border-hairline bg-panel-warm/40 text-xs font-semibold uppercase tracking-wider text-muted-faint">
              <th className="px-4 py-2.5">{t("coupon.code")}</th>
              <th className="px-4 py-2.5">{t("coupon.course")}</th>
              <th className="px-4 py-2.5">{t("coupon.value")}</th>
              <th className="px-4 py-2.5">{t("coupon.uses")}</th>
              <th className="px-4 py-2.5">{t("coupon.totalDiscount")}</th>
              {showCreator ? <th className="px-4 py-2.5">{t("coupon.createdBy")}</th> : null}
              <th className="px-4 py-2.5">{t("coupon.filterState")}</th>
              <th className="px-4 py-2.5" />
            </tr>
          </thead>
          <tbody>
            {coupons.map((coupon) => (
              <tr
                className="border-b border-hairline-fainter transition-colors last:border-b-0 hover:bg-row-hover"
                key={coupon.id}
              >
                <td className="px-4 py-3">
                  <Link
                    className="font-mono font-medium text-ink transition-colors hover:text-accent"
                    params={{ couponId: coupon.id }}
                    to="/dashboard/coupons/$couponId"
                  >
                    {coupon.code}
                  </Link>
                  {coupon.isPublic ? (
                    <Badge className="ml-2 px-2 py-0.5 text-xs" tone="teal">
                      {t("coupon.isPublic")}
                    </Badge>
                  ) : null}
                </td>
                <td className="px-4 py-3 text-muted">
                  {coupon.course?.title ?? t("coupon.allCourses")}
                </td>
                <td className="px-4 py-3 font-medium text-ink">{discountLabel(coupon)}</td>
                <td className="px-4 py-3 text-muted">
                  <UsesText coupon={coupon} />
                </td>
                <td className="px-4 py-3 text-muted">{format.currency(coupon.totalDiscount)}</td>
                {showCreator ? (
                  <td className="px-4 py-3 text-muted">{coupon.createdBy.name}</td>
                ) : null}
                <td className="px-4 py-3">
                  <CouponStateBadge state={coupon.state} />
                </td>
                <td className="px-4 py-3">
                  {coupon.isEditable ? (
                    <div className="flex flex-wrap gap-2">
                      <Button
                        aria-pressed={!coupon.isDisabled}
                        disabled={toggling}
                        onClick={() => onToggle(coupon)}
                        size="xs"
                        variant={coupon.isDisabled ? "ink" : "outline"}
                      >
                        {coupon.isDisabled ? t("coupon.enable") : t("coupon.disable")}
                      </Button>
                      <Button onClick={() => onEdit(coupon)} size="xs" variant="outline">
                        {t("action.edit")}
                      </Button>
                      <Button onClick={() => onDelete(coupon)} size="xs" variant="outline">
                        {t("coupon.delete")}
                      </Button>
                    </div>
                  ) : (
                    <span className="text-xs text-muted-faint">{t("coupon.readOnly")}</span>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="divide-y divide-hairline-fainter md:hidden">
        {coupons.map((coupon) => (
          <div className="space-y-4 p-4 sm:p-5" key={coupon.id}>
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-2">
                  <Link
                    className="font-mono font-medium text-ink"
                    params={{ couponId: coupon.id }}
                    to="/dashboard/coupons/$couponId"
                  >
                    {coupon.code}
                  </Link>
                  {coupon.isPublic ? (
                    <Badge className="px-2 py-0.5 text-xs" tone="teal">
                      {t("coupon.isPublic")}
                    </Badge>
                  ) : null}
                </div>
                <p className="truncate text-xs text-muted-faint">
                  {coupon.course?.title ?? t("coupon.allCourses")}
                </p>
              </div>
              <CouponStateBadge state={coupon.state} />
            </div>

            <dl className="grid grid-cols-2 gap-x-4 gap-y-2 text-sm">
              <div>
                <dt className="text-xs text-muted-light">{t("coupon.value")}</dt>
                <dd className="font-medium text-ink">{discountLabel(coupon)}</dd>
              </div>
              <div>
                <dt className="text-xs text-muted-light">{t("coupon.uses")}</dt>
                <dd className="text-muted">
                  <UsesText coupon={coupon} />
                </dd>
              </div>
              <div>
                <dt className="text-xs text-muted-light">{t("coupon.totalDiscount")}</dt>
                <dd className="text-muted">{format.currency(coupon.totalDiscount)}</dd>
              </div>
              {showCreator ? (
                <div className="min-w-0">
                  <dt className="text-xs text-muted-light">{t("coupon.createdBy")}</dt>
                  <dd className="truncate text-muted">{coupon.createdBy.name}</dd>
                </div>
              ) : null}
            </dl>

            {coupon.isEditable ? (
              <div className="flex flex-wrap gap-2">
                <Button
                  aria-pressed={!coupon.isDisabled}
                  className="flex-1"
                  disabled={toggling}
                  onClick={() => onToggle(coupon)}
                  size="sm"
                  variant={coupon.isDisabled ? "ink" : "outline"}
                >
                  {coupon.isDisabled ? t("coupon.enable") : t("coupon.disable")}
                </Button>
                <Button
                  className="flex-1"
                  onClick={() => onEdit(coupon)}
                  size="sm"
                  variant="outline"
                >
                  {t("action.edit")}
                </Button>
                <Button
                  className="flex-1"
                  onClick={() => onDelete(coupon)}
                  size="sm"
                  variant="outline"
                >
                  {t("coupon.delete")}
                </Button>
              </div>
            ) : (
              <p className="text-xs text-muted-faint">{t("coupon.readOnly")}</p>
            )}
          </div>
        ))}
      </div>
    </>
  );
}
