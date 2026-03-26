import { Link, createFileRoute } from "@tanstack/react-router";
import type { JSX } from "react";
import { useEffect, useState } from "react";

import { RouteErrorView } from "@/components/common/route-error";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import type { BugReportRecord } from "@/lib/api/bugs";
import { listMyBugReports } from "@/lib/api/bugs";

export const Route = createFileRoute("/dashboard/bugs/" as never)({
  component: MyBugReportsPage,
  errorComponent: RouteErrorView
} as never);

function statusTone(status: BugReportRecord["status"]): "amber" | "blue" | "gray" | "green" {
  if (status === "OPEN") {
    return "amber";
  }

  if (status === "IN_PROGRESS") {
    return "blue";
  }

  if (status === "RESOLVED") {
    return "green";
  }

  return "gray";
}

function MyBugReportsPage(): JSX.Element {
  const [bugs, setBugs] = useState<readonly BugReportRecord[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    void (async () => {
      setIsLoading(true);

      try {
        const nextBugs = await listMyBugReports();
        setBugs(nextBugs);
      } finally {
        setIsLoading(false);
      }
    })();
  }, []);

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="bg-surface-container-lowest/80 backdrop-blur-3xl rounded-4xl p-8 border border-outline-variant/40 shadow-xl relative w-full overflow-hidden">
           <Skeleton className="h-8 w-48 mb-4 bg-surface-container-highest" />
           <Skeleton className="h-4 w-full max-w-sm bg-surface-container-highest" />
        </div>
        <div className="space-y-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="bg-surface-container-lowest/80 backdrop-blur-3xl rounded-4xl p-8 border border-outline-variant/40 shadow-xl relative overflow-hidden">
              <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                <div className="space-y-3 flex-1">
                  <Skeleton className="h-6 w-1/3 bg-surface-container-highest" />
                  <Skeleton className="h-4 w-full bg-surface-container-highest" />
                  <Skeleton className="h-4 w-2/3 bg-surface-container-highest" />
                </div>
                <div className="flex flex-col gap-2 w-24">
                  <Skeleton className="h-6 w-full rounded-full bg-surface-container-highest" />
                  <Skeleton className="h-4 w-full bg-surface-container-highest" />
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
      <div className="bg-surface-container-lowest/80 backdrop-blur-3xl rounded-4xl p-8 sm:p-10 border border-outline-variant/40 shadow-xl relative w-full overflow-hidden group">
        <div className="absolute -top-12 -right-12 w-48 h-48 bg-primary/5 rounded-full blur-2xl pointer-events-none transition-all duration-1000 group-hover:bg-primary/10 z-[-1]"></div>
        <div className="flex flex-col gap-6 sm:flex-row sm:items-center sm:justify-between relative z-10">
          <div>
            <h3 className="font-headline text-3xl font-extrabold tracking-tight text-on-surface">My bug reports</h3>
            <p className="mt-2 text-sm text-on-surface-variant font-light max-w-2xl leading-relaxed">
              Track what you submitted, what is being investigated, and what has already been resolved.
            </p>
          </div>
          <Button asChild className="h-12 rounded-2xl px-6 font-headline font-semibold shadow-md transition-all hover:scale-105 active:scale-95">
            <Link to="/dashboard/bugs/report">Report a bug</Link>
          </Button>
        </div>
      </div>

      <div className="space-y-4">
        {bugs.length > 0 ? (
          bugs.map((bug) => (
            <div key={bug.id} className="bg-surface-container-lowest/80 backdrop-blur-3xl rounded-4xl border border-outline-variant/40 p-8 shadow-xl relative overflow-hidden group transition-all duration-300 hover:border-primary/20">
               <div className="absolute -top-8 -right-8 w-24 h-24 bg-primary/5 rounded-full blur-xl pointer-events-none group-hover:bg-primary/10 transition-colors z-[-1]"></div>
              <div className="flex flex-col gap-6 sm:flex-row sm:items-start sm:justify-between relative z-10">
                <div className="space-y-3 flex-1">
                  <p className="font-headline text-xl font-extrabold text-on-surface group-hover:text-primary transition-colors">{bug.title}</p>
                  <p className="text-sm leading-7 text-on-surface-variant font-light">{bug.description}</p>
                  {bug.adminNotes ? (
                    <div className="mt-4 rounded-2xl bg-surface-container-low/50 border border-outline-variant/10 p-4 shadow-inner">
                       <p className="text-[0.65rem] font-bold uppercase tracking-widest text-primary mb-1">Admin Response</p>
                       <p className="text-sm text-on-surface-variant font-light leading-relaxed italic">{bug.adminNotes}</p>
                    </div>
                  ) : null}
                </div>
                <div className="flex flex-col items-start sm:items-end gap-3 shrink-0">
                  <div className="flex gap-2">
                    <Badge tone={statusTone(bug.status)} className="rounded-full px-3">{bug.status}</Badge>
                    <Badge tone={bug.priority === "HIGH" ? "red" : bug.priority === "MEDIUM" ? "amber" : "blue"} className="rounded-full px-3">
                      {bug.priority}
                    </Badge>
                  </div>
                  <span className="text-[0.7rem] font-bold uppercase tracking-widest text-on-surface/40">
                    {new Date(bug.createdAt).toLocaleDateString("en-GB", { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })}
                  </span>
                </div>
              </div>
            </div>
          ))
        ) : (
          <div className="bg-surface-container-lowest/80 backdrop-blur-3xl rounded-4xl p-12 border border-outline-variant/40 shadow-xl text-center italic text-on-surface-variant font-light">
            No bug reports submitted yet.
          </div>
        )}
      </div>
    </div>
  );
}
