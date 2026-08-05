import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { createFileRoute } from "@tanstack/react-router";
import { Plus, Search } from "lucide-react";
import type { JSX } from "react";
import { useState } from "react";
import { toast } from "sonner";
import type { CouponState, UserRole } from "@genex/shared";
import type { MessageKey } from "@genex/i18n";

import { CouponFormModal, type CouponFormValues } from "@/components/coupons/coupon-form-modal";
import { CouponTable } from "@/components/coupons/coupon-table";
import { CouponListSkeleton } from "@/components/common/skeletons";
import { RouteErrorView } from "@/components/common/route-error";
import { Button } from "@/components/ui/button";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { EmptyState } from "@/components/ui/empty-state";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { useAuthSession } from "@/hooks/use-auth-session";
import type { CouponListItem } from "@/lib/api/coupons";
import { createCoupon, deleteCoupon, listCoupons, updateCoupon } from "@/lib/api/coupons";
import { useT } from "@/lib/i18n/locale-context";
import { queryKeys } from "@/lib/query/keys";
import { seo } from "@/lib/seo";

const COUPON_STATES: readonly CouponState[] = [
  "ACTIVE",
  "SCHEDULED",
  "EXPIRED",
  "EXHAUSTED",
  "DISABLED"
];

const COUPON_STATE_KEYS = {
  ACTIVE: "coupon.stateACTIVE",
  DISABLED: "coupon.stateDISABLED",
  EXHAUSTED: "coupon.stateEXHAUSTED",
  EXPIRED: "coupon.stateEXPIRED",
  SCHEDULED: "coupon.stateSCHEDULED"
} as const satisfies Record<CouponState, MessageKey>;

export const Route = createFileRoute("/dashboard/coupons/")({
  head: () =>
    seo({
      description: "Create and track the discount codes students type at checkout.",
      path: "/dashboard/coupons",
      title: "Coupons"
    }),
  component: CouponsPage,
  errorComponent: RouteErrorView
} as never);

/**
 * One page for every staff role, with the rows differing rather than the route.
 *
 * A teacher sees what they created, plus a read-only section of what an admin
 * aimed at a course they own — a discount on their own course is theirs to know
 * about, not theirs to cancel. An admin sees everything with the maker's name
 * beside it. An accountant sees everything and can change nothing. ADR-0013.
 */
