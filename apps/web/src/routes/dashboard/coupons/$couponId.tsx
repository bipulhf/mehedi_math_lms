import { useQuery } from "@tanstack/react-query";
import { createFileRoute } from "@tanstack/react-router";
import type { JSX } from "react";
import { useState } from "react";
import { CouponCharts } from "@/components/coupons/coupon-charts";
import { CouponRedemptions } from "@/components/coupons/coupon-redemptions";
import { CouponStateBadge } from "@/components/coupons/coupon-state-badge";
import { CouponDetailSkeleton } from "@/components/common/skeletons";
import { RouteErrorView } from "@/components/common/route-error";
import { BackButton } from "@/components/ui/back-button";
import { Badge } from "@/components/ui/badge";
import { StatCard } from "@/components/ui/stat-card";
import { getCoupon, listCouponRedemptions } from "@/lib/api/coupons";
import { useFormat, useT } from "@/lib/i18n/locale-context";
import { queryKeys } from "@/lib/query/keys";
import { seo } from "@/lib/seo";

const REDEMPTIONS_PER_PAGE = 20;

export const Route = createFileRoute("/dashboard/coupons/$couponId")({
  head: () =>
    seo({
      description: "How a coupon has been used, and by whom.",
      path: "/dashboard/coupons",
      title: "Coupon"
    }),
  component: CouponDetailPage,
  errorComponent: RouteErrorView
} as never);

function CouponDetailPage(): JSX.Element {
  const { couponId } = Route.useParams();
  const t = useT();
  const format = useFormat();
  const [page, setPage] = useState(1);

  const couponQuery = useQuery({
    queryFn: async () => getCoupon(couponId),
    queryKey: queryKeys.coupons.detail(couponId)
  });

  const redemptionsQuery = useQuery({
    queryFn: async () =>
      listCouponRedemptions(couponId, { limit: REDEMPTIONS_PER_PAGE * page, page: 1 }),
    queryKey: queryKeys.coupons.redemptions(couponId, { page })
  });

  const coupon = couponQuery.data;
  const redemptions = redemptionsQuery.data?.data ?? [];
  const totalRedemptions = redemptionsQuery.data?.pagination.total ?? 0;

  if (couponQuery.isPending || !coupon) {
    // `/dashboard` is a layout route: the shell is already around this.
    return <CouponDetailSkeleton />;
  }

  return (
    <div className="space-y-6">
      <BackButton to="/dashboard/coupons" />

      <div className="space-y-3 border border-hairline bg-card p-4 sm:p-6">
        <div className="flex flex-wrap items-center gap-3">
          <h1 className="font-mono text-xl font-medium text-ink">{coupon.code}</h1>
          <CouponStateBadge state={coupon.state} />
          {coupon.isPublic ? <Badge tone="teal">{t("coupon.isPublic")}</Badge> : null}
          {coupon.isEditable ? null : <Badge tone="quiet">{t("coupon.readOnly")}</Badge>}
        </div>
        <p className="text-sm font-light text-muted">
          {coupon.course?.title ?? t("coupon.allCourses")} ·{" "}
          {coupon.kind === "PERCENT"
            ? format.percent(Number(coupon.value))
            : format.currency(coupon.value)}{" "}
          · {t("coupon.createdBy")}: {coupon.createdBy.name}
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard
          hue="teal"
          label={t("coupon.uses")}
          value={
            coupon.maxRedemptions === null
              ? format.number(coupon.redemptionCount)
              : t("coupon.usesOf", {
                  max: format.number(coupon.maxRedemptions),
                  used: format.number(coupon.redemptionCount)
                })
          }
        />
        <StatCard
          hue="indigo"
          label={t("coupon.totalDiscount")}
          value={format.currency(coupon.totalDiscount)}
        />
        <StatCard hue="violet" label={t("coupon.revenue")} value={format.currency(coupon.revenue)} />
        <StatCard
          hue="amber"
          label={t("coupon.expiresAt")}
          value={coupon.expiresAt ? format.date(coupon.expiresAt) : "—"}
        />
      </div>

      <CouponCharts coupon={coupon} />

      <div className="space-y-4">
        <h2 className="text-lg font-medium text-ink">{t("coupon.redemptions")}</h2>
        <CouponRedemptions
          hasMore={redemptions.length < totalRedemptions}
          isLoadingMore={redemptionsQuery.isFetching}
          onLoadMore={() => setPage((current) => current + 1)}
          redemptions={redemptions}
        />
      </div>
    </div>
  );
}
