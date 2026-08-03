import {
  adminSendNotificationSchema,
  notificationTypeSchema,
  notificationTypeValues,
  type NotificationTypeValue,
  userRoleSchema,
  type UserRole,
  userRoleValues
} from "@genex/shared";
import { createFileRoute, useRouter } from "@tanstack/react-router";
import { useEffect, useState, type FormEvent } from "react";

import { adminSendNotification } from "@/lib/api/admin";
import { useAuthSession } from "@/hooks/use-auth-session";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";
import { BellRing, Target, Users, GraduationCap } from "lucide-react";
import { RouteErrorView } from "@/components/common/route-error";
import genexMark from "@/assets/genex-mark.png";
import { useT } from "@/lib/i18n/locale-context";

export const Route = createFileRoute("/dashboard/notifications/send")({
  component: SendNotificationPage,
  errorComponent: RouteErrorView
});

function SendNotificationPage() {
  const t = useT();

  const router = useRouter();
  const { isPending, session } = useAuthSession();
  const role = session?.session.role as UserRole | undefined;
  const isAdmin = role === "ADMIN";
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [notificationType, setNotificationType] = useState<NotificationTypeValue>(
    notificationTypeValues[0]
  );
  const [targetMode, setTargetMode] = useState<"role" | "course" | "users">("course");
  const [targetRole, setTargetRole] = useState<UserRole>("STUDENT");
  const [courseId, setCourseId] = useState("");
  const [userIdsText, setUserIdsText] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<{ delivered: number } | null>(null);

  useEffect(() => {
    if (isPending || !role || (role !== "ADMIN" && role !== "TEACHER")) {
      return;
    }

    setTargetMode(role === "ADMIN" ? "role" : "course");
  }, [isPending, role]);

  useEffect(() => {
    if (isPending) {
      return;
    }

    if (!session) {
      return;
    }

    if (role !== "ADMIN" && role !== "TEACHER") {
      void router.navigate({ to: "/dashboard" });
    }
  }, [isPending, role, router, session]);

  async function handleSubmit(e: FormEvent): Promise<void> {
    e.preventDefault();
    setError(null);
    setSuccess(null);
    const userIds = userIdsText
      .split(/[\s,;]+/)
      .map((s) => s.trim())
      .filter(Boolean);

    const target =
      targetMode === "role"
        ? { kind: "role" as const, role: targetRole }
        : targetMode === "course"
          ? { kind: "course" as const, courseId: courseId.trim() }
          : { kind: "users" as const, userIds };

    const parsed = adminSendNotificationSchema.safeParse({
      title: title.trim(),
      body: body.trim(),
      type: notificationType,
      target
    });

    if (!parsed.success) {
      const msg = parsed.error.issues[0]?.message;
      setError(msg ?? "Invalid input");
      return;
    }

    setSubmitting(true);
    try {
      const result = await adminSendNotification(parsed.data);
      setSuccess(result);
      setTitle("");
      setBody("");
      setUserIdsText("");
      if (!isAdmin) {
        setCourseId("");
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to send");
    } finally {
      setSubmitting(false);
    }
  }

  if (isPending || !session || (role !== "ADMIN" && role !== "TEACHER")) {
    return (
      <div className="min-h-[calc(100vh-8rem)] flex items-center justify-center p-6">
        <div className="bg-card/80 p-8 border border-hairline/40 relative w-full max-w-lg overflow-hidden">
          <div className="flex items-center gap-4 mb-8">
            <Skeleton className="size-14 bg-chip-active" />
            <div className="space-y-2">
              <Skeleton className="h-6 w-48 bg-chip-active" />
              <Skeleton className="h-4 w-64 bg-chip-active" />
            </div>
          </div>
          <div className="space-y-6">
            <Skeleton className="h-12 w-full bg-chip-active" />
            <Skeleton className="h-32 w-full bg-chip-active" />
            <Skeleton className="h-12 w-full bg-chip-active" />
            <Skeleton className="h-10 w-full bg-chip-active" />
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-[calc(100vh-8rem)] flex items-center justify-center px-4 py-16 relative overflow-hidden">
      <div className="absolute inset-0 -z-10">
        <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-ink/5 rounded-full blur-[120px]"></div>
        <div
          className="absolute bottom-0 left-0 w-[500px] h-[500px] bg-accent/5 rounded-full blur-[120px]"
          style={{ animationDelay: "2s" }}
        ></div>
      </div>

      <div className="bg-card/80 border border-hairline/40 relative w-full max-w-lg overflow-hidden group">

        <div className="p-8 sm:p-10 border-b border-hairline/30 flex items-center gap-6">
          <div className="flex w-16 h-16 items-center justify-center bg-chip-active border border-hairline/30 relative overflow-hidden group/logo">
            <div className="absolute inset-0 bg-ink/5 group-hover/logo:bg-ink/10 transition-colors"></div>
            <img
              decoding="async"
              loading="lazy"
              src={genexMark}
              alt=""
              className="h-10 w-10 brightness-[0.92] contrast-[1.05] relative z-10"
            />
          </div>
          <div>
            <h3 className="font-body text-2xl font-medium tracking-tight text-ink leading-none">{t("notify.title")}</h3>
            <p className="mt-2 text-sm text-muted font-light leading-relaxed">
              {isAdmin
                ? "Broadcast alerts across the academic hierarchy."
                : "Signal students within your managed modules."}
            </p>
          </div>
        </div>

        <div className="p-8 sm:p-10">
          <form onSubmit={(e) => void handleSubmit(e)} className="space-y-6">
            <div className="space-y-3">
              <Label
                htmlFor="n-title"
                className="text-[0.65rem] font-bold uppercase tracking-widest text-ink/60 pl-1"
              >{t("notify.headline")}</Label>
              <Input
                id="n-title"
                className="h-12 bg-panel-warm/50 border border-hairline/30 text-ink transition-all focus:ring-4 focus:ring-ink/10 font-body"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="e.g. Schedule Update or Result Published"
                required
                maxLength={200}
              />
            </div>

            <div className="space-y-3">
              <Label
                htmlFor="n-body"
                className="text-[0.65rem] font-bold uppercase tracking-widest text-ink/60 pl-1"
              >{t("notify.body")}</Label>
              <textarea
                id="n-body"
                value={body}
                onChange={(e) => setBody(e.target.value)}
                placeholder={t("notify.placeholder")}
                required
                maxLength={4000}
                rows={4}
                className="w-full bg-panel-warm/50 border border-hairline/30 px-5 py-4 text-sm text-ink focus:outline-none focus:ring-4 focus:ring-ink/10 transition-all font-body resize-none placeholder:text-ink/20"
              />
            </div>

            <div className="grid grid-cols-2 gap-6">
              <div className="space-y-3">
                <Label
                  htmlFor="n-type"
                  className="text-[0.65rem] font-bold uppercase tracking-widest text-ink/60 pl-1"
                >{t("notify.category")}</Label>
                <div className="relative group/sel">
                  <select
                    id="n-type"
                    value={notificationType}
                    onChange={(e) =>
                      setNotificationType(notificationTypeSchema.parse(e.target.value))
                    }
                    className="h-12 w-full bg-panel-warm/50 border border-hairline/30 px-5 text-sm font-bold text-ink appearance-none focus:outline-none focus:ring-2 focus:ring-ink/20"
                  >
                    {notificationTypeValues.map((value) => (
                      <option key={value} value={value}>
                        {value.replaceAll("_", " ")}
                      </option>
                    ))}
                  </select>
                  <BellRing className="absolute right-4 top-1/2 -translate-y-1/2 size-4 text-ink/20 group-hover/sel:text-ink/40 transition-colors pointer-events-none" />
                </div>
              </div>

              <div className="space-y-3">
                <Label className="text-[0.65rem] font-bold uppercase tracking-widest text-ink/60 pl-1">{t("notify.category")}</Label>
                <div className="flex h-12 bg-panel-warm/50 border border-hairline/30 p-1">
                  {["course", "users"].map((mode) => (
                    <button
                      key={mode}
                      type="button"
                      onClick={() => setTargetMode(mode as "course" | "users")}
                      className={cn(
                        "flex-1 rounded-xl text-[0.65rem] font-bold uppercase tracking-widest transition-all",
                        targetMode === mode
                          ? "bg-chip-active shadow-sm text-ink"
                          : "text-ink/40 hover:text-ink"
                      )}
                    >
                      {mode === "course" ? (
                        <GraduationCap className="size-3 inline mr-1" />
                      ) : (
                        <Users className="size-3 inline mr-1" />
                      )}
                      {mode}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {isAdmin && (
              <div className="space-y-3">
                <Label className="text-[0.65rem] font-bold uppercase tracking-widest text-ink/60 pl-1">{t("notify.target")}</Label>
                <label
                  className={cn(
                    "flex items-center gap-3 p-4 rounded-2xl border transition-all ",
                    targetMode === "role"
                      ? "bg-accent/5 border-accent/30"
                      : "bg-panel-warm/30 border-hairline/20"
                  )}
                >
                  <input
                    type="radio"
                    className="sr-only"
                    checked={targetMode === "role"}
                    onChange={() => setTargetMode("role")}
                  />
                  <Target
                    className={cn(
                      "size-4",
                      targetMode === "role" ? "text-accent" : "text-ink/30"
                    )}
                  />
                  <span
                    className={cn(
                      "text-xs font-bold uppercase tracking-widest",
                      targetMode === "role" ? "text-accent" : "text-ink/50"
                    )}
                  >{t("notify.byRole")}</span>
                </label>
              </div>
            )}

            <div className="">
              {isAdmin && targetMode === "role" && (
                <div className="space-y-3">
                  <Label
                    htmlFor="n-role"
                    className="text-[0.65rem] font-bold uppercase tracking-widest text-ink/60 pl-1"
                  >{t("notify.selectRole")}</Label>
                  <select
                    id="n-role"
                    value={targetRole}
                    onChange={(e) => setTargetRole(userRoleSchema.parse(e.target.value))}
                    className="h-12 w-full bg-panel-warm/50 border border-hairline/30 px-5 text-sm font-bold text-ink focus:outline-none focus:ring-2 focus:ring-accent/20 appearance-none"
                  >
                    {userRoleValues.map((value) => (
                      <option key={value} value={value}>
                        {value.charAt(0) + value.slice(1).toLowerCase()} Group
                      </option>
                    ))}
                  </select>
                </div>
              )}

              {targetMode === "course" && (
                <div className="space-y-3">
                  <Label
                    htmlFor="n-course"
                    className="text-[0.65rem] font-bold uppercase tracking-widest text-ink/60 pl-1"
                  >{t("notify.courseId")}</Label>
                  <div className="relative">
                    <Input
                      id="n-course"
                      className="h-12 bg-panel-warm/50 border-hairline/30 px-5 font-mono text-sm"
                      value={courseId}
                      onChange={(e) => setCourseId(e.target.value)}
                      placeholder="e.g. 550e8400-e29b-41d4-a716-446655440000"
                      required
                    />
                    <GraduationCap className="absolute right-4 top-1/2 -translate-y-1/2 size-4 text-ink/10" />
                  </div>
                </div>
              )}

              {targetMode === "users" && (
                <div className="space-y-3">
                  <Label
                    htmlFor="n-users"
                    className="text-[0.65rem] font-bold uppercase tracking-widest text-ink/60 pl-1"
                  >{t("notify.userIds")}</Label>
                  <textarea
                    id="n-users"
                    value={userIdsText}
                    onChange={(e) => setUserIdsText(e.target.value)}
                    required
                    rows={3}
                    placeholder="user_123, user_456..."
                    className="w-full bg-panel-warm/50 border border-hairline/30 px-5 py-4 font-mono text-[0.65rem] text-ink focus:outline-none focus:ring-2 focus:ring-ink/20 resize-none"
                  />
                </div>
              )}
            </div>

            <div className="pt-2">
              <Button
                type="submit"
                className="w-full h-14 font-body font-medium transition-all disabled:opacity-40"
                disabled={submitting}
              >
                {submitting ? (
                  <Skeleton className="h-4 w-20 bg-white/20" />
                ) : (
                  "Dispatch Notification"
                )}
              </Button>
            </div>

            {error && (
              <div className="bg-red-500/5 border border-red-500/10 p-4 text-center animate-shake">
                <p className="text-xs font-bold text-red-500 uppercase tracking-widest leading-none">
                  {error}
                </p>
              </div>
            )}

            {success && (
              <div className="bg-green-500/5 border border-green-500/10 p-4 text-center">
                <p className="text-xs font-bold text-green-600 uppercase tracking-widest leading-none">
                  Delivered to {success.delivered} scholar{success.delivered === 1 ? "" : "s"}.
                </p>
              </div>
            )}
          </form>
        </div>
      </div>
    </div>
  );
}
