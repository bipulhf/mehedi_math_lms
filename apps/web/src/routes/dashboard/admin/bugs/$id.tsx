import { createFileRoute } from "@tanstack/react-router";
import type { JSX } from "react";
import { useEffect, useState } from "react";
import { toast } from "sonner";

import { ProfilePageSkeleton } from "@/components/profile/profile-editor";
import { RouteErrorView } from "@/components/common/route-error";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import type { AdminBugRecord } from "@/lib/api/admin";
import { getAdminBug, updateAdminBug } from "@/lib/api/admin";

export const Route = createFileRoute("/dashboard/admin/bugs/$id" as never)({
  component: AdminBugDetailPage,
  errorComponent: RouteErrorView
} as never);

function AdminBugDetailPage(): JSX.Element {
  const { id } = Route.useParams();
  const [bug, setBug] = useState<AdminBugRecord | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [status, setStatus] = useState<AdminBugRecord["status"]>("OPEN");
  const [priority, setPriority] = useState<AdminBugRecord["priority"]>("MEDIUM");
  const [adminNotes, setAdminNotes] = useState("");

  useEffect(() => {
    void (async () => {
      setIsLoading(true);

      try {
        const nextBug = await getAdminBug(id);
        setBug(nextBug);
        setStatus(nextBug.status);
        setPriority(nextBug.priority);
        setAdminNotes(nextBug.adminNotes ?? "");
      } finally {
        setIsLoading(false);
      }
    })();
  }, [id]);

  const handleSave = async (): Promise<void> => {
    setIsSaving(true);

    try {
      const updatedBug = await updateAdminBug(id, {
        adminNotes,
        priority,
        status
      });

      setBug(updatedBug);
      toast.success("Bug report updated");
    } finally {
      setIsSaving(false);
    }
  };

  if (isLoading || !bug) {
    return <ProfilePageSkeleton />;
  }

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle>{bug.title}</CardTitle>
          <CardDescription>
            Submitted by {bug.user.name} ({bug.user.role}) on {new Date(bug.createdAt).toLocaleString()}.
          </CardDescription>
        </CardHeader>
        <CardContent className="grid gap-6 xl:grid-cols-[1.1fr_0.9fr]">
          <div className="space-y-4">
            <div className="rounded-[calc(var(--radius)-0.125rem)] bg-surface-container-low p-4 text-sm leading-7 text-on-surface/70">
              {bug.description}
            </div>
            {bug.screenshotUrl ? (
              <div className="rounded-[calc(var(--radius)-0.125rem)] bg-surface-container-low p-4">
                <img alt="Bug screenshot" className="max-h-128 rounded-(--radius) object-contain" src={bug.screenshotUrl} />
              </div>
            ) : (
              <div className="rounded-[calc(var(--radius)-0.125rem)] bg-surface-container-low p-4 text-sm leading-7 text-on-surface/68">
                No screenshot attached to this report.
              </div>
            )}
          </div>

          <div className="space-y-4">
            <div className="flex gap-2">
              <Badge tone={status === "OPEN" ? "amber" : status === "IN_PROGRESS" ? "blue" : status === "RESOLVED" ? "green" : "gray"}>
                {status}
              </Badge>
              <Badge tone={priority === "HIGH" ? "red" : priority === "MEDIUM" ? "amber" : "blue"}>
                {priority}
              </Badge>
            </div>

            <div className="space-y-2">
              <Label htmlFor="bug-status">Status</Label>
              <Select id="bug-status" value={status} onChange={(event) => setStatus(event.target.value as AdminBugRecord["status"])}>
                <option value="OPEN">Open</option>
                <option value="IN_PROGRESS">In progress</option>
                <option value="RESOLVED">Resolved</option>
                <option value="CLOSED">Closed</option>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="bug-priority">Priority</Label>
              <Select
                id="bug-priority"
                value={priority}
                onChange={(event) => setPriority(event.target.value as AdminBugRecord["priority"])}
              >
                <option value="LOW">Low</option>
                <option value="MEDIUM">Medium</option>
                <option value="HIGH">High</option>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="bug-admin-notes">Admin notes</Label>
              <Textarea id="bug-admin-notes" value={adminNotes} onChange={(event) => setAdminNotes(event.target.value)} />
            </div>

            <Button type="button" disabled={isSaving} onClick={() => void handleSave()}>
              {isSaving ? <span className="h-4 w-16 rounded-full bg-white/25" aria-hidden="true" /> : null}
              {isSaving ? "Saving bug" : "Save bug update"}
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
