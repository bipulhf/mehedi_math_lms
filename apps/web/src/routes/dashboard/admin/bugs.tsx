import { Link, createFileRoute } from "@tanstack/react-router";
import type { JSX } from "react";
import { useEffect, useState } from "react";

import { DataTableSkeleton } from "@/components/common/data-table-skeleton";
import { RouteErrorView } from "@/components/common/route-error";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
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
    return <DataTableSkeleton columns={6} rows={6} />;
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Bug management</CardTitle>
        <CardDescription>Review incoming reports, filter by urgency, and open the detail workspace for triage.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid gap-4 md:grid-cols-2">
          <div className="space-y-2">
            <Label htmlFor="bug-status-filter">Status</Label>
            <Select
              id="bug-status-filter"
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
          <div className="space-y-2">
            <Label htmlFor="bug-priority-filter">Priority</Label>
            <Select
              id="bug-priority-filter"
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

        <div className="overflow-hidden rounded-[calc(var(--radius)-0.125rem)] border border-outline-variant">
          <table className="w-full border-collapse text-left text-sm">
            <thead className="bg-surface-container-low">
              <tr>
                <th className="px-4 py-3 font-semibold text-on-surface/62">Issue</th>
                <th className="px-4 py-3 font-semibold text-on-surface/62">Reporter</th>
                <th className="px-4 py-3 font-semibold text-on-surface/62">Status</th>
                <th className="px-4 py-3 font-semibold text-on-surface/62">Priority</th>
                <th className="px-4 py-3 font-semibold text-on-surface/62">Created</th>
                <th className="px-4 py-3 font-semibold text-on-surface/62">Action</th>
              </tr>
            </thead>
            <tbody>
              {bugs.map((bug) => (
                <tr key={bug.id} className="border-t border-outline-variant bg-surface-container-lowest">
                  <td className="px-4 py-4">
                    <p className="font-semibold text-on-surface">{bug.title}</p>
                    <p className="mt-1 text-on-surface/62">{bug.description.slice(0, 96)}</p>
                  </td>
                  <td className="px-4 py-4">
                    <p className="font-semibold text-on-surface">{bug.user.name}</p>
                    <p className="text-on-surface/62">{bug.user.role}</p>
                  </td>
                  <td className="px-4 py-4">
                    <Badge tone={statusTone(bug.status)}>{bug.status}</Badge>
                  </td>
                  <td className="px-4 py-4">
                    <Badge tone={priorityTone(bug.priority)}>{bug.priority}</Badge>
                  </td>
                  <td className="px-4 py-4">{new Date(bug.createdAt).toLocaleDateString()}</td>
                  <td className="px-4 py-4">
                    <Button asChild size="sm" variant="outline">
                      <Link to="/dashboard/admin/bugs/$id" params={{ id: bug.id }}>
                        Open
                      </Link>
                    </Button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className="flex items-center justify-between">
          <p className="text-sm text-on-surface/62">Page {page} of {totalPages}</p>
          <div className="flex gap-2">
            <Button size="sm" type="button" variant="outline" disabled={page <= 1} onClick={() => setPage(page - 1)}>
              Previous
            </Button>
            <Button
              size="sm"
              type="button"
              variant="outline"
              disabled={page >= totalPages}
              onClick={() => setPage(page + 1)}
            >
              Next
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
