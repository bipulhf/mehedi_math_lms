import { useQuery } from "@tanstack/react-query";
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
import { ResponsiveImage } from "@/components/ui/responsive-image";
import { RichTextContent } from "@/components/ui/rich-text-content";
import { RichTextEditor } from "@/components/ui/rich-text-editor";
import { Select } from "@/components/ui/select";
import type { AdminBugRecord } from "@/lib/api/admin";
import { getAdminBug, updateAdminBug } from "@/lib/api/admin";
import { queryKeys } from "@/lib/query/keys";
import { seo } from "@/lib/seo";
import { useT } from "@/lib/i18n/locale-context";

export const Route = createFileRoute("/dashboard/admin/bugs/$id")({
  head: () =>
    seo({
      description: "Review and respond to a reported bug.",
      path: "/dashboard/admin/bugs",
      title: "Bug Report"
    }),
  component: AdminBugDetailPage,
  errorComponent: RouteErrorView
} as never);

function AdminBugDetailPage(): JSX.Element {
  const t = useT();

  const { id } = Route.useParams();
  const { data: fetchedBug, isPending: isLoading } = useQuery<AdminBugRecord>({
    queryFn: async () => getAdminBug(id),
    queryKey: queryKeys.admin.bug(id)
  });
  const [bug, setBug] = useState<AdminBugRecord | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [status, setStatus] = useState<AdminBugRecord["status"]>("OPEN");
  const [priority, setPriority] = useState<AdminBugRecord["priority"]>("MEDIUM");
  const [adminNotes, setAdminNotes] = useState("");

  // The triage controls are editable, so the fetched record seeds them once.
  useEffect(() => {
    if (!fetchedBug) {
      return;
    }

    setBug(fetchedBug);
    setStatus(fetchedBug.status);
    setPriority(fetchedBug.priority);
    setAdminNotes(fetchedBug.adminNotes ?? "");
  }, [fetchedBug]);

  const handleSave = async (): Promise<void> => {
    setIsSaving(true);

    try {
      const updatedBug = await updateAdminBug(id, {
        adminNotes,
        priority,
        status
      });

      setBug(updatedBug);
      toast.success(t("abug.updated"));
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
            <RichTextContent
              className="rounded-[calc(var(--radius)-0.125rem)] bg-panel-warm p-4 text-sm leading-7 text-ink/70"
              html={bug.description}
            />
            {bug.screenshotUrl ? (
              <div className="rounded-[calc(var(--radius)-0.125rem)] bg-panel-warm p-4">
                <ResponsiveImage
                  alt="Bug screenshot"
                  className="max-h-128 rounded-(--radius) object-contain"
                  sizes="(min-width: 1024px) 720px, 100vw"
                  src={bug.screenshotUrl}
                />
              </div>
            ) : (
              <div className="rounded-[calc(var(--radius)-0.125rem)] bg-panel-warm p-4 text-sm leading-7 text-ink/68">{t("abug.noScreenshot")}</div>
            )}
          </div>

          <div className="space-y-4">
            <div className="flex gap-2">
              <Badge tone={status === "OPEN" ? "attention" : status === "IN_PROGRESS" ? "neutral" : status === "RESOLVED" ? "neutral" : "quiet"}>
                {status}
              </Badge>
              <Badge tone={priority === "HIGH" ? "attention" : priority === "MEDIUM" ? "attention" : "neutral"}>
                {priority}
              </Badge>
            </div>

            <div className="space-y-2">
              <Label htmlFor="bug-status">{t("admin.bugs.statusFilter")}</Label>
              <Select id="bug-status" value={status} onChange={(event) => setStatus(event.target.value as AdminBugRecord["status"])}>
                <option value="OPEN">{t("admin.bugs.open")}</option>
                <option value="IN_PROGRESS">{t("admin.bugs.inProgress")}</option>
                <option value="RESOLVED">{t("admin.bugs.resolved")}</option>
                <option value="CLOSED">{t("admin.bugs.closed")}</option>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="bug-priority">{t("abug.priority")}</Label>
              <Select
                id="bug-priority"
                value={priority}
                onChange={(event) => setPriority(event.target.value as AdminBugRecord["priority"])}
              >
                <option value="LOW">{t("admin.bugs.low")}</option>
                <option value="MEDIUM">{t("admin.bugs.medium")}</option>
                <option value="HIGH">{t("admin.bugs.high")}</option>
              </Select>
            </div>

          </div>

          <div className="space-y-4 border-t border-hairline pt-6 xl:col-span-2">
            <div className="space-y-2">
              <Label htmlFor="bug-admin-notes">{t("abug.notes")}</Label>
              <RichTextEditor
                id="bug-admin-notes"
                value={adminNotes}
                onChange={(value) => setAdminNotes(value)}
              />
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
