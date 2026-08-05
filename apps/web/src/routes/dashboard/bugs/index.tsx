import { useQuery } from "@tanstack/react-query";
import { Link, createFileRoute } from "@tanstack/react-router";
import type { JSX } from "react";

import { RouteErrorView } from "@/components/common/route-error";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import type { BugReportRecord } from "@/lib/api/bugs";
import { listMyBugReports } from "@/lib/api/bugs";
import { stripHtml } from "@/lib/html";
import { queryKeys } from "@/lib/query/keys";
import { seo } from "@/lib/seo";
import { useT } from "@/lib/i18n/locale-context";

export const Route = createFileRoute("/dashboard/bugs/")({
  head: () =>
    seo({
      description: "Bugs you have reported and their current status.",
      path: "/dashboard/bugs",
      title: "My Bug Reports"
    }),
  component: MyBugReportsPage,
  errorComponent: RouteErrorView
} as never);

function statusTone(status: BugReportRecord["status"]): "attention" | "neutral" | "quiet" | "neutral" {
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

function MyBugReportsPage(): JSX.Element {
  const t = useT();

  const { data: bugs = [], isPending: isLoading } = useQuery<readonly BugReportRecord[]>({
    queryFn: async () => listMyBugReports(),
    queryKey: queryKeys.bugs.mine()
  });

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="bg-card p-4 sm:p-6 lg:p-8 border border-hairline relative w-full overflow-hidden">
           <Skeleton className="h-8 w-48 mb-4" />
           <Skeleton className="h-4 w-full max-w-sm" />
        </div>
        <div className="space-y-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="bg-card p-4 sm:p-6 lg:p-8 border border-hairline relative overflow-hidden">
              <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                <div className="space-y-3 flex-1">
                  <Skeleton className="h-6 w-1/3" />
                  <Skeleton className="h-4 w-full" />
                  <Skeleton className="h-4 w-2/3" />
                </div>
                <div className="flex flex-col gap-2 w-24">
                  <Skeleton className="h-6 w-full rounded-full" />
                  <Skeleton className="h-4 w-full" />
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="bg-card p-4 sm:p-6 lg:p-10 border border-hairline relative w-full overflow-hidden group">
        <div className="flex flex-col gap-6 sm:flex-row sm:items-center sm:justify-between relative z-10">
          <div>
            <h3 className="font-body text-3xl font-medium tracking-tight text-ink">{t("bugs.mineTitle")}</h3>
            <p className="mt-2 text-sm text-muted font-light max-w-2xl leading-relaxed">{t("bugs.mineLead")}</p>
          </div>
          <Button asChild className="h-12 px-6 font-body font-semibold transition-all">
            <Link to="/dashboard/bugs/report">{t("bugs.report")}</Link>
          </Button>
        </div>
      </div>

      <div className="space-y-4">
        {bugs.length > 0 ? (
          bugs.map((bug) => (
            <div key={bug.id} className="bg-card border border-hairline p-4 sm:p-6 lg:p-8 relative overflow-hidden group transition-all hover:border-ink/20">
               <div className="absolute -top-8 -right-8 w-24 h-24 bg-ink/5 rounded-full blur-xl pointer-events-none group-hover:bg-ink/10 transition-colors z-[-1]"></div>
              <div className="flex flex-col gap-6 sm:flex-row sm:items-start sm:justify-between relative z-10">
                <div className="space-y-3 flex-1">
                  <p className="font-body text-xl font-medium text-ink group-hover:text-ink transition-colors">{bug.title}</p>
                  <p className="text-sm leading-7 text-muted font-light">{stripHtml(bug.description)}</p>
                  {bug.adminNotes ? (
                    <div className="mt-4 bg-panel-warm/50 border border-hairline/10 p-4">
                       <p className="text-[0.65rem] font-bold uppercase tracking-widest text-ink mb-1">{t("bugs.adminResponse")}</p>
                       <p className="text-sm text-muted font-light leading-relaxed italic">{bug.adminNotes}</p>
                    </div>
                  ) : null}
                </div>
                <div className="flex flex-col items-start sm:items-end gap-3 shrink-0">
                  <div className="flex gap-2">
                    <Badge tone={statusTone(bug.status)} className="rounded-full px-3">{bug.status}</Badge>
                    <Badge tone={bug.priority === "HIGH" ? "attention" : bug.priority === "MEDIUM" ? "attention" : "neutral"} className="rounded-full px-3">
                      {bug.priority}
                    </Badge>
                  </div>
                  <span className="text-[0.7rem] font-bold uppercase tracking-widest text-ink/40">
                    {new Date(bug.createdAt).toLocaleDateString("en-GB", { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })}
                  </span>
                </div>
              </div>
            </div>
          ))
        ) : (
          <div className="bg-card p-6 sm:p-10 lg:p-12 border border-hairline text-center italic text-muted font-light">{t("bugs.mineEmpty")}</div>
        )}
      </div>
    </div>
  );
}
