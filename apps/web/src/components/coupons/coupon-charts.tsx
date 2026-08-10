import type { JSX } from "react";

import { ChartFrame } from "@/components/charts/chart-frame";
import { SeriesBarChart } from "@/components/charts/bar-chart";
import { SeriesLineChart } from "@/components/charts/line-chart";
import { EmptyState } from "@/components/ui/empty-state";
import type { CouponDetail } from "@/lib/api/coupons";
import { useFormat, useT } from "@/lib/i18n/locale-context";

/**
 * Redemptions per day, and — for a Platform Coupon — which courses they landed
 * on. Both series come from the payments themselves, so a chart and the uses
 * figure above it can never tell different stories. ADR-0013.
 */
export function CouponCharts({ coupon }: { coupon: CouponDetail }): JSX.Element {
  const t = useT();
  const format = useFormat();
  const series = coupon.redemptionSeries.map((point) => ({
    label: format.date(point.date),
    value: point.count
  }));
  const breakdown = coupon.courseBreakdown.map((row) => ({
    label: row.courseTitle,
    value: row.count
  }));

  return (
    <div className="grid gap-6 lg:grid-cols-2">
      <ChartFrame height={224} isEmpty={series.length === 0} title={t("coupon.chartTitle")}>
        {series.length === 0 ? (
          <EmptyState message={t("coupon.redemptionsEmpty")} />
        ) : (
          <SeriesLineChart ariaLabel={t("coupon.chartTitle")} data={series} height={224} />
        )}
      </ChartFrame>

      {/* A single-course coupon has one bar and nothing to compare it with. */}
      {coupon.course === null ? (
        <ChartFrame height={224} isEmpty={breakdown.length === 0} title={t("coupon.breakdownTitle")}>
          {breakdown.length === 0 ? (
            <EmptyState message={t("coupon.redemptionsEmpty")} />
          ) : (
            <SeriesBarChart ariaLabel={t("coupon.breakdownTitle")} data={breakdown} height={224} />
          )}
        </ChartFrame>
      ) : null}
    </div>
  );
}
