import type { JSX } from "react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis
} from "recharts";

import { EmptyState } from "@/components/ui/empty-state";
import type { CouponDetail } from "@/lib/api/coupons";
import { chartTheme } from "@/lib/chart-theme";
import { useFormat, useT } from "@/lib/i18n/locale-context";

function ChartFrame({
  children,
  title
}: {
  children: JSX.Element;
  title: string;
}): JSX.Element {
  return (
    <div className="border border-hairline bg-card p-4 sm:p-6">
      <h2 className="text-base font-medium text-ink">{title}</h2>
      <div className="mt-4 h-56 w-full">{children}</div>
    </div>
  );
}

/**
 * Redemptions per day, and — for a Platform Coupon — which courses they landed
 * on. Both series come from the payments themselves, so a chart and the uses
 * figure above it can never tell different stories. ADR-0013.
 */
export function CouponCharts({ coupon }: { coupon: CouponDetail }): JSX.Element {
  const t = useT();
  const format = useFormat();
  const series = coupon.redemptionSeries.map((point) => ({
    count: point.count,
    label: format.date(point.date)
  }));
  const breakdown = coupon.courseBreakdown.map((row) => ({
    count: row.count,
    label: row.courseTitle
  }));

  return (
    <div className="grid gap-6 lg:grid-cols-2">
      <ChartFrame title={t("coupon.chartTitle")}>
        {series.length === 0 ? (
          <EmptyState message={t("coupon.redemptionsEmpty")} />
        ) : (
          <ResponsiveContainer height="100%" width="100%">
            <LineChart data={series} margin={{ bottom: 8, left: 0, right: 8, top: 8 }}>
              <CartesianGrid stroke={chartTheme.grid} strokeDasharray="3 3" vertical={false} />
              <XAxis axisLine={false} dataKey="label" fontSize={10} tickLine={false} />
              <YAxis allowDecimals={false} axisLine={false} fontSize={10} tickLine={false} width={28} />
              <Tooltip />
              <Line
                dataKey="count"
                dot={{ fill: chartTheme.accent, r: 3, stroke: chartTheme.dotStroke, strokeWidth: 2 }}
                stroke={chartTheme.accent}
                strokeWidth={2}
                type="monotone"
              />
            </LineChart>
          </ResponsiveContainer>
        )}
      </ChartFrame>

      {/* A single-course coupon has one bar and nothing to compare it with. */}
      {coupon.course === null ? (
        <ChartFrame title={t("coupon.breakdownTitle")}>
          {breakdown.length === 0 ? (
            <EmptyState message={t("coupon.redemptionsEmpty")} />
          ) : (
            <ResponsiveContainer height="100%" width="100%">
              <BarChart data={breakdown} margin={{ bottom: 8, left: 0, right: 8, top: 8 }}>
                <CartesianGrid stroke={chartTheme.grid} strokeDasharray="3 3" vertical={false} />
                <XAxis axisLine={false} dataKey="label" fontSize={10} tickLine={false} />
                <YAxis allowDecimals={false} axisLine={false} fontSize={10} tickLine={false} width={28} />
                <Tooltip />
                <Bar dataKey="count" fill={chartTheme.accent} />
              </BarChart>
            </ResponsiveContainer>
          )}
        </ChartFrame>
      ) : null}
    </div>
  );
}
