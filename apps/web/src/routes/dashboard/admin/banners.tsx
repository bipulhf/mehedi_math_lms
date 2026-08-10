import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { createFileRoute } from "@tanstack/react-router";
import { BadgePercent, Plus } from "lucide-react";
import type { JSX } from "react";
import { useMemo, useState } from "react";
import { toast } from "sonner";

import { BannerFormModal, type BannerFormValues } from "@/components/banners/banner-form-modal";
import { RouteErrorView } from "@/components/common/route-error";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import type { DataTableColumn } from "@/components/ui/data-table";
import { DataTable } from "@/components/ui/data-table";
import { EmptyState } from "@/components/ui/empty-state";
import { Skeleton } from "@/components/ui/skeleton";
import type { Banner } from "@/lib/api/banners";
import { createBanner, deleteBanner, listBanners, updateBanner } from "@/lib/api/banners";
import { useT } from "@/lib/i18n/locale-context";
import { queryKeys } from "@/lib/query/keys";
import { seo } from "@/lib/seo";

export const Route = createFileRoute("/dashboard/admin/banners")({
  head: () =>
    seo({
      description: "Manage the promo banner shown above the site.",
      path: "/dashboard/admin/banners",
      title: "Banners"
    }),
  component: AdminBannersPage,
  errorComponent: RouteErrorView
} as never);

function AdminBannersPage(): JSX.Element {
  const t = useT();
  const queryClient = useQueryClient();

  const { data: banners = [], isPending: isLoading } = useQuery({
    queryFn: listBanners,
    queryKey: queryKeys.banners.list()
  });

  const [editing, setEditing] = useState<Banner | null>(null);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<Banner | null>(null);

  const invalidate = async (): Promise<void> => {
    await queryClient.invalidateQueries({ queryKey: queryKeys.banners.all() });
  };

  const saveMutation = useMutation({
    mutationFn: async (values: BannerFormValues) =>
      editing ? updateBanner(editing.id, values) : createBanner(values),
    onSuccess: async () => {
      toast.success(editing ? t("admin.banner.updated") : t("admin.banner.created"));
      setIsFormOpen(false);
      setEditing(null);
      await invalidate();
    }
  });

  const deleteMutation = useMutation({
    mutationFn: async (bannerId: string) => deleteBanner(bannerId),
    onSuccess: async () => {
      toast.success(t("admin.banner.deleted"));
      setDeleteTarget(null);
      await invalidate();
    }
  });

  const columns = useMemo<readonly DataTableColumn<Banner>[]>(
    () => [
      {
        cell: (banner) => <p className="max-w-md truncate">{banner.message}</p>,
        header: t("admin.banner.colMessage"),
        key: "message"
      },
      {
        cell: (banner) =>
          banner.linkUrl ? (
            <a className="text-accent underline" href={banner.linkUrl} rel="noreferrer" target="_blank">
              {banner.linkLabel || banner.linkUrl}
            </a>
          ) : (
            <span className="text-muted-light">—</span>
          ),
        header: t("admin.banner.colLink"),
        key: "link"
      },
      {
        cell: (banner) => (
          <Badge tone={banner.isActive ? "neutral" : "faded"}>
            {banner.isActive ? t("admin.banner.statusActive") : t("admin.banner.statusInactive")}
          </Badge>
        ),
        header: t("admin.banner.colStatus"),
        key: "status"
      },
      {
        align: "end",
        cell: (banner) => (
          <div className="flex justify-end gap-2">
            <Button
              onClick={() => {
                setEditing(banner);
                setIsFormOpen(true);
              }}
              size="sm"
              type="button"
              variant="outline"
            >
              {t("action.edit")}
            </Button>
            <Button onClick={() => setDeleteTarget(banner)} size="sm" type="button" variant="ghost">
              {t("action.delete")}
            </Button>
          </div>
        ),
        header: t("admin.banner.colActions"),
        key: "actions"
      }
    ],
    [t]
  );

  return (
    <div className="space-y-6">
      <div className="border border-hairline bg-card p-4 sm:p-6">
        <div className="flex flex-col gap-5 sm:flex-row sm:items-start sm:justify-between">
          <div className="flex min-w-0 items-start gap-3">
            <div
              aria-hidden="true"
              className="flex size-11 shrink-0 items-center justify-center border border-spectrum-amber/25 bg-spectrum-amber/10 text-spectrum-amber"
            >
              <BadgePercent className="size-5" />
            </div>
            <div className="min-w-0">
              <h1 className="text-2xl font-medium text-ink">{t("admin.banner.title")}</h1>
              <p className="mt-1 max-w-[60ch] text-sm font-light text-muted">{t("admin.banner.lead")}</p>
            </div>
          </div>
          <Button
            className="w-full sm:w-auto"
            onClick={() => {
              setEditing(null);
              setIsFormOpen(true);
            }}
            size="sm"
          >
            <Plus className="size-4" />
            {t("admin.banner.add")}
          </Button>
        </div>
      </div>

      {isLoading ? (
        <div className="border border-hairline bg-card p-6">
          <Skeleton className="mb-4 h-8 w-48" />
          <Skeleton className="h-4 w-full max-w-96" />
        </div>
      ) : (
        <DataTable
          columns={columns}
          emptyState={
            <div className="border border-hairline bg-card p-6">
              <EmptyState message={t("admin.banner.empty")} />
            </div>
          }
          rowKey={(banner) => banner.id}
          rows={banners}
        />
      )}

      <BannerFormModal
        banner={editing}
        isSaving={saveMutation.isPending}
        onClose={() => {
          setIsFormOpen(false);
          setEditing(null);
        }}
        onSubmit={(values) => saveMutation.mutate(values)}
        open={isFormOpen}
      />

      <ConfirmDialog
        cancelLabel={t("action.cancel")}
        confirmLabel={t("action.delete")}
        dangerous
        description={deleteTarget ? t("admin.banner.deleteConfirmBody") : ""}
        onCancel={() => setDeleteTarget(null)}
        onConfirm={() => {
          if (deleteTarget) {
            deleteMutation.mutate(deleteTarget.id);
          }
        }}
        open={deleteTarget !== null}
        pending={deleteMutation.isPending}
        title={t("admin.banner.deleteConfirmTitle")}
      />
    </div>
  );
}
