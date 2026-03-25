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
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import mmaLogo from "@/assets/mma-logo.svg";

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
        ? ({ kind: "all_students" as const })
        : targetMode === "role"
          ? ({ kind: "role" as const, role: targetRole })
          : ({ kind: "course" as const, courseId: courseId.trim() });

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
      toast.success(`Batch queued (${result.batchId.slice(0, 8)}…). Run the SMS worker to deliver.`);
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
      <Card>
        <CardContent className="p-8 text-sm text-on-surface/60">Loading…</CardContent>
      </Card>
    );
  }

  if (session.session.role !== "ADMIN") {
    return null;
  }

  return (
    <div className="space-y-6">
      <Card className="border-outline-variant/60 bg-surface-container-low/70 backdrop-blur-xl">
        <CardHeader>
          <div className="flex items-center gap-3">
            <div className="flex w-12 h-12 items-center justify-center rounded-2xl bg-surface-container-high border border-outline/20">
              <img src={mmaLogo} alt="" className="h-8 w-8 brightness-[0.92]" />
            </div>
            <div>
              <CardTitle className="font-display text-xl">Bulk SMS (Onecodesoft)</CardTitle>
              <CardDescription>
                Sends the same message to every matched number. Student phones come from student profiles
                (teachers from teacher profiles).
              </CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {providerOk === false ? (
            <p className="rounded-lg border border-amber-800/25 bg-amber-500/10 px-4 py-3 text-sm text-amber-950">
              Set <code className="text-xs">ONECODESOFT_API_KEY</code> and{" "}
              <code className="text-xs">ONECODESOFT_SENDER_ID</code> on the API server before sending.
            </p>
          ) : null}
          {providerOk === true ? (
            <p className="text-sm text-green-800">SMS provider credentials detected on the API.</p>
          ) : null}

          <form onSubmit={(e) => void handleSubmit(e)} className="space-y-4 max-w-xl">
            <div className="space-y-2">
              <Label htmlFor="sms-body">Message</Label>
              <textarea
                id="sms-body"
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                required
                maxLength={1000}
                rows={4}
                className="w-full rounded-[calc(var(--radius)-0.125rem)] bg-surface-container-low px-4 py-3 text-sm text-on-surface shadow-[inset_0_0_0_1px_rgba(118,119,125,0.14)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-secondary-container/20 min-h-[96px] resize-y"
              />
            </div>
            <div className="space-y-2">
              <span className="text-sm font-medium text-on-surface">Recipients</span>
              <div className="flex flex-wrap gap-4 text-sm">
                <label className="inline-flex items-center gap-2 cursor-pointer">
                  <input
                    type="radio"
                    name="sms-aud"
                    checked={targetMode === "all_students"}
                    onChange={() => setTargetMode("all_students")}
                  />
                  All active students
                </label>
                <label className="inline-flex items-center gap-2 cursor-pointer">
                  <input
                    type="radio"
                    name="sms-aud"
                    checked={targetMode === "role"}
                    onChange={() => setTargetMode("role")}
                  />
                  By role
                </label>
                <label className="inline-flex items-center gap-2 cursor-pointer">
                  <input
                    type="radio"
                    name="sms-aud"
                    checked={targetMode === "course"}
                    onChange={() => setTargetMode("course")}
                  />
                  Course enrollees
                </label>
              </div>
            </div>
            {targetMode === "role" ? (
              <div className="space-y-2">
                <Label htmlFor="sms-role">Role</Label>
                <select
                  id="sms-role"
                  value={targetRole}
                  onChange={(e) => setTargetRole(e.target.value as UserRole)}
                  className="h-12 w-full rounded-[calc(var(--radius)-0.125rem)] bg-surface-container-low px-4 text-sm text-on-surface shadow-[inset_0_0_0_1px_rgba(118,119,125,0.14)]"
                >
                  {userRoleValues.map((value) => (
                    <option key={value} value={value}>
                      {value}
                    </option>
                  ))}
                </select>
                <p className="text-xs text-on-surface/58">
                  ACCOUNTANT and ADMIN users have no profile phone in this system — batches may be empty or
                  mostly skipped.
                </p>
              </div>
            ) : null}
            {targetMode === "course" ? (
              <div className="space-y-2">
                <Label htmlFor="sms-course">Course ID</Label>
                <Input
                  id="sms-course"
                  value={courseId}
                  onChange={(e) => setCourseId(e.target.value)}
                  placeholder="UUID"
                  required
                />
              </div>
            ) : null}
            <Button type="submit" disabled={submitting || providerOk === false}>
              {submitting ? "Queuing…" : "Queue bulk SMS"}
            </Button>
          </form>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Recent batches</CardTitle>
          <CardDescription>Delivery runs asynchronously via the SMS worker.</CardDescription>
        </CardHeader>
        <CardContent className="overflow-x-auto">
          {historyLoading ? (
            <p className="text-sm text-on-surface/60">Loading history…</p>
          ) : history.length === 0 ? (
            <p className="text-sm text-on-surface/60">No batches yet.</p>
          ) : (
            <table className="w-full min-w-[640px] text-left text-sm">
              <thead>
                <tr className="border-b border-outline-variant text-on-surface/55">
                  <th className="py-2 pr-3 font-medium">When</th>
                  <th className="py-2 pr-3 font-medium">Target</th>
                  <th className="py-2 pr-3 font-medium">Status</th>
                  <th className="py-2 pr-3 font-medium text-right">Sent</th>
                  <th className="py-2 pr-3 font-medium text-right">Failed</th>
                  <th className="py-2 font-medium text-right">Skipped</th>
                </tr>
              </thead>
              <tbody>
                {history.map((row) => (
                  <tr key={row.id} className="border-b border-outline-variant/40">
                    <td className="py-2 pr-3 text-on-surface/80">
                      {new Date(row.createdAt).toLocaleString()}
                    </td>
                    <td className="py-2 pr-3">
                      {row.targetKind}
                      {row.targetRole ? ` · ${row.targetRole}` : ""}
                    </td>
                    <td className="py-2 pr-3 font-medium">{row.status}</td>
                    <td className="py-2 pr-3 text-right tabular-nums">{row.sentCount}</td>
                    <td className="py-2 pr-3 text-right tabular-nums">{row.failedCount}</td>
                    <td className="py-2 text-right tabular-nums">{row.skippedCount}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
