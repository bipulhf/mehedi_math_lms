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
import { Skeleton } from "@/components/ui/skeleton";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { queryKeys } from "@/lib/query/keys";
import { cn } from "@/lib/utils";
import { RouteErrorView } from "@/components/common/route-error";
import genexMark from "@/assets/genex-mark.png";
import { Badge } from "@/components/ui/badge";
import { useT } from "@/lib/i18n/locale-context";

export const Route = createFileRoute("/dashboard/admin/sms")({
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
    <div className="space-y-8">
      <div className="bg-card/80 p-8 sm:p-10 border border-hairline/40 relative w-full overflow-hidden group">

        <div className="flex flex-col md:flex-row md:items-center gap-6 mb-10">
          <div className="flex w-16 h-16 items-center justify-center bg-chip-active border border-hairline/30 relative overflow-hidden group/logo">
            <div className="absolute inset-0 bg-ink/5 group-hover/logo:bg-ink/10 transition-colors"></div>
            <img
              decoding="async"
              loading="lazy" src={genexMark} alt="" className="h-10 w-10 brightness-[0.92] relative z-10" />
          </div>
          <div>
            <h3 className="font-body text-3xl font-medium tracking-tight text-ink">{t("sms.title")}</h3>
            <p className="mt-2 text-sm text-muted font-light max-w-2xl leading-relaxed">
              Dispatch synchronized announcements across the academic network. Target specific
              cohorts or broadcast to all active scholars.
            </p>
          </div>
        </div>

        <div className="space-y-8">
          {providerOk === false ? (
            <div className="border border-amber-500/20 bg-amber-500/5 px-6 py-4 flex items-center gap-4 text-amber-600">
              <div className="size-2 rounded-full bg-amber-500"></div>
              <p className="text-xs font-bold uppercase tracking-widest leading-none">
                Provider Configuration Missing:{" "}
                <span className="text-ink/60 normal-case font-medium ml-2 italic underline underline-offset-4 decoration-amber-500/30">{t("sms.needCredentials")}</span>
              </p>
            </div>
          ) : providerOk === true ? (
            <div className="border border-green-500/20 bg-green-500/5 px-6 py-4 flex items-center gap-4 text-green-600">
              <div className="size-2 rounded-full bg-green-500"></div>
              <p className="text-xs font-bold uppercase tracking-widest leading-none">
                System Active:{" "}
                <span className="text-ink/60 normal-case font-medium ml-2">{t("sms.connected")}</span>
              </p>
            </div>
          ) : null}

          <form onSubmit={(e) => void handleSubmit(e)} className="space-y-8 max-w-3xl">
            <div className="space-y-3">
              <Label
                htmlFor="sms-body"
                className="text-[0.65rem] font-bold uppercase tracking-widest text-ink/60 pl-1"
              >{t("sms.message")}</Label>
              <textarea
                id="sms-body"
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                placeholder={t("sms.placeholder")}
                required
                maxLength={1000}
                rows={5}
                className="w-full bg-panel-warm/50 border border-hairline/30 px-6 py-4 text-base text-ink focus:outline-none focus:ring-4 focus:ring-ink/10 focus:border-ink/40 transition-all font-body resize-none placeholder:text-ink/20"
              />
            </div>

            <div className="space-y-4">
              <Label className="text-[0.65rem] font-bold uppercase tracking-widest text-ink/60 pl-1">{t("sms.targeting")}</Label>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                {[
                  { id: "all_students", label: "All Students" },
                  { id: "role", label: "By Staff Role" },
                  { id: "course", label: "Course Enrollees" }
                ].map((mode) => (
                  <label
                    key={mode.id}
                    className={cn(
                      "flex items-center gap-3 p-4 rounded-2xl border transition-all cursor-pointer group/mode",
                      targetMode === mode.id
                        ? "bg-ink/5 border-ink/30 shadow-sm"
                        : "bg-panel-warm/30 border-hairline/20 hover:border-hairline/40"
                    )}
                  >
                    <div
                      className={cn(
                        "size-4 rounded-full border-2 flex items-center justify-center transition-all",
                        targetMode === mode.id
                          ? "border-ink bg-ink"
                          : "border-hairline group-hover/mode:border-ink/30"
                      )}
                    >
                      {targetMode === mode.id && (
                        <div className="size-1.5 rounded-full bg-white"></div>
                      )}
                    </div>
                    <input
                      type="radio"
                      className="sr-only"
                      name="sms-aud"
                      checked={targetMode === mode.id}
                      onChange={() => setTargetMode(mode.id as "all_students" | "role" | "course")}
                    />
                    <span
                      className={cn(
                        "text-sm font-bold tracking-tight transition-colors",
                        targetMode === mode.id ? "text-ink" : "text-ink/60"
                      )}
                    >
                      {mode.label}
                    </span>
                  </label>
                ))}
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-8 items-end">
              {targetMode === "role" && (
                <div className="space-y-3">
                  <Label
                    htmlFor="sms-role"
                    className="text-[0.65rem] font-bold uppercase tracking-widest text-ink/60 pl-1"
                  >{t("sms.roleFilter")}</Label>
                  <select
                    id="sms-role"
                    value={targetRole}
                    onChange={(e) => setTargetRole(e.target.value as UserRole)}
                    className="h-12 w-full bg-panel-warm/50 border border-hairline/30 px-5 text-sm font-bold text-ink focus:outline-none focus:ring-2 focus:ring-ink/20"
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
                <div className="space-y-3">
                  <Label
                    htmlFor="sms-course"
                    className="text-[0.65rem] font-bold uppercase tracking-widest text-ink/60 pl-1"
                  >{t("sms.courseId")}</Label>
                  <Input
                    id="sms-course"
                    className="h-12 bg-panel-warm/50 border-hairline/30 px-5 font-mono text-sm"
                    value={courseId}
                    onChange={(e) => setCourseId(e.target.value)}
                    placeholder="e.g. 550e8400-e29b-41d4-a716-446655440000"
                    required
                  />
                </div>
              )}
              <Button
                type="submit"
                disabled={submitting || providerOk === false}
                className="h-14 px-10 font-body font-medium transition-all ] ] disabled:opacity-40 disabled: disabled:grayscale"
              >
                {submitting ? (
                  <Skeleton className="h-4 w-20 bg-white/20" />
                ) : (
                  "Queue batch dispatch"
                )}
              </Button>
            </div>
          </form>
        </div>
      </div>

      <div className="bg-card/80 border border-hairline/40 relative overflow-hidden">
        <div className="p-8 sm:p-10 border-b border-hairline/30 flex items-center justify-between">
          <div>
            <h4 className="font-body text-2xl font-medium tracking-tight text-ink leading-none">{t("sms.history")}</h4>
            <p className="mt-2 text-sm text-muted font-light">{t("sms.historyLead")}</p>
          </div>
          {history.length > 0 && (
            <Badge
              tone="neutral"
              className="rounded-full px-4 font-bold text-[0.65rem] uppercase tracking-widest"
            >
              {history.length} batches
            </Badge>
          )}
        </div>

        <div className="overflow-x-auto">
          {historyLoading ? (
            <div className="p-12 space-y-4">
              {Array.from({ length: 4 }).map((_, i) => (
                <Skeleton
                  key={i}
                  className="h-14 w-full bg-chip-active/50"
                />
              ))}
            </div>
          ) : history.length === 0 ? (
            <div className="p-20 text-center">
              <p className="text-sm font-light text-ink/40 italic font-body">{t("sms.historyEmpty")}</p>
            </div>
          ) : (
            <table className="w-full text-left whitespace-nowrap">
              <thead>
                <tr className="bg-panel-warm/30 border-b border-hairline/20 font-bold text-[0.65rem] uppercase tracking-widest text-ink/50">
                  <th className="px-10 py-5">{t("sms.time")}</th>
                  <th className="px-10 py-5">{t("sms.target")}</th>
                  <th className="px-10 py-5">{t("sms.state")}</th>
                  <th className="px-10 py-5 text-right">{t("sms.sent")}</th>
                  <th className="px-10 py-5 text-right">{t("sms.failed")}</th>
                  <th className="px-10 py-5 text-right font-light opacity-50">{t("sms.skipped")}</th>
                </tr>
              </thead>
              <tbody>
                {history.map((row) => (
                  <tr
                    key={row.id}
                    className="group border-b border-hairline/10 transition-colors hover:bg-ink/2"
                  >
                    <td className="px-10 py-6">
                      <div className="flex flex-col">
                        <span className="font-bold text-ink tracking-tight group-hover:text-ink transition-colors">
                          {new Date(row.createdAt).toLocaleDateString("en-GB", {
                            day: "numeric",
                            month: "short",
                            year: "numeric"
                          })}
                        </span>
                        <span className="text-[0.6rem] uppercase tracking-widest text-ink/40 font-bold mt-1">
                          {new Date(row.createdAt).toLocaleTimeString([], {
                            hour: "2-digit",
                            minute: "2-digit"
                          })}
                        </span>
                      </div>
                    </td>
                    <td className="px-10 py-6">
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-bold text-ink/70 uppercase tracking-tighter">
                          {row.targetKind.replace("_", " ")}
                        </span>
                        {row.targetRole && (
                          <Badge tone="quiet" className="scale-75 origin-left">
                            {row.targetRole}
                          </Badge>
                        )}
                      </div>
                    </td>
                    <td className="px-10 py-6">
                      <span
                        className={cn(
                          "text-[0.65rem] font-bold uppercase tracking-widest px-3 py-1 rounded-full border",
                          row.status === "COMPLETED"
                            ? "bg-green-500/10 border-green-500/30 text-green-600"
                            : "bg-amber-500/10 border-amber-500/30 text-amber-600"
                        )}
                      >
                        {row.status}
                      </span>
                    </td>
                    <td className="px-10 py-6 text-right tabular-nums font-bold text-ink">
                      {row.sentCount}
                    </td>
                    <td className="px-10 py-6 text-right tabular-nums font-bold text-red-500/70">
                      {row.failedCount}
                    </td>
                    <td className="px-10 py-6 text-right tabular-nums text-ink/30 font-light">
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
