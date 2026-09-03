import { keepPreviousData, useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Link, createFileRoute } from "@tanstack/react-router";
import type { JSX } from "react";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import type { DeviceConflictStatus } from "@genex/shared";
import { deviceConflictStatusValues } from "@genex/shared";

import { RouteErrorView } from "@/components/common/route-error";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import type { AdminDeviceConflictRecord } from "@/lib/api/admin";
import {
  listAdminDeviceConflicts,
  listAdminUserDevices,
  resetAdminUserDevices,
  resolveAdminDeviceConflict,
  setAdminUserDevicePolicy
} from "@/lib/api/admin";
import { queryKeys } from "@/lib/query/keys";
import { seo } from "@/lib/seo";
import { useT } from "@/lib/i18n/locale-context";

export const Route = createFileRoute("/dashboard/admin/devices")({
  head: () =>
    seo({
      description: "Sign-ins refused because an account was already in use on its allowed devices.",
      path: "/dashboard/admin/devices",
      title: "Device conflicts"
    }),
  component: AdminDevicesPage,
  errorComponent: RouteErrorView
} as never);

function formatWhen(value: string): string {
  return new Date(value).toLocaleString("en-GB", {
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    month: "short",
    year: "numeric"
  });
}

function statusTone(status: DeviceConflictStatus): "attention" | "faded" | "teal" {
  if (status === "OPEN") {
    return "attention";
  }

  return status === "REVIEWED" ? "teal" : "faded";
}

/**
 * The devices behind one account, opened from the row rather than shown in it.
 * A conflict is a claim that two people are using one login, and the list of
 * devices — with which of them is signed in right now — is the evidence for
 * or against it.
 */
function DeviceList({ userId }: { userId: string }): JSX.Element {
  const t = useT();
  const { data, isPending } = useQuery({
    queryFn: async () => listAdminUserDevices(userId),
    queryKey: queryKeys.admin.devices(userId)
  });

  if (isPending) {
    return <Skeleton className="h-16 w-full" />;
  }

  if (!data || data.length === 0) {
    return <p className="text-xs text-muted-faint">{t("admin.devices.noDevices")}</p>;
  }

  return (
    <ul className="space-y-2">
      {data.map((device) => (
        <li className="flex flex-wrap items-center gap-2 text-xs text-muted" key={device.id}>
          <Badge tone={device.hasLiveSession ? "teal" : "faded"}>
            {device.hasLiveSession ? t("admin.devices.live") : t("admin.devices.idle")}
          </Badge>
          <span className="font-mono text-muted-faint">{device.deviceId}</span>
          <span>{device.platform}</span>
          <span>{device.lastIpAddress ?? "—"}</span>
          <span>{formatWhen(device.lastSeenAt)}</span>
        </li>
      ))}
    </ul>
  );
}

function ConflictActions({
  conflict,
  onDone
}: {
  conflict: AdminDeviceConflictRecord;
  onDone: () => Promise<void>;
}): JSX.Element {
  const t = useT();
  const [isOpen, setIsOpen] = useState(false);

  const resolve = useMutation({
    mutationFn: async (status: DeviceConflictStatus) =>
      resolveAdminDeviceConflict(conflict.id, { status }),
    onSuccess: async () => {
      await onDone();
    }
  });
  const policy = useMutation({
    mutationFn: async (allowed: boolean) => setAdminUserDevicePolicy(conflict.user.id, allowed),
    onSuccess: async () => {
      toast.success(t("admin.devices.policySaved"));
      await onDone();
    }
  });
  const reset = useMutation({
    mutationFn: async () => resetAdminUserDevices(conflict.user.id),
    onSuccess: async () => {
      toast.success(t("admin.devices.resetDone"));
      await onDone();
    }
  });

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap gap-2">
        {conflict.status === "OPEN" ? (
          <>
            <Button
              disabled={resolve.isPending}
              onClick={() => resolve.mutate("REVIEWED")}
              size="sm"
              type="button"
              variant="outline"
            >
              {t("admin.devices.markReviewed")}
            </Button>
            <Button
              disabled={resolve.isPending}
              onClick={() => resolve.mutate("DISMISSED")}
              size="sm"
              type="button"
              variant="outline"
            >
              {t("admin.devices.dismiss")}
            </Button>
          </>
        ) : (
          <Button
            disabled={resolve.isPending}
            onClick={() => resolve.mutate("OPEN")}
            size="sm"
            type="button"
            variant="outline"
          >
            {t("admin.devices.reopen")}
          </Button>
        )}

        {/* The toggle the limit exists to have an exception to. */}
        <Button
          disabled={policy.isPending}
          onClick={() => policy.mutate(!conflict.user.multiDeviceAllowed)}
          size="sm"
          type="button"
          variant={conflict.user.multiDeviceAllowed ? "outline" : "ink"}
        >
          {conflict.user.multiDeviceAllowed
            ? t("admin.devices.enforceLimit")
            : t("admin.devices.allowMore")}
        </Button>

        <Button
          disabled={reset.isPending}
          onClick={() => reset.mutate()}
          size="sm"
          type="button"
          variant="outline"
        >
          {t("admin.devices.signOutEverywhere")}
        </Button>

        <Button asChild size="sm" type="button" variant="outline">
          <Link params={{ id: conflict.user.id }} to="/dashboard/admin/users/$id">
            {t("admin.devices.openUser")}
          </Link>
        </Button>

        <Button onClick={() => setIsOpen(!isOpen)} size="sm" type="button" variant="accentLink">
          {isOpen ? t("admin.devices.hideDevices") : t("admin.devices.showDevices")}
        </Button>
      </div>

      {isOpen ? <DeviceList userId={conflict.user.id} /> : null}
    </div>
  );
}

