import { useQuery } from "@tanstack/react-query";
import { Link, createFileRoute } from "@tanstack/react-router";
import type { JSX } from "react";
import { useState } from "react";

import { RouteErrorView } from "@/components/common/route-error";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { Skeleton } from "@/components/ui/skeleton";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import type { AdminBugRecord } from "@/lib/api/admin";
import { listAdminBugs } from "@/lib/api/admin";
import { queryKeys } from "@/lib/query/keys";
import { useT } from "@/lib/i18n/locale-context";

export const Route = createFileRoute("/dashboard/admin/bugs")({
  component: AdminBugsPage,
  errorComponent: RouteErrorView
} as never);

function statusTone(status: AdminBugRecord["status"]): "attention" | "neutral" | "quiet" | "neutral" {
  if (status === "OPEN") {
    return "attention";
  }

  if (status === "IN_PROGRESS") {
    return "neutral";
  }

  if (status === "RESOLVED") {
    return "neutral";
  }

  return "quiet";
}

function priorityTone(priority: AdminBugRecord["priority"]): "attention" | "neutral" | "attention" {
  if (priority === "HIGH") {
    return "attention";
  }

  if (priority === "MEDIUM") {
    return "attention";
  }

  return "neutral";
}

function AdminBugsPage(): JSX.Element {
  const t = useT();

  const [status, setStatus] = useState("");
  const [priority, setPriority] = useState("");
  const [page, setPage] = useState(1);
  const { data, isPending: isLoading } = useQuery({
    queryFn: async () =>
      listAdminBugs({
        limit: 10,
        page,
        priority: priority ? (priority as AdminBugRecord["priority"]) : undefined,
        status: status ? (status as AdminBugRecord["status"]) : undefined
      }),
    queryKey: queryKeys.admin.bugs({ limit: 10, page, priority, status })
  });
  const bugs = data?.data ?? [];
  const totalPages = data?.pagination.pages ?? 1;

  if (isLoading) {
    return (
      <div className="space-y-8">
        <div className="bg-card/80 p-8 border border-hairline/40 relative w-full overflow-hidden">
           <Skeleton className="h-8 w-48 mb-4 bg-chip-active" />
           <Skeleton className="h-4 w-full max-w-sm bg-chip-active mb-8" />
           <div className="grid gap-6 md:grid-cols-2 mb-8">
              <Skeleton className="h-12 w-full bg-chip-active" />
              <Skeleton className="h-12 w-full bg-chip-active" />
           </div>
           <div className="space-y-4">
              {Array.from({ length: 6 }).map((_, i) => (
                <Skeleton key={i} className="h-16 w-full bg-chip-active" />
              ))}
           </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <div className="bg-card/80 border border-hairline/40 relative w-full overflow-hidden group">
        
        <div className="p-8 sm:p-10 border-b border-hairline/30 flex flex-col gap-6 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h3 className="font-body text-3xl font-medium tracking-tight text-ink">{t("admin.bugs.title")}</h3>
            <p className="mt-2 text-sm text-muted font-light max-w-lg leading-relaxed">
              Review incoming reports, filter by urgency, and open the detail workspace for tactical resolution.
            </p>
          </div>
          <div className="flex flex-col sm:flex-row gap-4 flex-1 max-w-2xl">
            <div className="flex-1 space-y-2">
              <Label className="text-[0.65rem] font-bold uppercase tracking-widest text-ink/40 pl-1">{t("admin.bugs.statusFilter")}</Label>
              <Select
                id="bug-status-filter"
                className="h-11 bg-panel-warm/30 border-hairline/20 font-body"
                value={status}
                onChange={(event) => {
                  setStatus(event.target.value);
                  setPage(1);
                }}
              >
                <option value="">{t("admin.bugs.allStatuses")}</option>
                <option value="OPEN">{t("admin.bugs.open")}</option>
                <option value="IN_PROGRESS">{t("admin.bugs.inProgress")}</option>
                <option value="RESOLVED">{t("admin.bugs.resolved")}</option>
                <option value="CLOSED">{t("admin.bugs.closed")}</option>
              </Select>
            </div>
            <div className="flex-1 space-y-2">
              <Label className="text-[0.65rem] font-bold uppercase tracking-widest text-ink/40 pl-1">{t("admin.bugs.priorityFilter")}</Label>
              <Select
                id="bug-priority-filter"
                className="h-11 bg-panel-warm/30 border-hairline/20 font-body"
                value={priority}
                onChange={(event) => {
                  setPriority(event.target.value);
                  setPage(1);
                }}
              >
                <option value="">{t("admin.bugs.allPriorities")}</option>
                <option value="LOW">{t("admin.bugs.low")}</option>
                <option value="MEDIUM">{t("admin.bugs.medium")}</option>
                <option value="HIGH">{t("admin.bugs.high")}</option>
              </Select>
            </div>
          </div>
        </div>

        {bugs.length === 0 ? (
          <div className="p-8">
            <EmptyState message={t("admin.bugs.empty")} />
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full border-collapse text-left whitespace-nowrap">
              <thead>
                <tr className="bg-panel-warm/30 border-b border-hairline/20 font-bold text-[0.65rem] uppercase tracking-widest text-ink/50">
                  <th className="px-10 py-5">{t("admin.bugs.issue")}</th>
                  <th className="px-10 py-5">{t("admin.bugs.reporter")}</th>
                  <th className="px-10 py-5">{t("admin.bugs.state")}</th>
                  <th className="px-10 py-5 text-center">{t("admin.bugs.severity")}</th>
                  <th className="px-10 py-5">{t("admin.bugs.time")}</th>
                  <th className="px-10 py-5 text-right">{t("admin.bugs.actions")}</th>
                </tr>
              </thead>
              <tbody>
                {bugs.map((bug) => (
                  <tr key={bug.id} className="group border-t border-hairline/10 transition-all hover:bg-ink/2">
                    <td className="px-10 py-6 min-w-75">
                      <div className="flex flex-col max-w-sm">
                        <span className="font-body text-base font-medium text-ink tracking-tight group-hover:text-ink transition-colors truncate">{bug.title}</span>
                        <span className="text-xs text-muted font-light mt-0.5 line-clamp-1 opacity-60 italic">{bug.description}</span>
                      </div>
                    </td>
                    <td className="px-10 py-6">
                      <div className="flex flex-col">
                        <span className="font-bold text-ink text-sm tracking-tight">{bug.user.name}</span>
                        <span className="text-[0.6rem] uppercase tracking-widest text-ink/40 font-bold mt-0.5">{bug.user.role}</span>
                      </div>
                    </td>
                    <td className="px-10 py-6">
                      <Badge tone={statusTone(bug.status)} className="rounded-full px-3 font-semibold text-[0.65rem] uppercase tracking-widest">{bug.status.replace("_", " ")}</Badge>
                    </td>
                    <td className="px-10 py-6 text-center">
                      <Badge tone={priorityTone(bug.priority)} className="rounded-full px-3 font-semibold text-[0.65rem] uppercase tracking-widest">{bug.priority}</Badge>
                    </td>
                    <td className="px-10 py-6">
                      <span className="text-xs text-ink/40 font-bold uppercase tracking-tighter">
                        {new Date(bug.createdAt).toLocaleDateString("en-GB", { day: 'numeric', month: 'short', year: 'numeric' })}
                      </span>
                    </td>
                    <td className="px-10 py-6 text-right">
                      <Button asChild size="sm" variant="outline" className="h-9 border-hairline/30 hover:bg-chip-active transition-all font-bold text-[0.65rem] uppercase tracking-widest">
                        <Link to="/dashboard/admin/bugs/$id" params={{ id: bug.id }}>{t("admin.bugs.inspect")}</Link>
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        <div className="p-8 border-t border-hairline/20 flex flex-col sm:flex-row items-center justify-between gap-6">
          <p className="text-[0.65rem] font-bold uppercase tracking-widest text-ink/40">{t("admin.users.pageLabel")}<span className="text-ink">{page}</span> of <span className="text-ink">{totalPages}</span></p>
          <div className="flex gap-3">
            <Button size="sm" type="button" variant="outline" disabled={page <= 1} onClick={() => setPage(page - 1)} className="h-10 px-6 border-hairline/30 font-bold text-[0.65rem] uppercase tracking-widest transition-all disabled:opacity-30 disabled:">{t("common.previous")}</Button>
            <Button
              size="sm"
              type="button"
              variant="outline"
              disabled={page >= totalPages}
              onClick={() => setPage(page + 1)}
              className="h-10 px-6 border-hairline/30 font-bold text-[0.65rem] uppercase tracking-widest transition-all disabled:opacity-30 disabled:"
            >{t("common.next")}</Button>
          </div>
        </div>
      </div>
    </div>
  );
}
