import { keepPreviousData, useQuery } from "@tanstack/react-query";
import { createFileRoute } from "@tanstack/react-router";
import type { JSX } from "react";
import { useEffect, useState } from "react";

import { RouteErrorView } from "@/components/common/route-error";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import type { AdminAuditLogRecord } from "@/lib/api/admin";
import { listAdminAuditLogActions, listAdminAuditLogs } from "@/lib/api/admin";
import { queryKeys } from "@/lib/query/keys";
import { seo } from "@/lib/seo";
import { useT } from "@/lib/i18n/locale-context";

export const Route = createFileRoute("/dashboard/admin/logs/")({
  head: () =>
    seo({
      description: "Every state-changing action taken across the platform, in one searchable feed.",
      path: "/dashboard/admin/logs",
      title: "Activity Logs"
    }),
  component: AdminLogsPage,
  errorComponent: RouteErrorView
} as never);

function formatAction(action: string): string {
  return action.replaceAll("_", " ").replaceAll(".", " · ");
}

function formatMetadata(metadata: AdminAuditLogRecord["metadata"]): string | null {
  if (!metadata) {
    return null;
  }

  const entries = Object.entries(metadata).filter(([, value]) => value !== null);

  if (entries.length === 0) {
    return null;
  }

  return entries.map(([key, value]) => `${key}: ${String(value)}`).join(" · ");
}

