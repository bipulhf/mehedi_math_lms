import { useQuery } from "@tanstack/react-query";
import { Link, createFileRoute, useRouter } from "@tanstack/react-router";
import type { JSX, KeyboardEvent, MouseEvent } from "react";
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
import { stripHtml } from "@/lib/html";
import { queryKeys } from "@/lib/query/keys";
import { seo } from "@/lib/seo";
import { useT } from "@/lib/i18n/locale-context";

export const Route = createFileRoute("/dashboard/admin/bugs/")({
  head: () =>
    seo({
      description: "Every bug reported from the app or the web, in one queue.",
      path: "/dashboard/admin/bugs",
      title: "Bug Reports"
    }),
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
  const router = useRouter();

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

  const openBug = (bugId: string): void => {
    void router.navigate({ params: { id: bugId }, to: "/dashboard/admin/bugs/$id" });
  };

  const activateBugRow = (bugId: string, event: MouseEvent<HTMLElement>): void => {
    if ((event.target as HTMLElement).closest("a,button,input,select,textarea")) {
      return;
    }

    openBug(bugId);
  };

  const activateBugWithKeyboard = (bugId: string, event: KeyboardEvent<HTMLElement>): void => {
    if (event.key !== "Enter" && event.key !== " ") {
      return;
    }

    event.preventDefault();
    openBug(bugId);
  };

  if (isLoading) {
    return (
      <div className="space-y-8">
        <div className="bg-card/80 p-4 sm:p-6 lg:p-8 border border-hairline/40 relative w-full overflow-hidden">
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
    <div className="space-y-6">
      <div className="border border-hairline bg-card">
        <div className="border-b border-hairline p-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-xl font-medium text-ink">{t("admin.bugs.title")}</h1>
            <p className="mt-0.5 max-w-lg text-sm font-light text-muted">
              Review incoming reports, filter by urgency, and open the detail workspace for tactical resolution.
            </p>
          </div>
          <div className="flex flex-col sm:flex-row gap-3 flex-1 max-w-md">
            <div className="flex-1 space-y-1">
              <Label htmlFor="bug-status-filter">{t("admin.bugs.statusFilter")}</Label>
              <Select
                id="bug-status-filter"
                onChange={(event) => {
                  setStatus(event.target.value);
                  setPage(1);
                }}
                value={status}
              >
                <option value="">{t("admin.bugs.allStatuses")}</option>
                <option value="OPEN">{t("admin.bugs.open")}</option>
                <option value="IN_PROGRESS">{t("admin.bugs.inProgress")}</option>
                <option value="RESOLVED">{t("admin.bugs.resolved")}</option>
                <option value="CLOSED">{t("admin.bugs.closed")}</option>
              </Select>
            </div>
            <div className="flex-1 space-y-1">
              <Label htmlFor="bug-priority-filter">{t("admin.bugs.priorityFilter")}</Label>
              <Select
                id="bug-priority-filter"
                onChange={(event) => {
                  setPriority(event.target.value);
                  setPage(1);
                }}
                value={priority}
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
          <div className="p-4 sm:p-6 lg:p-8">
            <EmptyState message={t("admin.bugs.empty")} />
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full border-collapse text-left whitespace-nowrap">
              <thead>
                <tr className="border-b border-hairline bg-panel-warm/40 text-xs font-semibold uppercase tracking-wider text-muted-faint">
                  <th className="px-4 py-2.5">{t("admin.bugs.issue")}</th>
                  <th className="px-4 py-2.5">{t("admin.bugs.reporter")}</th>
                  <th className="px-4 py-2.5">{t("admin.bugs.state")}</th>
                  <th className="px-4 py-2.5 text-center">{t("admin.bugs.severity")}</th>
                  <th className="px-4 py-2.5">{t("admin.bugs.time")}</th>
                  <th className="px-4 py-2.5 text-right">{t("admin.bugs.actions")}</th>
                </tr>
              </thead>
              <tbody>
                {bugs.map((bug) => (
                  <tr
                    className="cursor-pointer border-b border-hairline-fainter transition-colors last:border-b-0 hover:bg-row-hover"
                    key={bug.id}
                    onClick={(event) => activateBugRow(bug.id, event)}
                    onKeyDown={(event) => activateBugWithKeyboard(bug.id, event)}
                    role="link"
                    tabIndex={0}
                  >
                    <td className="px-4 py-3 min-w-64">
                      <div className="flex flex-col max-w-sm">
                        <span className="text-sm font-medium text-ink truncate">{bug.title}</span>
                        <span className="text-xs font-light text-muted truncate">{stripHtml(bug.description)}</span>
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex flex-col">
                        <span className="text-sm font-medium text-ink">{bug.user.name}</span>
                        <span className="text-xs text-muted-faint">{bug.user.role}</span>
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <Badge tone={statusTone(bug.status)}>{bug.status.replace("_", " ")}</Badge>
                    </td>
                    <td className="px-4 py-3 text-center">
                      <Badge tone={priorityTone(bug.priority)}>{bug.priority}</Badge>
                    </td>
                    <td className="px-4 py-3 text-xs text-muted">
                      {new Date(bug.createdAt).toLocaleDateString("en-GB", { day: 'numeric', month: 'short', year: 'numeric' })}
                    </td>
                    <td className="px-4 py-3 text-right">
                      <Button asChild size="sm" variant="outline">
                        <Link to="/dashboard/admin/bugs/$id" params={{ id: bug.id }}>{t("admin.bugs.inspect")}</Link>
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        <div className="border-t border-hairline p-4 flex items-center justify-between">
          <p className="text-xs text-muted-faint">{t("admin.users.pageLabel")}<span className="text-ink font-medium">{page}</span> of <span className="text-ink font-medium">{totalPages}</span></p>
          <div className="flex gap-2">
            <Button size="sm" type="button" variant="outline" disabled={page <= 1} onClick={() => setPage(page - 1)}>{t("common.previous")}</Button>
            <Button
              disabled={page >= totalPages}
              onClick={() => setPage(page + 1)}
              size="sm"
              type="button"
              variant="outline"
            >{t("common.next")}</Button>
          </div>
        </div>
      </div>
    </div>
  );
}
