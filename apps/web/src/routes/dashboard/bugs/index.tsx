import { Link, createFileRoute } from "@tanstack/react-router";
import type { JSX } from "react";
import { useEffect, useState } from "react";

import { DataTableSkeleton } from "@/components/common/data-table-skeleton";
import { RouteErrorView } from "@/components/common/route-error";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
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
    return <DataTableSkeleton columns={5} rows={5} />;
  }

  return (
    <Card>
      <CardHeader className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <CardTitle>My bug reports</CardTitle>
          <CardDescription>Track what you submitted, what is being investigated, and what has already been resolved.</CardDescription>
        </div>
        <Button asChild>
          <Link to="/dashboard/bugs/report">Report Bug</Link>
        </Button>
      </CardHeader>
      <CardContent className="space-y-3">
        {bugs.length > 0 ? (
          bugs.map((bug) => (
            <div key={bug.id} className="rounded-[calc(var(--radius)-0.125rem)] bg-surface-container-low p-4">
              <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                <div className="space-y-2">
                  <p className="font-semibold text-on-surface">{bug.title}</p>
                  <p className="text-sm leading-6 text-on-surface/68">{bug.description}</p>
                  {bug.adminNotes ? (
                    <p className="text-sm text-on-surface/58">Admin notes: {bug.adminNotes}</p>
                  ) : null}
                </div>
                <div className="flex flex-col items-start gap-2">
                  <Badge tone={statusTone(bug.status)}>{bug.status}</Badge>
                  <Badge tone={bug.priority === "HIGH" ? "red" : bug.priority === "MEDIUM" ? "amber" : "blue"}>
                    {bug.priority}
                  </Badge>
                  <span className="text-sm text-on-surface/58">{new Date(bug.createdAt).toLocaleString()}</span>
                </div>
              </div>
            </div>
          ))
        ) : (
          <div className="rounded-[calc(var(--radius)-0.125rem)] bg-surface-container-low p-4 text-sm leading-7 text-on-surface/68">
            No bug reports submitted yet.
          </div>
        )}
      </CardContent>
    </Card>
  );
}