function AdminLogsPage(): JSX.Element {
  const t = useT();

  // Two states, on purpose. The input owns what is typed; the query key follows
  // 250ms later. Sending every keystroke means a request per character, and the
  // answers arrive out of order.
  const [actorSearchInput, setActorSearchInput] = useState("");
  const [actorSearch, setActorSearch] = useState("");
  const [action, setAction] = useState("");
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [page, setPage] = useState(1);

  useEffect(() => {
    const timeoutId = window.setTimeout(() => {
      setActorSearch(actorSearchInput.trim());
      setPage(1);
    }, 250);

    return () => {
      window.clearTimeout(timeoutId);
    };
  }, [actorSearchInput]);

  const { data: actions } = useQuery({
    queryFn: async () => listAdminAuditLogActions(),
    queryKey: queryKeys.admin.logActions()
  });

  const filters = { action, actorSearch, from, limit: 20, page, to };
  const { data, isPending } = useQuery({
    // Without this the page falls back to its skeleton on every refetch, which
    // unmounts the filter row -- and an input that unmounts mid-word takes the
    // caret with it. This is why typing in the search felt broken.
    placeholderData: keepPreviousData,
    queryFn: async () =>
      listAdminAuditLogs({
        action: action || undefined,
        actorSearch: actorSearch || undefined,
        from: from ? new Date(from).toISOString() : undefined,
        limit: 20,
        page,
        to: to ? new Date(to).toISOString() : undefined
      }),
    queryKey: queryKeys.admin.logs(filters)
  });

  const logs = data?.data ?? [];
  const totalPages = data?.pagination.pages ?? 1;
  // Only the first load has nothing to show. Every later one keeps the previous
  // page on screen while the new one arrives.
  const isFirstLoad = isPending && data === undefined;

  if (isFirstLoad) {
    return (
      <div className="space-y-6">
        <div className="border border-hairline bg-card p-4 sm:p-6 lg:p-8">
          <Skeleton className="mb-4 h-8 w-48" />
          <Skeleton className="mb-8 h-4 w-full max-w-sm" />
          <div className="mb-8 grid gap-6 md:grid-cols-4">
            <Skeleton className="h-12 w-full" />
            <Skeleton className="h-12 w-full" />
            <Skeleton className="h-12 w-full" />
            <Skeleton className="h-12 w-full" />
          </div>
          <div className="space-y-4">
            {Array.from({ length: 8 }).map((_, i) => (
              <Skeleton className="h-12 w-full" key={i} />
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
          <h1 className="text-xl font-medium text-ink">{t("admin.logs.title")}</h1>
          <p className="mt-0.5 max-w-lg text-sm font-light text-muted">{t("admin.logs.lead")}</p>

          <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <div className="space-y-1">
              <Label htmlFor="log-actor-search">{t("admin.logs.actorFilter")}</Label>
              <Input
                id="log-actor-search"
                onChange={(event) => setActorSearchInput(event.target.value)}
                placeholder={t("admin.logs.actorPlaceholder")}
                value={actorSearchInput}
              />
            </div>
            <div className="space-y-1">
              <Label htmlFor="log-action-filter">{t("admin.logs.actionFilter")}</Label>
              <Select
                id="log-action-filter"
                onValueChange={(next) => {
                  setAction(next);
                  setPage(1);
                }}
                options={[
                  { label: t("admin.logs.allActions"), value: "" },
                  ...(actions ?? []).map((value) => ({ label: formatAction(value), value }))
                ]}
                value={action}
              />
            </div>
            <div className="space-y-1">
              <Label htmlFor="log-from">{t("admin.logs.fromDate")}</Label>
              <Input
                id="log-from"
                onChange={(event) => {
                  setFrom(event.target.value);
                  setPage(1);
                }}
                type="date"
                value={from}
              />
            </div>
            <div className="space-y-1">
              <Label htmlFor="log-to">{t("admin.logs.toDate")}</Label>
              <Input
                id="log-to"
                onChange={(event) => {
                  setTo(event.target.value);
                  setPage(1);
                }}
                type="date"
                value={to}
              />
            </div>
          </div>
        </div>

        {logs.length === 0 ? (
          <div className="p-4 sm:p-6 lg:p-8">
            <EmptyState message={t("admin.logs.empty")} />
          </div>
        ) : (
          <div className="hidden overflow-x-auto md:block">
            <table className="w-full border-collapse text-left whitespace-nowrap">
              <thead>
                <tr className="border-b border-hairline bg-panel-warm/40 text-xs font-semibold uppercase tracking-wider text-muted-faint">
                  <th className="px-4 py-2.5">{t("admin.logs.action")}</th>
                  <th className="px-4 py-2.5">{t("admin.logs.actor")}</th>
                  <th className="px-4 py-2.5">{t("admin.logs.entity")}</th>
                  <th className="px-4 py-2.5">{t("admin.logs.details")}</th>
                  <th className="px-4 py-2.5">{t("admin.logs.when")}</th>
                </tr>
              </thead>
              <tbody>
                {logs.map((log) => (
                  <tr
                    className="border-b border-hairline-fainter transition-colors last:border-b-0 hover:bg-row-hover"
                    key={log.id}
                  >
                    <td className="px-4 py-3">
                      <Badge tone="neutral">{formatAction(log.action)}</Badge>
                    </td>
                    <td className="px-4 py-3">
                      {log.actor ? (
                        <div className="flex flex-col">
                          <span className="text-sm font-medium text-ink">{log.actor.name}</span>
                          <span className="text-xs text-muted-faint">{log.actor.email}</span>
                        </div>
                      ) : (
                        <span className="text-xs text-muted-faint">{t("admin.logs.unknownActor")}</span>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex flex-col">
                        <span className="text-sm text-ink">{log.entityType}</span>
                        <span className="max-w-40 truncate text-xs text-muted-faint font-mono">
                          {log.entityId}
                        </span>
                      </div>
                    </td>
                    <td className="px-4 py-3 max-w-72">
                      <span className="block truncate text-xs font-light text-muted">
                        {formatMetadata(log.metadata) ?? "—"}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-xs text-muted">
                      {new Date(log.createdAt).toLocaleString("en-GB", {
                        day: "numeric",
                        hour: "2-digit",
                        minute: "2-digit",
                        month: "short",
                        year: "numeric"
                      })}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* An audit row is five columns of which two are identifiers; on a phone
            it reads as a stacked entry rather than a sideways scroll. */}
        {logs.length === 0 ? null : (
          <div className="divide-y divide-hairline-fainter md:hidden">
            {logs.map((log) => (
              <div className="space-y-2 p-4" key={log.id}>
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <Badge tone="neutral">{formatAction(log.action)}</Badge>
                  <span className="text-xs text-muted">
                    {new Date(log.createdAt).toLocaleString("en-GB", {
                      day: "numeric",
                      hour: "2-digit",
                      minute: "2-digit",
                      month: "short",
                      year: "numeric"
                    })}
                  </span>
                </div>

                {log.actor ? (
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium text-ink">{log.actor.name}</p>
                    <p className="truncate text-xs text-muted-faint">{log.actor.email}</p>
                  </div>
                ) : (
                  <p className="text-xs text-muted-faint">{t("admin.logs.unknownActor")}</p>
                )}

                <p className="text-sm text-ink">
                  {log.entityType}
                  <span className="ml-2 font-mono text-xs text-muted-faint">{log.entityId}</span>
                </p>

                <p className="break-words text-xs font-light text-muted">
                  {formatMetadata(log.metadata) ?? "\u2014"}
                </p>
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
