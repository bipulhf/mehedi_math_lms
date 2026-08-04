import { adminSendSmsSchema, userRoleValues, type UserRole } from "@genex/shared";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { createFileRoute, useRouter } from "@tanstack/react-router";
import { useEffect, useState, type FormEvent } from "react";
import { toast } from "sonner";

import {
  adminSendBulkSms,
  getAdminSmsStatus,
  listAdminSmsHistory,
  type AdminSmsBatchRow
} from "@/lib/api/admin";
import { useAuthSession } from "@/hooks/use-auth-session";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { Skeleton } from "@/components/ui/skeleton";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { queryKeys } from "@/lib/query/keys";
import { cn } from "@/lib/utils";
import { RouteErrorView } from "@/components/common/route-error";
import genexMark from "@/assets/genex-mark.png";
import { Badge } from "@/components/ui/badge";
import { seo } from "@/lib/seo";
import { useT } from "@/lib/i18n/locale-context";

export const Route = createFileRoute("/dashboard/admin/sms")({
  head: () =>
    seo({
      description: "Send bulk SMS to students or teachers and track delivery.",
      path: "/dashboard/admin/sms",
      title: "SMS"
    }),
  component: AdminSmsPage,
  errorComponent: RouteErrorView
});

function AdminSmsPage() {
  const t = useT();

  const router = useRouter();
  const { isPending, session } = useAuthSession();
  const queryClient = useQueryClient();
  const [message, setMessage] = useState("");
  const [targetMode, setTargetMode] = useState<"all_students" | "role" | "course">("all_students");
  const [targetRole, setTargetRole] = useState<UserRole>("STUDENT");
  const [courseId, setCourseId] = useState("");
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (isPending) {
      return;
    }

    if (!session) {
      return;
    }

    if (session.session.role !== "ADMIN") {
      void router.navigate({ to: "/dashboard" });
    }
  }, [isPending, router, session]);

  const isAdmin = !isPending && session?.session.role === "ADMIN";
  const { data: providerStatus } = useQuery({
    queryFn: async () => getAdminSmsStatus(),
    queryKey: ["admin", "sms", "status"]
  });
  // Undefined until the probe answers; null is "we asked and it failed".
  const providerOk = providerStatus === undefined ? null : providerStatus.configured;
  const historyFilters = { limit: 20, page: 1 };
  const { data: historyPage, isPending: historyLoading } = useQuery({
    enabled: isAdmin,
    queryFn: async () => listAdminSmsHistory(historyFilters),
    queryKey: queryKeys.admin.smsHistory(historyFilters)
  });
  const history: readonly AdminSmsBatchRow[] = historyPage?.data ?? [];

  async function handleSubmit(e: FormEvent): Promise<void> {
    e.preventDefault();

    const target =
      targetMode === "all_students"
        ? { kind: "all_students" as const }
        : targetMode === "role"
          ? { kind: "role" as const, role: targetRole }
          : { kind: "course" as const, courseId: courseId.trim() };

    const parsed = adminSendSmsSchema.safeParse({
      message: message.trim(),
      target
    });

    if (!parsed.success) {
      toast.error(parsed.error.issues[0]?.message ?? "Invalid input");

      return;
    }

    setSubmitting(true);
    try {
      const result = await adminSendBulkSms(parsed.data);
      toast.success(
        `Batch queued (${result.batchId.slice(0, 8)}…). Run the SMS worker to deliver.`
      );
      setMessage("");
      await queryClient.invalidateQueries({ queryKey: queryKeys.admin.smsHistory(historyFilters) });
    } catch {
      toast.error(t("sms.queueFailed"));
    } finally {
      setSubmitting(false);
    }
  }

  if (isPending || !session) {
    return (
      <div className="space-y-8">
        <div className="bg-card/80 p-8 border border-hairline/40 relative w-full overflow-hidden">
          <div className="flex items-center gap-4 mb-8">
            <Skeleton className="size-12 bg-chip-active" />
            <div className="space-y-2">
              <Skeleton className="h-6 w-48 bg-chip-active" />
              <Skeleton className="h-4 w-96 bg-chip-active" />
            </div>
          </div>
          <div className="space-y-6 max-w-xl">
            <Skeleton className="h-32 w-full bg-chip-active" />
            <div className="flex gap-4">
              <Skeleton className="h-6 w-24 bg-chip-active rounded-full" />
              <Skeleton className="h-6 w-24 bg-chip-active rounded-full" />
              <Skeleton className="h-6 w-24 bg-chip-active rounded-full" />
            </div>
            <Skeleton className="h-12 w-48 bg-chip-active" />
          </div>
        </div>
      </div>
    );
  }

  if (session.session.role !== "ADMIN") {
    return null;
  }

  return (
    <div className="space-y-6">
      <div className="border border-hairline bg-card p-6">
        <div className="mb-6 flex flex-col items-start gap-4 sm:flex-row sm:items-center">
          <div className="flex size-10 items-center justify-center border border-hairline bg-panel-warm shrink-0">
            <img alt="" className="size-6" src={genexMark} />
          </div>
          <div>
            <h1 className="text-xl font-medium text-ink">{t("sms.title")}</h1>
            <p className="mt-0.5 max-w-2xl text-sm font-light text-muted">
              Dispatch synchronized announcements across the academic network. Target specific cohorts or broadcast to all active scholars.
            </p>
          </div>
        </div>

        <div className="space-y-6">
          {providerOk === false ? (
            <div className="border border-amber-500/20 bg-amber-500/5 px-4 py-3 flex items-center gap-3 text-amber-600">
              <div className="size-2 rounded-full bg-amber-500"></div>
              <p className="text-xs font-bold uppercase tracking-wider">
                Provider Configuration Missing:{" "}
                <span className="text-ink/60 normal-case font-medium ml-1 italic">{t("sms.needCredentials")}</span>
              </p>
            </div>
          ) : providerOk === true ? (
            <div className="border border-green-500/20 bg-green-500/5 px-4 py-3 flex items-center gap-3 text-green-600">
              <div className="size-2 rounded-full bg-green-500"></div>
              <p className="text-xs font-bold uppercase tracking-wider">
                System Active:{" "}
                <span className="text-ink/60 normal-case font-medium ml-1">{t("sms.connected")}</span>
              </p>
            </div>
          ) : null}

          <form onSubmit={(e) => void handleSubmit(e)} className="space-y-6 max-w-3xl">
            <div className="space-y-2">
              <Label htmlFor="sms-body">{t("sms.message")}</Label>
              <textarea
                className="w-full border border-hairline bg-card p-3.5 text-sm text-ink transition-colors focus:border-ink focus:outline-none placeholder:text-placeholder"
                id="sms-body"
                maxLength={1000}
                onChange={(e) => setMessage(e.target.value)}
                placeholder={t("sms.placeholder")}
                required
                rows={3}
                value={message}
              />
            </div>

            <div className="space-y-2">
              <Label>{t("sms.targeting")}</Label>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                {[
                  { id: "all_students", label: "All Students" },
                  { id: "role", label: "By Staff Role" },
                  { id: "course", label: "Course Enrollees" }
                ].map((mode) => (
                  <label
                    key={mode.id}
                    className={cn(
                      "flex items-center gap-2.5 p-3 border transition-colors cursor-pointer",
                      targetMode === mode.id
                        ? "bg-panel-warm border-ink"
                        : "bg-card border-hairline hover:border-hairline/60"
                    )}
                  >
                    <input
                      checked={targetMode === mode.id}
                      className="size-4 accent-ink"
                      name="sms-aud"
                      onChange={() => setTargetMode(mode.id as "all_students" | "role" | "course")}
                      type="radio"
                    />
                    <span className="text-sm font-medium text-ink">
                      {mode.label}
                    </span>
                  </label>
                ))}
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 items-end">
              {targetMode === "role" && (
                <div className="space-y-1.5">
                  <Label htmlFor="sms-role">{t("sms.roleFilter")}</Label>
                  <select
                    className="w-full border border-hairline bg-card h-10 px-3 text-sm text-ink"
                    id="sms-role"
                    onChange={(e) => setTargetRole(e.target.value as UserRole)}
                    value={targetRole}
                  >
                    {userRoleValues.map((value) => (
                      <option key={value} value={value}>
                        {value}
                      </option>
                    ))}
                  </select>
                </div>
              )}
              {targetMode === "course" && (
                <div className="space-y-1.5">
                  <Label htmlFor="sms-course">{t("sms.courseId")}</Label>
                  <Input
                    id="sms-course"
                    onChange={(e) => setCourseId(e.target.value)}
                    placeholder="e.g. 550e8400-e29b-41d4-a716-446655440000"
                    required
                    value={courseId}
                  />
                </div>
              )}
              <Button
                disabled={submitting || providerOk === false}
                size="lg"
                type="submit"
              >
                {submitting ? (
                  <Skeleton className="h-4 w-20 bg-white/20" />
                ) : (
                  "Queue Batch Dispatch"
                )}
              </Button>
            </div>
          </form>
        </div>
      </div>

      <div className="border border-hairline bg-card">
        <div className="p-6 border-b border-hairline flex items-center justify-between">
          <div>
            <h2 className="text-xl font-medium text-ink">{t("sms.history")}</h2>
            <p className="text-sm font-light text-muted">{t("sms.historyLead")}</p>
          </div>
          {history.length > 0 && (
            <Badge tone="neutral">
              {history.length} batches
            </Badge>
          )}
        </div>

        <div className="overflow-x-auto">
          {historyLoading ? (
            <div className="p-6 space-y-3">
              {Array.from({ length: 4 }).map((_, i) => (
                <Skeleton
                  className="h-10 w-full"
                  key={i}
                />
              ))}
            </div>
          ) : history.length === 0 ? (
            <div className="p-6">
              <EmptyState message={t("sms.historyEmpty")} />
            </div>
          ) : (
            <table className="w-full text-left whitespace-nowrap border-collapse">
              <thead>
                <tr className="border-b border-hairline bg-panel-warm/40 text-xs font-semibold uppercase tracking-wider text-muted-faint">
                  <th className="px-4 py-2.5">{t("sms.time")}</th>
                  <th className="px-4 py-2.5">{t("sms.target")}</th>
                  <th className="px-4 py-2.5">{t("sms.state")}</th>
                  <th className="px-4 py-2.5 text-right">{t("sms.sent")}</th>
                  <th className="px-4 py-2.5 text-right">{t("sms.failed")}</th>
                  <th className="px-4 py-2.5 text-right font-light opacity-50">{t("sms.skipped")}</th>
                </tr>
              </thead>
              <tbody>
                {history.map((row) => (
                  <tr
                    className="border-b border-hairline-fainter transition-colors last:border-b-0 hover:bg-row-hover"
                    key={row.id}
                  >
                    <td className="px-4 py-3">
                      <div className="flex flex-col">
                        <span className="text-sm font-medium text-ink">
                          {new Date(row.createdAt).toLocaleDateString("en-GB", {
                            day: "numeric",
                            month: "short",
                            year: "numeric"
                          })}
                        </span>
                        <span className="text-xs text-muted-faint">
                          {new Date(row.createdAt).toLocaleTimeString([], {
                            hour: "2-digit",
                            minute: "2-digit"
                          })}
                        </span>
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-medium text-ink">
                          {row.targetKind.replace("_", " ")}
                        </span>
                        {row.targetRole && (
                          <Badge tone="quiet">
                            {row.targetRole}
                          </Badge>
                        )}
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <Badge tone={row.status === "COMPLETED" ? "neutral" : "attention"}>
                        {row.status}
                      </Badge>
                    </td>
                    <td className="px-4 py-3 text-right text-sm font-medium text-ink">
                      {row.sentCount}
                    </td>
                    <td className="px-4 py-3 text-right text-sm font-medium text-error">
                      {row.failedCount}
                    </td>
                    <td className="px-4 py-3 text-right text-sm text-muted-faint">
                      {row.skippedCount}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </div>
  );
}
