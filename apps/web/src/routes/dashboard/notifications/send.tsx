import {
  adminSendNotificationSchema,
  notificationTypeSchema,
  notificationTypeValues,
  type NotificationTypeValue,
  userRoleSchema,
  type UserRole,
  userRoleValues
} from "@mma/shared";
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
import mmaLogo from "@/assets/mma-logo.svg";

export const Route = createFileRoute("/dashboard/notifications/send")({
  component: SendNotificationPage
});

function SendNotificationPage() {
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
      <div className="min-h-[calc(100vh-8rem)] flex items-center justify-center p-6 animate-pulse">
        <div className="bg-surface-container-lowest/80 backdrop-blur-3xl rounded-4xl p-8 border border-outline-variant/40 shadow-xl relative w-full max-w-lg overflow-hidden">
          <div className="flex items-center gap-4 mb-8">
            <Skeleton className="size-14 rounded-2xl bg-surface-container-highest" />
            <div className="space-y-2">
              <Skeleton className="h-6 w-48 bg-surface-container-highest" />
              <Skeleton className="h-4 w-64 bg-surface-container-highest" />
            </div>
          </div>
          <div className="space-y-6">
            <Skeleton className="h-12 w-full bg-surface-container-highest rounded-2xl" />
            <Skeleton className="h-32 w-full bg-surface-container-highest rounded-2xl" />
            <Skeleton className="h-12 w-full bg-surface-container-highest rounded-2xl" />
            <Skeleton className="h-10 w-full bg-surface-container-highest rounded-xl" />
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-[calc(100vh-8rem)] flex items-center justify-center px-4 py-16 relative overflow-hidden">
      <div className="absolute inset-0 -z-10">
        <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-primary/5 rounded-full blur-[120px] animate-pulse"></div>
        <div
          className="absolute bottom-0 left-0 w-[500px] h-[500px] bg-secondary/5 rounded-full blur-[120px] animate-pulse"
          style={{ animationDelay: "2s" }}
        ></div>
      </div>

      <div className="bg-surface-container-lowest/80 backdrop-blur-3xl rounded-4xl border border-outline-variant/40 shadow-2xl relative w-full max-w-lg overflow-hidden group animate-in fade-in zoom-in-95 duration-700">
        <div className="absolute -top-12 -right-12 w-48 h-48 bg-primary/5 rounded-full blur-2xl pointer-events-none transition-all duration-1000 group-hover:bg-primary/10 z-[-1]"></div>

        <div className="p-8 sm:p-10 border-b border-outline-variant/30 flex items-center gap-6">
          <div className="flex w-16 h-16 items-center justify-center rounded-3xl bg-surface-container-high border border-outline-variant/30 shadow-sm relative overflow-hidden group/logo">
            <div className="absolute inset-0 bg-primary/5 group-hover/logo:bg-primary/10 transition-colors"></div>
            <img
              src={mmaLogo}
              alt=""
              className="h-10 w-10 brightness-[0.92] contrast-[1.05] relative z-10"
            />
          </div>
          <div>
            <h3 className="font-headline text-2xl font-extrabold tracking-tight text-on-surface leading-none">
              Global Messenger
            </h3>
            <p className="mt-2 text-sm text-on-surface-variant font-light leading-relaxed">
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
                className="text-[0.65rem] font-bold uppercase tracking-widest text-on-surface/60 pl-1"
              >
                Notification Headline
              </Label>
              <Input
                id="n-title"
                className="h-12 rounded-2xl bg-surface-container-low/50 border border-outline-variant/30 text-on-surface transition-all focus:ring-4 focus:ring-primary/10 font-body"
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
                className="text-[0.65rem] font-bold uppercase tracking-widest text-on-surface/60 pl-1"
              >
                Message Body
              </Label>
              <textarea
                id="n-body"
                value={body}
                onChange={(e) => setBody(e.target.value)}
                placeholder="Draft your detailed message here..."
                required
                maxLength={4000}
                rows={4}
                className="w-full rounded-3xl bg-surface-container-low/50 border border-outline-variant/30 px-5 py-4 text-sm text-on-surface focus:outline-none focus:ring-4 focus:ring-primary/10 transition-all font-body resize-none shadow-inner placeholder:text-on-surface/20"
              />
            </div>

            <div className="grid grid-cols-2 gap-6">
              <div className="space-y-3">
                <Label
                  htmlFor="n-type"
                  className="text-[0.65rem] font-bold uppercase tracking-widest text-on-surface/60 pl-1"
                >
                  Category
                </Label>
                <div className="relative group/sel">
                  <select
                    id="n-type"
                    value={notificationType}
                    onChange={(e) =>
                      setNotificationType(notificationTypeSchema.parse(e.target.value))
                    }
                    className="h-12 w-full rounded-2xl bg-surface-container-low/50 border border-outline-variant/30 px-5 text-sm font-bold text-on-surface appearance-none focus:outline-none focus:ring-2 focus:ring-primary/20"
                  >
                    {notificationTypeValues.map((value) => (
                      <option key={value} value={value}>
                        {value.replaceAll("_", " ")}
                      </option>
                    ))}
                  </select>
                  <BellRing className="absolute right-4 top-1/2 -translate-y-1/2 size-4 text-on-surface/20 group-hover/sel:text-primary/40 transition-colors pointer-events-none" />
                </div>
              </div>

              <div className="space-y-3">
                <Label className="text-[0.65rem] font-bold uppercase tracking-widest text-on-surface/60 pl-1">
                  Intent
                </Label>
                <div className="flex h-12 rounded-2xl bg-surface-container-low/50 border border-outline-variant/30 p-1">
                  {["course", "users"].map((mode) => (
                    <button
                      key={mode}
                      type="button"
                      onClick={() => setTargetMode(mode as "course" | "users")}
                      className={cn(
                        "flex-1 rounded-xl text-[0.65rem] font-bold uppercase tracking-widest transition-all",
                        targetMode === mode
                          ? "bg-surface-container-highest shadow-sm text-primary"
                          : "text-on-surface/40 hover:text-on-surface"
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
                <Label className="text-[0.65rem] font-bold uppercase tracking-widest text-on-surface/60 pl-1">
                  Administrative Target
                </Label>
                <label
                  className={cn(
                    "flex items-center gap-3 p-4 rounded-2xl border transition-all cursor-pointer",
                    targetMode === "role"
                      ? "bg-secondary/5 border-secondary/30"
                      : "bg-surface-container-low/30 border-outline-variant/20"
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
                      targetMode === "role" ? "text-secondary" : "text-on-surface/30"
                    )}
                  />
                  <span
                    className={cn(
                      "text-xs font-bold uppercase tracking-widest",
                      targetMode === "role" ? "text-secondary" : "text-on-surface/50"
                    )}
                  >
                    Target by global role
                  </span>
                </label>
              </div>
            )}

            <div className="animate-in fade-in slide-in-from-top-2 duration-300">
              {isAdmin && targetMode === "role" && (
                <div className="space-y-3">
                  <Label
                    htmlFor="n-role"
                    className="text-[0.65rem] font-bold uppercase tracking-widest text-on-surface/60 pl-1"
                  >
                    Select Demographic
                  </Label>
                  <select
                    id="n-role"
                    value={targetRole}
                    onChange={(e) => setTargetRole(userRoleSchema.parse(e.target.value))}
                    className="h-12 w-full rounded-2xl bg-surface-container-low/50 border border-outline-variant/30 px-5 text-sm font-bold text-on-surface focus:outline-none focus:ring-2 focus:ring-secondary/20 appearance-none"
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
                    className="text-[0.65rem] font-bold uppercase tracking-widest text-on-surface/60 pl-1"
                  >
                    Target Module UUID
                  </Label>
                  <div className="relative">
                    <Input
                      id="n-course"
                      className="h-12 rounded-2xl bg-surface-container-low/50 border-outline-variant/30 px-5 font-mono text-sm"
                      value={courseId}
                      onChange={(e) => setCourseId(e.target.value)}
                      placeholder="e.g. 550e8400-e29b-41d4-a716-446655440000"
                      required
                    />
                    <GraduationCap className="absolute right-4 top-1/2 -translate-y-1/2 size-4 text-on-surface/10" />
                  </div>
                </div>
              )}

              {targetMode === "users" && (
                <div className="space-y-3">
                  <Label
                    htmlFor="n-users"
                    className="text-[0.65rem] font-bold uppercase tracking-widest text-on-surface/60 pl-1"
                  >
                    User ID Collection (CSV)
                  </Label>
                  <textarea
                    id="n-users"
                    value={userIdsText}
                    onChange={(e) => setUserIdsText(e.target.value)}
                    required
                    rows={3}
                    placeholder="user_123, user_456..."
                    className="w-full rounded-2xl bg-surface-container-low/50 border border-outline-variant/30 px-5 py-4 font-mono text-[0.65rem] text-on-surface focus:outline-none focus:ring-2 focus:ring-primary/20 resize-none"
                  />
                </div>
              )}
            </div>

            <div className="pt-2">
              <Button
                type="submit"
                className="w-full h-14 rounded-3xl font-headline font-extrabold shadow-lg transition-all hover:scale-[1.02] active:scale-[0.98] disabled:opacity-40"
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
              <div className="rounded-2xl bg-red-500/5 border border-red-500/10 p-4 text-center animate-shake">
                <p className="text-xs font-bold text-red-500 uppercase tracking-widest leading-none">
                  {error}
                </p>
              </div>
            )}

            {success && (
              <div className="rounded-2xl bg-green-500/5 border border-green-500/10 p-4 text-center animate-in fade-in slide-in-from-top-4">
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