function CouponsPage(): JSX.Element {
  const t = useT();
  const queryClient = useQueryClient();
  const { isPending: isSessionPending, session } = useAuthSession();
  const role = session?.session.role as UserRole | undefined;
  const isAdmin = role === "ADMIN";
  const isTeacher = role === "TEACHER";
  const canCreate = isAdmin || isTeacher;

  const [search, setSearch] = useState("");
  const [state, setState] = useState<CouponState | "">("");
  const [showOthers, setShowOthers] = useState(false);
  const [editing, setEditing] = useState<CouponListItem | null>(null);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<CouponListItem | null>(null);

  const filters = {
    limit: 50,
    othersOnCourses: isTeacher && showOthers ? true : undefined,
    page: 1,
    search: search.trim() || undefined,
    state: state || undefined
  };

  const couponsQuery = useQuery({
    enabled: !isSessionPending && role !== undefined && role !== "STUDENT",
    queryFn: async () => listCoupons(filters),
    queryKey: queryKeys.coupons.list(filters)
  });

  const invalidate = async (): Promise<void> => {
    await queryClient.invalidateQueries({ queryKey: queryKeys.coupons.all() });
  };

  const saveMutation = useMutation({
    mutationFn: async (values: CouponFormValues) =>
      editing ? updateCoupon(editing.id, values) : createCoupon(values),
    onSuccess: async () => {
      toast.success(editing ? t("coupon.updated") : t("coupon.created"));
      setIsFormOpen(false);
      setEditing(null);
      await invalidate();
    }
  });

  const deleteMutation = useMutation({
    mutationFn: async (couponId: string) => deleteCoupon(couponId),
    onSuccess: async () => {
      toast.success(t("coupon.deleted"));
      setDeleteTarget(null);
      await invalidate();
    }
  });

  const coupons = couponsQuery.data?.data ?? [];

  return (
    // No shell here: `/dashboard` is a layout route and already wraps every
    // child in `DashboardLayout`. Adding a second one drew the sidebar and the
    // top bar inside the page.
    <div className="space-y-6">
      <div className="border border-hairline bg-card p-4 sm:p-6">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <h1 className="text-xl font-medium text-ink">{t("coupon.title")}</h1>
            <p className="mt-0.5 max-w-[60ch] text-sm font-light text-muted">{t("coupon.lead")}</p>
          </div>
          {canCreate ? (
            <Button
              className="w-full sm:w-auto"
              onClick={() => {
                setEditing(null);
                setIsFormOpen(true);
              }}
              size="sm"
            >
              <Plus className="size-4" />
              {t("coupon.createTitle")}
            </Button>
          ) : null}
        </div>
      </div>

      <div className="space-y-4 border border-hairline bg-card p-4 sm:p-6">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
          <div className="relative flex-1">
            <Search
              aria-hidden="true"
              className="pointer-events-none absolute left-3 top-5 z-10 size-4 -translate-y-1/2 text-muted-faint"
            />
            <Input
              className="pl-9"
              onChange={(event) => setSearch(event.target.value)}
              placeholder={t("coupon.searchPlaceholder")}
              value={search}
            />
          </div>
          <div className="sm:w-48">
            <Select
              aria-label={t("coupon.filterState")}
              onChange={(event) => setState(event.target.value as CouponState | "")}
              value={state}
            >
              <option value="">{t("coupon.filterState")}</option>
              {COUPON_STATES.map((option) => (
                <option key={option} value={option}>
                  {t(COUPON_STATE_KEYS[option])}
                </option>
              ))}
            </Select>
          </div>
        </div>

        {isTeacher ? (
          <div className="space-y-2">
            <div className="flex flex-wrap gap-2">
              <Button
                onClick={() => setShowOthers(false)}
                size="sm"
                variant={showOthers ? "outline" : "ink"}
              >
                {t("coupon.mine")}
              </Button>
              <Button
                onClick={() => setShowOthers(true)}
                size="sm"
                variant={showOthers ? "ink" : "outline"}
              >
                {t("coupon.othersOnCourses")}
              </Button>
            </div>
            {showOthers ? (
              <p className="text-sm text-muted-light">{t("coupon.othersLead")}</p>
            ) : null}
          </div>
        ) : null}
      </div>

      {couponsQuery.isPending || isSessionPending ? (
        <CouponListSkeleton />
      ) : coupons.length === 0 ? (
        <div className="border border-hairline bg-card p-6">
          <EmptyState message={t("coupon.empty")} />
        </div>
      ) : (
        <div className="border border-hairline bg-card">
          <CouponTable
            coupons={coupons}
            onDelete={setDeleteTarget}
            onEdit={(coupon) => {
              setEditing(coupon);
              setIsFormOpen(true);
            }}
            showCreator={!isTeacher || showOthers}
          />
        </div>
      )}

      <CouponFormModal
        canTargetEveryCourse={isAdmin}
        coupon={editing}
        isSaving={saveMutation.isPending}
        onClose={() => {
          setIsFormOpen(false);
          setEditing(null);
        }}
        onSubmit={(values) => saveMutation.mutate(values)}
        open={isFormOpen}
        ownCoursesOnly={isTeacher}
      />

      <ConfirmDialog
        cancelLabel={t("action.cancel")}
        confirmLabel={t("coupon.delete")}
        dangerous
        description={deleteTarget ? t("coupon.deleteConfirmBody", { code: deleteTarget.code }) : ""}
        onCancel={() => setDeleteTarget(null)}
        onConfirm={() => {
          if (deleteTarget) {
            deleteMutation.mutate(deleteTarget.id);
          }
        }}
        open={deleteTarget !== null}
        pending={deleteMutation.isPending}
        title={t("coupon.deleteConfirmTitle")}
      />
    </div>
  );
}
