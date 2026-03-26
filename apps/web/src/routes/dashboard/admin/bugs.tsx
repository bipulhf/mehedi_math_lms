import { Link, createFileRoute } from "@tanstack/react-router";
import type { JSX } from "react";
import { useEffect, useState } from "react";

import { RouteErrorView } from "@/components/common/route-error";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import type { AdminBugRecord } from "@/lib/api/admin";
import { listAdminBugs } from "@/lib/api/admin";

export const Route = createFileRoute("/dashboard/admin/bugs" as never)({
  component: AdminBugsPage,
  errorComponent: RouteErrorView
} as never);

function statusTone(status: AdminBugRecord["status"]): "amber" | "blue" | "gray" | "green" {
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

function priorityTone(priority: AdminBugRecord["priority"]): "amber" | "blue" | "red" {
  if (priority === "HIGH") {
    return "red";
  }

  if (priority === "MEDIUM") {
    return "amber";
  }

  return "blue";
}

function AdminBugsPage(): JSX.Element {
  const [bugs, setBugs] = useState<readonly AdminBugRecord[]>([]);
  const [status, setStatus] = useState("");
  const [priority, setPriority] = useState("");
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    void (async () => {
      setIsLoading(true);

      try {
        const response = await listAdminBugs({
          limit: 10,
          page,
          priority: priority ? (priority as AdminBugRecord["priority"]) : undefined,
          status: status ? (status as AdminBugRecord["status"]) : undefined
        });

        setBugs(response.data);
        setTotalPages(response.pagination.pages);
      } finally {
        setIsLoading(false);
      }
    })();
  }, [page, priority, status]);

  if (isLoading) {
    return (
      <div className="space-y-8 animate-pulse">
        <div className="bg-surface-container-lowest/80 backdrop-blur-3xl rounded-4xl p-8 border border-outline-variant/40 shadow-xl relative w-full overflow-hidden">
           <Skeleton className="h-8 w-48 mb-4 bg-surface-container-highest" />
           <Skeleton className="h-4 w-full max-w-sm bg-surface-container-highest mb-8" />
           <div className="grid gap-6 md:grid-cols-2 mb-8">
              <Skeleton className="h-12 w-full bg-surface-container-highest rounded-2xl" />
              <Skeleton className="h-12 w-full bg-surface-container-highest rounded-2xl" />
           </div>
           <div className="space-y-4">
              {Array.from({ length: 6 }).map((_, i) => (
                <Skeleton key={i} className="h-16 w-full bg-surface-container-highest rounded-2xl" />
              ))}
           </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <div className="bg-surface-container-lowest/80 backdrop-blur-3xl rounded-4xl border border-outline-variant/40 shadow-xl relative w-full overflow-hidden group">
        <div className="absolute -top-12 -right-12 w-48 h-48 bg-primary/5 rounded-full blur-2xl pointer-events-none transition-all duration-1000 group-hover:bg-primary/10 z-[-1]"></div>
        
        <div className="p-8 sm:p-10 border-b border-outline-variant/30 flex flex-col gap-6 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h3 className="font-headline text-3xl font-extrabold tracking-tight text-on-surface">Bug Triage Center</h3>
            <p className="mt-2 text-sm text-on-surface-variant font-light max-w-lg leading-relaxed">
              Review incoming reports, filter by urgency, and open the detail workspace for tactical resolution.
            </p>
          </div>
          <div className="flex flex-col sm:flex-row gap-4 flex-1 max-w-2xl">
            <div className="flex-1 space-y-2">
              <Label className="text-[0.65rem] font-bold uppercase tracking-widest text-on-surface/40 pl-1">Status Filter</Label>
              <Select
                id="bug-status-filter"
                className="h-11 rounded-2xl bg-surface-container-low/30 border-outline-variant/20 font-body"
                value={status}
                onChange={(event) => {
                  setStatus(event.target.value);
                  setPage(1);
                }}
              >
                <option value="">All statuses</option>
                <option value="OPEN">Open</option>
                <option value="IN_PROGRESS">In progress</option>
                <option value="RESOLVED">Resolved</option>
                <option value="CLOSED">Closed</option>
              </Select>
            </div>
            <div className="flex-1 space-y-2">
              <Label className="text-[0.65rem] font-bold uppercase tracking-widest text-on-surface/40 pl-1">Priority Level</Label>
              <Select
                id="bug-priority-filter"
                className="h-11 rounded-2xl bg-surface-container-low/30 border-outline-variant/20 font-body"
                value={priority}
                onChange={(event) => {
                  setPriority(event.target.value);
                  setPage(1);
                }}
              >
                <option value="">All priorities</option>
                <option value="LOW">Low</option>
                <option value="MEDIUM">Medium</option>
                <option value="HIGH">High</option>
              </Select>
            </div>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full border-collapse text-left whitespace-nowrap">
            <thead>
              <tr className="bg-surface-container-low/30 border-b border-outline-variant/20 font-bold text-[0.65rem] uppercase tracking-widest text-on-surface/50">
                <th className="px-10 py-5">Issue Specification</th>
                <th className="px-10 py-5">Reporter Details</th>
                <th className="px-10 py-5">Current State</th>
                <th className="px-10 py-5 text-center">Severity</th>
                <th className="px-10 py-5">Timestamp</th>
                <th className="px-10 py-5 text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              {bugs.map((bug) => (
                <tr key={bug.id} className="group border-t border-outline-variant/10 transition-all duration-300 hover:bg-primary/[0.02]">
                  <td className="px-10 py-6 min-w-[300px]">
                    <div className="flex flex-col max-w-sm">
                      <span className="font-headline text-base font-extrabold text-on-surface tracking-tight group-hover:text-primary transition-colors truncate">{bug.title}</span>
                      <span className="text-xs text-on-surface-variant font-light mt-0.5 line-clamp-1 opacity-60 italic">{bug.description}</span>
                    </div>
                  </td>
                  <td className="px-10 py-6">
                    <div className="flex flex-col">
                      <span className="font-bold text-on-surface text-sm tracking-tight">{bug.user.name}</span>
                      <span className="text-[0.6rem] uppercase tracking-widest text-on-surface/40 font-bold mt-0.5">{bug.user.role}</span>
                    </div>
                  </td>
                  <td className="px-10 py-6">
                    <Badge tone={statusTone(bug.status)} className="rounded-full px-3 font-semibold text-[0.65rem] uppercase tracking-widest">{bug.status.replace("_", " ")}</Badge>
                  </td>
                  <td className="px-10 py-6 text-center">
                    <Badge tone={priorityTone(bug.priority)} className="rounded-full px-3 font-semibold text-[0.65rem] uppercase tracking-widest">{bug.priority}</Badge>
                  </td>
                  <td className="px-10 py-6">
                    <span className="text-xs text-on-surface/40 font-bold uppercase tracking-tighter">
                      {new Date(bug.createdAt).toLocaleDateString("en-GB", { day: 'numeric', month: 'short', year: 'numeric' })}
                    </span>
                  </td>
                  <td className="px-10 py-6 text-right">
                    <Button asChild size="sm" variant="outline" className="h-9 rounded-xl border-outline-variant/30 hover:bg-surface-container-high transition-all font-bold text-[0.65rem] uppercase tracking-widest">
                      <Link to="/dashboard/admin/bugs/$id" params={{ id: bug.id }}>
                        Inspect
                      </Link>
                    </Button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className="p-8 border-t border-outline-variant/20 flex flex-col sm:flex-row items-center justify-between gap-6">
          <p className="text-[0.65rem] font-bold uppercase tracking-widest text-on-surface/40">Query Result Page <span className="text-on-surface">{page}</span> of <span className="text-on-surface">{totalPages}</span></p>
          <div className="flex gap-3">
            <Button size="sm" type="button" variant="outline" disabled={page <= 1} onClick={() => setPage(page - 1)} className="h-10 px-6 rounded-xl border-outline-variant/30 font-bold text-[0.65rem] uppercase tracking-widest transition-all hover:scale-105 active:scale-95 disabled:opacity-30 disabled:hover:scale-100">
              Previous
            </Button>
            <Button
              size="sm"
              type="button"
              variant="outline"
              disabled={page >= totalPages}
              onClick={() => setPage(page + 1)}
              className="h-10 px-6 rounded-xl border-outline-variant/30 font-bold text-[0.65rem] uppercase tracking-widest transition-all hover:scale-105 active:scale-95 disabled:opacity-30 disabled:hover:scale-100"
            >
              Next
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
