import { useQuery } from "@tanstack/react-query";
import { createFileRoute } from "@tanstack/react-router";
import type { JSX } from "react";
import { useState } from "react";
import type { UserRole } from "@genex/shared";

import { CouponCharts } from "@/components/coupons/coupon-charts";
import { CouponRedemptions } from "@/components/coupons/coupon-redemptions";
import { CouponStateBadge } from "@/components/coupons/coupon-state-badge";
import { CouponDetailSkeleton } from "@/components/common/skeletons";
import { RouteErrorView } from "@/components/common/route-error";
import { DashboardLayout } from "@/components/layout/dashboard-layout";
import { BackButton } from "@/components/ui/back-button";
import { Badge } from "@/components/ui/badge";
import { useAuthSession } from "@/hooks/use-auth-session";
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

function Figure({ label, value }: { label: string; value: string }): JSX.Element {
  return (
    <div className="border border-hairline bg-card p-4 sm:p-5">
      <p className="text-xs uppercase tracking-wide text-muted-faint">{label}</p>
      <p className="mt-1.5 text-xl font-medium text-ink sm:text-2xl">{value}</p>
    </div>
  );
}

function CouponDetailPage(): JSX.Element {
  const { couponId } = Route.useParams();
  const t = useT();
  const format = useFormat();
  const { isPending: isSessionPending, session } = useAuthSession();
  const role = session?.session.role as UserRole | undefined;
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
    return (
      <DashboardLayout isLoading={isSessionPending} {...(role ? { role } : {})}>
        <CouponDetailSkeleton />
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout isLoading={isSessionPending} {...(role ? { role } : {})}>
      <div className="space-y-8">
        <div className="space-y-4">
          <BackButton to="/dashboard/coupons" />
          <div className="flex flex-wrap items-center gap-3">
            <h1 className="font-mono text-2xl font-medium text-ink">{coupon.code}</h1>
            <CouponStateBadge state={coupon.state} />
            {coupon.isPublic ? <Badge tone="teal">{t("coupon.isPublic")}</Badge> : null}
            {coupon.isEditable ? null : <Badge tone="quiet">{t("coupon.readOnly")}</Badge>}
          </div>
          <p className="text-sm text-muted">
            {coupon.course?.title ?? t("coupon.allCourses")} ·{" "}
            {coupon.kind === "PERCENT"
              ? format.percent(Number(coupon.value))
              : format.currency(coupon.value)}{" "}
            · {t("coupon.createdBy")}: {coupon.createdBy.name}
          </p>
        </div>

        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <Figure
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
          <Figure label={t("coupon.totalDiscount")} value={format.currency(coupon.totalDiscount)} />
          <Figure label={t("coupon.revenue")} value={format.currency(coupon.revenue)} />
          <Figure
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
    </DashboardLayout>
  );
}
