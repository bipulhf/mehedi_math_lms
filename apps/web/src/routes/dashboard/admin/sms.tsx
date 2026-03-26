import { adminSendSmsSchema, userRoleValues, type UserRole } from "@mma/shared";
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
import { cn } from "@/lib/utils";
import mmaLogo from "@/assets/mma-logo.svg";
import { Badge } from "@/components/ui/badge";

export const Route = createFileRoute("/dashboard/admin/sms")({
  component: AdminSmsPage
});

function AdminSmsPage() {
  const router = useRouter();
  const { isPending, session } = useAuthSession();
  const [providerOk, setProviderOk] = useState<boolean | null>(null);
  const [message, setMessage] = useState("");
  const [targetMode, setTargetMode] = useState<"all_students" | "role" | "course">("all_students");
  const [targetRole, setTargetRole] = useState<UserRole>("STUDENT");
  const [courseId, setCourseId] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [history, setHistory] = useState<readonly AdminSmsBatchRow[]>([]);
  const [historyLoading, setHistoryLoading] = useState(true);

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

  useEffect(() => {
    void (async () => {
      try {
        const status = await getAdminSmsStatus();
        setProviderOk(status.configured);
      } catch {
        setProviderOk(false);
      }
    })();
  }, []);

  useEffect(() => {
    if (isPending || session?.session.role !== "ADMIN") {
      return;
    }

    void (async () => {
      setHistoryLoading(true);
      try {
        const page = await listAdminSmsHistory({ limit: 20, page: 1 });
        setHistory(page.data);
      } catch {
        toast.error("Could not load SMS history");
      } finally {
        setHistoryLoading(false);
      }
    })();
  }, [isPending, session?.session.role]);

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
      const page = await listAdminSmsHistory({ limit: 20, page: 1 });
      setHistory(page.data);
    } catch {
      toast.error("Failed to queue SMS");
    } finally {
      setSubmitting(false);
    }
  }

  if (isPending || !session) {
    return (
      <div className="space-y-8 animate-pulse">
        <div className="bg-surface-container-lowest/80 backdrop-blur-3xl rounded-4xl p-8 border border-outline-variant/40 shadow-xl relative w-full overflow-hidden">
          <div className="flex items-center gap-4 mb-8">
            <Skeleton className="size-12 rounded-2xl bg-surface-container-highest" />
            <div className="space-y-2">
              <Skeleton className="h-6 w-48 bg-surface-container-highest" />
              <Skeleton className="h-4 w-96 bg-surface-container-highest" />
            </div>
          </div>
          <div className="space-y-6 max-w-xl">
            <Skeleton className="h-32 w-full bg-surface-container-highest rounded-2xl" />
            <div className="flex gap-4">
              <Skeleton className="h-6 w-24 bg-surface-container-highest rounded-full" />
              <Skeleton className="h-6 w-24 bg-surface-container-highest rounded-full" />
              <Skeleton className="h-6 w-24 bg-surface-container-highest rounded-full" />
            </div>
            <Skeleton className="h-12 w-48 bg-surface-container-highest rounded-2xl" />
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
      <div className="bg-surface-container-lowest/80 backdrop-blur-3xl rounded-4xl p-8 sm:p-10 border border-outline-variant/40 shadow-xl relative w-full overflow-hidden group">
        <div className="absolute -top-12 -right-12 w-48 h-48 bg-primary/5 rounded-full blur-2xl pointer-events-none transition-all duration-1000 group-hover:bg-primary/10 z-[-1]"></div>

        <div className="flex flex-col md:flex-row md:items-center gap-6 mb-10">
          <div className="flex w-16 h-16 items-center justify-center rounded-3xl bg-surface-container-high border border-outline-variant/30 shadow-sm relative overflow-hidden group/logo">
            <div className="absolute inset-0 bg-primary/5 group-hover/logo:bg-primary/10 transition-colors"></div>
            <img src={mmaLogo} alt="" className="h-10 w-10 brightness-[0.92] relative z-10" />
          </div>
          <div>
            <h3 className="font-headline text-3xl font-extrabold tracking-tight text-on-surface">
              Bulk SMS Dispatch
            </h3>
            <p className="mt-2 text-sm text-on-surface-variant font-light max-w-2xl leading-relaxed">
              Dispatch synchronized announcements across the academic network. Target specific
              cohorts or broadcast to all active scholars.
            </p>
          </div>
        </div>

        <div className="space-y-8">
          {providerOk === false ? (
            <div className="rounded-3xl border border-amber-500/20 bg-amber-500/5 px-6 py-4 flex items-center gap-4 text-amber-600 animate-in fade-in slide-in-from-top-2">
              <div className="size-2 rounded-full bg-amber-500 animate-pulse"></div>
              <p className="text-xs font-bold uppercase tracking-widest leading-none">
                Provider Configuration Missing:{" "}
                <span className="text-on-surface/60 normal-case font-medium ml-2 italic underline underline-offset-4 decoration-amber-500/30">
                  ONECODESOFT API credentials required.
                </span>
              </p>
            </div>
          ) : providerOk === true ? (
            <div className="rounded-3xl border border-green-500/20 bg-green-500/5 px-6 py-4 flex items-center gap-4 text-green-600 animate-in fade-in slide-in-from-top-2">
              <div className="size-2 rounded-full bg-green-500"></div>
              <p className="text-xs font-bold uppercase tracking-widest leading-none">
                System Active:{" "}
                <span className="text-on-surface/60 normal-case font-medium ml-2">
                  SMS Gateway connected and verified.
                </span>
              </p>
            </div>
          ) : null}

          <form onSubmit={(e) => void handleSubmit(e)} className="space-y-8 max-w-3xl">
            <div className="space-y-3">
              <Label
                htmlFor="sms-body"
                className="text-[0.65rem] font-bold uppercase tracking-widest text-on-surface/60 pl-1"
              >
                Message Content
              </Label>
              <textarea
                id="sms-body"
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                placeholder="Draft your announcement here..."
                required
                maxLength={1000}
                rows={5}
                className="w-full rounded-3xl bg-surface-container-low/50 border border-outline-variant/30 px-6 py-4 text-base text-on-surface focus:outline-none focus:ring-4 focus:ring-primary/10 focus:border-primary/40 transition-all font-body resize-none shadow-inner placeholder:text-on-surface/20"
              />
            </div>

            <div className="space-y-4">
              <Label className="text-[0.65rem] font-bold uppercase tracking-widest text-on-surface/60 pl-1">
                Recipient Targeting
              </Label>
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
                        ? "bg-primary/5 border-primary/30 shadow-sm"
                        : "bg-surface-container-low/30 border-outline-variant/20 hover:border-outline-variant/40"
                    )}
                  >
                    <div
                      className={cn(
                        "size-4 rounded-full border-2 flex items-center justify-center transition-all",
                        targetMode === mode.id
                          ? "border-primary bg-primary"
                          : "border-outline-variant group-hover/mode:border-on-surface/30"
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
                        targetMode === mode.id ? "text-primary" : "text-on-surface/60"
                      )}
                    >
                      {mode.label}
                    </span>
                  </label>
                ))}
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-8 items-end animate-in fade-in slide-in-from-left-4 duration-500">
              {targetMode === "role" && (
                <div className="space-y-3">
                  <Label
                    htmlFor="sms-role"
                    className="text-[0.65rem] font-bold uppercase tracking-widest text-on-surface/60 pl-1"
                  >
                    Staff Role Filter
                  </Label>
                  <select
                    id="sms-role"
                    value={targetRole}
                    onChange={(e) => setTargetRole(e.target.value as UserRole)}
                    className="h-12 w-full rounded-2xl bg-surface-container-low/50 border border-outline-variant/30 px-5 text-sm font-bold text-on-surface focus:outline-none focus:ring-2 focus:ring-primary/20"
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
                    className="text-[0.65rem] font-bold uppercase tracking-widest text-on-surface/60 pl-1"
                  >
                    Target Course UUID
                  </Label>
                  <Input
                    id="sms-course"
                    className="h-12 rounded-2xl bg-surface-container-low/50 border-outline-variant/30 px-5 font-mono text-sm"
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
                className="h-14 rounded-3xl px-10 font-headline font-extrabold shadow-lg transition-all hover:scale-[1.02] active:scale-[0.98] disabled:opacity-40 disabled:hover:scale-100 disabled:grayscale"
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

      <div className="bg-surface-container-lowest/80 backdrop-blur-3xl rounded-4xl border border-outline-variant/40 shadow-xl relative overflow-hidden">
        <div className="p-8 sm:p-10 border-b border-outline-variant/30 flex items-center justify-between">
          <div>
            <h4 className="font-headline text-2xl font-extrabold tracking-tight text-on-surface leading-none">
              Dispatch History
            </h4>
            <p className="mt-2 text-sm text-on-surface-variant font-light">
              Asynchronous delivery logs processed by the academic SMS worker.
            </p>
          </div>
          {history.length > 0 && (
            <Badge
              tone="blue"
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
                  className="h-14 w-full rounded-2xl bg-surface-container-high/50"
                />
              ))}
            </div>
          ) : history.length === 0 ? (
            <div className="p-20 text-center">
              <p className="text-sm font-light text-on-surface/40 italic italic font-headline">
                The dispatch log is empty.
              </p>
            </div>
          ) : (
            <table className="w-full text-left whitespace-nowrap">
              <thead>
                <tr className="bg-surface-container-low/30 border-b border-outline-variant/20 font-bold text-[0.65rem] uppercase tracking-widest text-on-surface/50">
                  <th className="px-10 py-5">Dispatch Time</th>
                  <th className="px-10 py-5">Targeting Parameter</th>
                  <th className="px-10 py-5">State</th>
                  <th className="px-10 py-5 text-right">Sent</th>
                  <th className="px-10 py-5 text-right">Failed</th>
                  <th className="px-10 py-5 text-right font-light opacity-50">Skipped</th>
                </tr>
              </thead>
              <tbody>
                {history.map((row) => (
                  <tr
                    key={row.id}
                    className="group border-b border-outline-variant/10 transition-colors hover:bg-primary/[0.02]"
                  >
                    <td className="px-10 py-6">
                      <div className="flex flex-col">
                        <span className="font-bold text-on-surface tracking-tight group-hover:text-primary transition-colors">
                          {new Date(row.createdAt).toLocaleDateString("en-GB", {
                            day: "numeric",
                            month: "short",
                            year: "numeric"
                          })}
                        </span>
                        <span className="text-[0.6rem] uppercase tracking-widest text-on-surface/40 font-bold mt-1">
                          {new Date(row.createdAt).toLocaleTimeString([], {
                            hour: "2-digit",
                            minute: "2-digit"
                          })}
                        </span>
                      </div>
                    </td>
                    <td className="px-10 py-6">
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-bold text-on-surface/70 uppercase tracking-tighter">
                          {row.targetKind.replace("_", " ")}
                        </span>
                        {row.targetRole && (
                          <Badge tone="gray" className="scale-75 origin-left">
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
                    <td className="px-10 py-6 text-right tabular-nums font-bold text-on-surface">
                      {row.sentCount}
                    </td>
                    <td className="px-10 py-6 text-right tabular-nums font-bold text-red-500/70">
                      {row.failedCount}
                    </td>
                    <td className="px-10 py-6 text-right tabular-nums text-on-surface/30 font-light">
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
