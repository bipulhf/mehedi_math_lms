import type { JSX } from "react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import type { CouponRedemption } from "@/lib/api/coupons";
import { useFormat, useT } from "@/lib/i18n/locale-context";

interface CouponRedemptionsProps {
  hasMore: boolean;
  isLoadingMore: boolean;
  onLoadMore: () => void;
  redemptions: readonly CouponRedemption[];
}

function statusTone(status: CouponRedemption["paymentStatus"]): "neutral" | "quiet" | "faded" {
  if (status === "SUCCESS") {
    return "neutral";
  }

  return status === "PENDING" ? "quiet" : "faded";
}

/**
 * Who used the coupon: student, course, what came off, what they paid.
 *
 * Refunded rows stay, because a refund does not unspend a coupon — the use was
 * real and it still counts against the cap. ADR-0013.
 */
export function CouponRedemptions({
  hasMore,
  isLoadingMore,
  onLoadMore,
  redemptions
}: CouponRedemptionsProps): JSX.Element {
  const t = useT();
  const format = useFormat();

  if (redemptions.length === 0) {
    return <EmptyState message={t("coupon.redemptionsEmpty")} />;
  }

  return (
    <div className="space-y-4">
      <div className="border border-hairline bg-card">
        <div className="hidden overflow-x-auto md:block">
          <table className="w-full text-left text-sm">
            <thead>
              <tr className="border-b border-hairline bg-panel-warm/40 text-xs font-semibold uppercase tracking-wider text-muted-faint">
                <th className="px-4 py-2.5">{t("coupon.student")}</th>
                <th className="px-4 py-2.5">{t("coupon.course")}</th>
                <th className="px-4 py-2.5">{t("coupon.listPrice")}</th>
                <th className="px-4 py-2.5">{t("coupon.discount")}</th>
                <th className="px-4 py-2.5">{t("coupon.paid")}</th>
                <th className="px-4 py-2.5">{t("coupon.date")}</th>
              </tr>
            </thead>
            <tbody>
              {redemptions.map((redemption) => (
                <tr
                  className="border-b border-hairline-fainter last:border-b-0"
                  key={redemption.paymentId}
                >
                  <td className="px-4 py-3">
                    <div className="flex flex-col">
                      <span className="font-medium text-ink">{redemption.student.name}</span>
                      <span className="text-xs text-muted-faint">{redemption.student.email}</span>
                    </div>
                  </td>
                  <td className="px-4 py-3 text-muted">{redemption.course.title}</td>
                  <td className="px-4 py-3 text-muted">{format.currency(redemption.listAmount)}</td>
                  <td className="px-4 py-3 text-ink">
                    −{format.currency(redemption.discountAmount)}
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      <span className="font-medium text-ink">
                        {format.currency(redemption.paidAmount)}
                      </span>
                      <Badge tone={statusTone(redemption.paymentStatus)}>
                        {redemption.paymentStatus}
                      </Badge>
                    </div>
                  </td>
                  <td className="px-4 py-3 text-xs text-muted">
                    {format.date(redemption.redeemedAt)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className="divide-y divide-hairline-fainter md:hidden">
          {redemptions.map((redemption) => (
            <div className="space-y-3 p-4" key={redemption.paymentId}>
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="truncate font-medium text-ink">{redemption.student.name}</p>
                  <p className="truncate text-xs text-muted-faint">{redemption.course.title}</p>
                </div>
                <Badge tone={statusTone(redemption.paymentStatus)}>
                  {redemption.paymentStatus}
                </Badge>
              </div>

              <dl className="grid grid-cols-2 gap-x-4 gap-y-2 text-sm">
                <div>
                  <dt className="text-xs text-muted-light">{t("coupon.discount")}</dt>
                  <dd className="text-ink">−{format.currency(redemption.discountAmount)}</dd>
                </div>
                <div>
                  <dt className="text-xs text-muted-light">{t("coupon.paid")}</dt>
                  <dd className="font-medium text-ink">{format.currency(redemption.paidAmount)}</dd>
                </div>
                <div className="col-span-2">
                  <dt className="text-xs text-muted-light">{t("coupon.date")}</dt>
                  <dd className="text-muted">{format.date(redemption.redeemedAt)}</dd>
                </div>
              </dl>
            </div>
          ))}
        </div>
      </div>

      {hasMore ? (
        <Button
          className="w-full sm:w-auto"
          disabled={isLoadingMore}
          onClick={onLoadMore}
          size="sm"
          variant="outline"
        >
          {t("action.loadMore")}
        </Button>
      ) : null}
    </div>
  );
}
