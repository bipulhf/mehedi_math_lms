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
import { useEffect, useState, type FormEvent, type JSX } from "react";
import { toast } from "sonner";
import { BellRing, GraduationCap, Send, Shield, Users } from "lucide-react";

import { adminSendNotification } from "@/lib/api/admin";
import { useAuthSession } from "@/hooks/use-auth-session";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import { cn } from "@/lib/utils";
import { RouteErrorView } from "@/components/common/route-error";
import genexMark from "@/assets/genex-mark.png";
import { useFormat, useT } from "@/lib/i18n/locale-context";

export const Route = createFileRoute("/dashboard/notifications/send")({
  component: SendNotificationPage,
  errorComponent: RouteErrorView
});

function SendNotificationPage(): JSX.Element {
  const t = useT();
  const format = useFormat();

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

  useEffect(() => {
    if (isPending || !role || (role !== "ADMIN" && role !== "TEACHER")) {
      return;
    }

    setTargetMode(role === "ADMIN" ? "role" : "course");
  }, [isPending, role]);

  useEffect(() => {
    if (isPending || !session) {
      return;
    }

    if (role !== "ADMIN" && role !== "TEACHER") {
      void router.navigate({ to: "/dashboard" });
    }
  }, [isPending, role, router, session]);

  async function handleSubmit(e: FormEvent): Promise<void> {
    e.preventDefault();
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
      body: body.trim(),
      target,
      title: title.trim(),
      type: notificationType
    });

    if (!parsed.success) {
      const msg = parsed.error.issues[0]?.message;
      toast.error(msg ?? "Invalid notification data");
      return;
    }

    setSubmitting(true);
    try {
      const result = await adminSendNotification(parsed.data);
      toast.success(t("notify.delivered", { count: format.digits(String(result.delivered)) }));
      setTitle("");
      setBody("");
      setUserIdsText("");
      if (!isAdmin) {
        setCourseId("");
      }
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to send notification");
    } finally {
      setSubmitting(false);
    }
  }

  if (isPending || !session || (role !== "ADMIN" && role !== "TEACHER")) {
    return (
      <div className="space-y-6">
        <div className="border border-hairline bg-card p-8">
          <Skeleton className="mb-4 h-8 w-48" />
          <Skeleton className="h-4 w-96" />
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Top Header Card */}
      <div className="border border-hairline bg-card p-6">
        <div className="flex items-center gap-3">
          <div className="flex size-10 items-center justify-center border border-hairline bg-panel-warm">
            <img alt="" className="size-6" src={genexMark} />
          </div>
          <div>
            <h1 className="text-xl font-medium text-ink">{t("notify.title")}</h1>
            <p className="mt-0.5 text-sm font-light text-muted">
              {isAdmin ? t("notify.leadAdmin") : t("notify.leadTeacher")}
            </p>
          </div>
        </div>
      </div>

      {/* Main 2-Column Section */}
      <div className="grid gap-6 lg:grid-cols-[1fr_360px]">
        {/* Left Column: Form */}
        <div className="border border-hairline bg-card p-6">
          <form className="space-y-6" onSubmit={(e) => void handleSubmit(e)}>
            {/* Title */}
            <div className="space-y-2">
              <Label htmlFor="n-title">{t("notify.headline")}</Label>
              <Input
                id="n-title"
                maxLength={200}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="e.g. Schedule Update or Quiz Result"
                required
                value={title}
              />
            </div>

            {/* Body */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label htmlFor="n-body">{t("notify.body")}</Label>
                <span className="text-xs text-muted-faint">{body.length} / 4000</span>
              </div>
              <textarea
                className="w-full border border-hairline bg-card p-4 text-base font-light text-ink transition-colors focus:border-accent focus:outline-none"
                id="n-body"
                maxLength={4000}
                onChange={(e) => setBody(e.target.value)}
                placeholder={t("notify.placeholder")}
                required
                rows={4}
                value={body}
              />
            </div>

            {/* Type & Target Scope Selectors */}
            <div className="grid gap-6 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="n-type">{t("notify.category")}</Label>
                <Select
                  id="n-type"
                  onChange={(e) =>
                    setNotificationType(notificationTypeSchema.parse(e.target.value))
                  }
                  value={notificationType}
                >
                  {notificationTypeValues.map((value) => (
                    <option key={value} value={value}>
                      {value.replaceAll("_", " ")}
                    </option>
                  ))}
                </Select>
              </div>

              <div className="space-y-2">
                <Label>{t("notify.target")}</Label>
                <div className="flex border border-hairline bg-panel-warm p-1">
                  {isAdmin && (
                    <button
                      className={cn(
                        "flex-1 px-3 py-1.5 text-xs font-semibold uppercase tracking-wider transition-colors",
                        targetMode === "role"
                          ? "bg-card text-ink shadow-xs"
                          : "text-muted hover:text-ink"
                      )}
                      onClick={() => setTargetMode("role")}
                      type="button"
                    >
                      <Shield className="mr-1 inline size-3.5" />
                      {t("notify.byRole")}
                    </button>
                  )}
                  <button
                    className={cn(
                      "flex-1 px-3 py-1.5 text-xs font-semibold uppercase tracking-wider transition-colors",
                      targetMode === "course"
                        ? "bg-card text-ink shadow-xs"
                        : "text-muted hover:text-ink"
                    )}
                    onClick={() => setTargetMode("course")}
                    type="button"
                  >
                    <GraduationCap className="mr-1 inline size-3.5" />
                    {t("notify.targetCourse")}
                  </button>
                  <button
                    className={cn(
                      "flex-1 px-3 py-1.5 text-xs font-semibold uppercase tracking-wider transition-colors",
                      targetMode === "users"
                        ? "bg-card text-ink shadow-xs"
                        : "text-muted hover:text-ink"
                    )}
                    onClick={() => setTargetMode("users")}
                    type="button"
                  >
                    <Users className="mr-1 inline size-3.5" />
                    {t("notify.targetUsers")}
                  </button>
                </div>
              </div>
            </div>

            {/* Target Inputs based on mode */}
            {isAdmin && targetMode === "role" && (
              <div className="space-y-2">
                <Label htmlFor="n-role">{t("notify.selectRole")}</Label>
                <Select
                  id="n-role"
                  onChange={(e) => setTargetRole(userRoleSchema.parse(e.target.value))}
                  value={targetRole}
                >
                  {userRoleValues.map((value) => (
                    <option key={value} value={value}>
                      {value.charAt(0) + value.slice(1).toLowerCase()} Group
                    </option>
                  ))}
                </Select>
              </div>
            )}

            {targetMode === "course" && (
              <div className="space-y-2">
                <Label htmlFor="n-course">{t("notify.courseId")}</Label>
                <Input
                  id="n-course"
                  onChange={(e) => setCourseId(e.target.value)}
                  placeholder="e.g. engineering-admission-physics"
                  required
                  value={courseId}
                />
              </div>
            )}

            {targetMode === "users" && (
              <div className="space-y-2">
                <Label htmlFor="n-users">{t("notify.userIds")}</Label>
                <textarea
                  className="w-full border border-hairline bg-card p-4 font-mono text-sm text-ink focus:border-accent focus:outline-none"
                  id="n-users"
                  onChange={(e) => setUserIdsText(e.target.value)}
                  placeholder="user_123, user_456..."
                  required
                  rows={3}
                  value={userIdsText}
                />
              </div>
            )}

            <Button className="w-full" disabled={submitting} size="lg" type="submit">
              <Send className="mr-2 size-4" />
              {submitting ? t("notify.dispatching") : t("notify.dispatch")}
            </Button>
          </form>
        </div>

        {/* Right Column: Live Notification Preview */}
        <div className="space-y-6">
          <div className="border border-hairline bg-card p-6">
            <div className="mb-4 flex items-center justify-between border-b border-hairline pb-4">
              <div className="flex items-center gap-2">
                <BellRing className="size-4 text-accent" />
                <h2 className="text-base font-medium text-ink">{t("notify.preview")}</h2>
              </div>
              <Badge tone="quiet">{notificationType.replaceAll("_", " ")}</Badge>
            </div>
            <p className="mb-6 text-xs text-muted-faint">{t("notify.previewLead")}</p>

            {/* Sample Push/Dropdown Card */}
            <div className="border border-hairline bg-paper p-4">
              <div className="flex items-start gap-3">
                <div className="flex size-8 shrink-0 items-center justify-center border border-hairline bg-card">
                  <img alt="" className="size-5" src={genexMark} />
                </div>
                <div className="min-w-0 flex-1 space-y-1">
                  <div className="flex items-baseline justify-between gap-2">
                    <p className="truncate text-base font-medium text-ink">
                      {title.trim() || "Notification Title"}
                    </p>
                    <span className="shrink-0 text-xs text-muted-faint">Just now</span>
                  </div>
                  <p className="text-sm font-light leading-relaxed text-muted">
                    {body.trim() || "Message preview will appear here as you type..."}
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