function AdminDevicesPage(): JSX.Element {
  const t = useT();
  const queryClient = useQueryClient();

  // Two states for the search, as on the logs page: the input owns what is
  // typed, the query key follows 250ms later.
  const [searchInput, setSearchInput] = useState("");
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState<"" | DeviceConflictStatus>("OPEN");
  const [page, setPage] = useState(1);

  useEffect(() => {
    const timeoutId = window.setTimeout(() => {
      setSearch(searchInput.trim());
      setPage(1);
    }, 250);

    return () => {
      window.clearTimeout(timeoutId);
    };
  }, [searchInput]);

  const filters = { limit: 20, page, search, status };
  const { data, isPending } = useQuery({
    placeholderData: keepPreviousData,
    queryFn: async () =>
      listAdminDeviceConflicts({
        limit: 20,
        page,
        search: search || undefined,
        status: status || undefined
      }),
    queryKey: queryKeys.admin.deviceConflicts(filters)
  });

  const refresh = async (): Promise<void> => {
    await queryClient.invalidateQueries({ queryKey: queryKeys.admin.all() });
  };

  const conflicts = data?.data ?? [];
  const totalPages = data?.pagination.pages ?? 1;
  const isFirstLoad = isPending && data === undefined;

  if (isFirstLoad) {
    return (
      <div className="space-y-6">
        <div className="border border-hairline bg-card p-4 sm:p-6 lg:p-8">
          <Skeleton className="mb-4 h-8 w-56" />
          <Skeleton className="mb-8 h-4 w-full max-w-md" />
          <div className="space-y-4">
            {Array.from({ length: 6 }).map((_, index) => (
              <Skeleton className="h-20 w-full" key={index} />
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="border border-hairline bg-card">
        <div className="border-b border-hairline p-6">
          <h1 className="text-xl font-medium text-ink">{t("admin.devices.title")}</h1>
          <p className="mt-0.5 max-w-2xl text-sm font-light text-muted">
            {t("admin.devices.lead")}
          </p>

          <div className="mt-6 grid gap-4 sm:grid-cols-2">
            <div className="space-y-1">
              <Label htmlFor="device-search">{t("admin.devices.searchLabel")}</Label>
              <Input
                id="device-search"
                onChange={(event) => setSearchInput(event.target.value)}
                placeholder={t("admin.devices.searchPlaceholder")}
                value={searchInput}
              />
            </div>
            <div className="space-y-1">
              <Label htmlFor="device-status">{t("admin.devices.statusLabel")}</Label>
              <Select
                id="device-status"
                onValueChange={(next) => {
                  setStatus(next as "" | DeviceConflictStatus);
                  setPage(1);
                }}
                options={[
                  { label: t("admin.devices.allStatuses"), value: "" },
                  ...deviceConflictStatusValues.map((value) => ({
                    label: t(`admin.devices.status.${value}` as never),
                    value
                  }))
                ]}
                value={status}
              />
            </div>
          </div>
        </div>

        {conflicts.length === 0 ? (
          <div className="p-4 sm:p-6 lg:p-8">
            <EmptyState message={t("admin.devices.empty")} />
          </div>
        ) : (
          <div className="divide-y divide-hairline-fainter">
            {conflicts.map((conflict) => (
              <div className="space-y-3 p-4 sm:p-6" key={conflict.id}>
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium text-ink">{conflict.user.name}</p>
                    <p className="truncate text-xs text-muted-faint">{conflict.user.email}</p>
                  </div>
                  <div className="flex flex-wrap items-center gap-2">
                    {conflict.user.isActive ? null : (
                      <Badge tone="attention">{t("admin.devices.userDisabled")}</Badge>
                    )}
                    {conflict.user.multiDeviceAllowed ? (
                      <Badge tone="neutral">{t("admin.devices.exempt")}</Badge>
                    ) : null}
                    <Badge tone={statusTone(conflict.status)}>
                      {t(`admin.devices.status.${conflict.status}` as never)}
                    </Badge>
                    <span className="text-xs text-muted">{formatWhen(conflict.createdAt)}</span>
                  </div>
                </div>

                <p className="text-sm text-muted">
                  {t("admin.devices.summary", {
                    count: String(conflict.activeDeviceCount),
                    limit: String(conflict.deviceLimit)
                  })}
                </p>

                <dl className="grid gap-1 text-xs text-muted-faint sm:grid-cols-3">
                  <div className="flex gap-2">
                    <dt>{t("admin.devices.attemptedDevice")}:</dt>
                    <dd className="truncate font-mono">{conflict.attemptedDeviceId ?? "—"}</dd>
                  </div>
                  <div className="flex gap-2">
                    <dt>{t("admin.devices.platform")}:</dt>
                    <dd>{conflict.attemptedPlatform}</dd>
                  </div>
                  <div className="flex gap-2">
                    <dt>{t("admin.devices.ip")}:</dt>
                    <dd>{conflict.attemptedIpAddress ?? "—"}</dd>
                  </div>
                </dl>

                <ConflictActions conflict={conflict} onDone={refresh} />
              </div>
            ))}
          </div>
        )}

        <div className="flex items-center justify-between gap-4 border-t border-hairline p-4">
          <p className="text-xs text-muted-faint">
            {t("admin.users.pageLabel")}
            <span className="font-medium text-ink">{page}</span> of{" "}
            <span className="font-medium text-ink">{totalPages}</span>
          </p>
          <div className="flex gap-2">
            <Button
              disabled={page <= 1}
              onClick={() => setPage(page - 1)}
              size="sm"
              type="button"
              variant="outline"
            >
              {t("common.previous")}
            </Button>
            <Button
              disabled={page >= totalPages}
              onClick={() => setPage(page + 1)}
              size="sm"
              type="button"
              variant="outline"
            >
              {t("common.next")}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
