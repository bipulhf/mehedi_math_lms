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
import { ProfilePageSkeleton } from "@/components/profile/profile-editor";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
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
        ? ({ kind: "role" as const, role: targetRole })
        : targetMode === "course"
          ? ({ kind: "course" as const, courseId: courseId.trim() })
          : ({ kind: "users" as const, userIds });

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

  if (isPending || !session) {
    return <ProfilePageSkeleton />;
  }

  if (role !== "ADMIN" && role !== "TEACHER") {
    return <ProfilePageSkeleton />;
  }

  return (
    <div className="min-h-[calc(100vh-8rem)] flex items-center justify-center px-4 py-10">
      <div className="absolute inset-0 -z-10 overflow-hidden bg-linear-to-br from-[#f5f3ff] via-[#fafafa] to-[#e8f4f8]" />
      <div className="pointer-events-none absolute -top-24 right-[-10%] h-[420px] w-[420px] rounded-full bg-secondary/12 blur-3xl" />
      <div className="pointer-events-none absolute bottom-[-20%] left-[-5%] h-[380px] w-[380px] rounded-full bg-primary/8 blur-3xl" />
      <Card className="relative w-full max-w-lg border border-outline/15 shadow-lg shadow-primary/5 bg-surface-container-low/90 backdrop-blur-sm">
        <CardHeader className="space-y-2">
          <div className="flex items-center gap-3">
            <div className="flex w-14 h-14 items-center justify-center rounded-2xl bg-surface-container-high shadow-inner border border-outline/20">
              <img
                src={mmaLogo}
                alt=""
                className="h-10 w-10 brightness-[0.92] contrast-[1.05]"
              />
            </div>
            <div>
              <CardTitle className="font-display text-xl">Send notification</CardTitle>
              <p className="text-sm text-on-surface-variant mt-0.5">
                {isAdmin
                  ? "Target by role, course, or specific users."
                  : "Target enrolled students in a course you manage, or list user IDs."}
              </p>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <form onSubmit={(e) => void handleSubmit(e)} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="n-title">Title</Label>
              <Input
                id="n-title"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                required
                maxLength={200}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="n-body">Message</Label>
              <textarea
                id="n-body"
                value={body}
                onChange={(e) => setBody(e.target.value)}
                required
                maxLength={4000}
                rows={4}
                className="w-full rounded-[calc(var(--radius)-0.125rem)] bg-surface-container-low px-4 py-3 text-sm text-on-surface shadow-[inset_0_0_0_1px_rgba(118,119,125,0.14)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-secondary-container/20 resize-y min-h-[100px]"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="n-type">Type</Label>
              <select
                id="n-type"
                value={notificationType}
                onChange={(e) => setNotificationType(notificationTypeSchema.parse(e.target.value))}
                className="h-12 w-full rounded-[calc(var(--radius)-0.125rem)] bg-surface-container-low px-4 text-sm text-on-surface shadow-[inset_0_0_0_1px_rgba(118,119,125,0.14)]"
              >
                {notificationTypeValues.map((value) => (
                  <option key={value} value={value}>
                    {value.replaceAll("_", " ")}
                  </option>
                ))}
              </select>
            </div>

            <div className="space-y-2">
              <span className="text-sm font-medium text-on-surface">Audience</span>
              <div className="flex flex-wrap gap-4 text-sm">
                {isAdmin ? (
                  <label className="inline-flex items-center gap-2 cursor-pointer">
                    <input
                      type="radio"
                      name="aud"
                      checked={targetMode === "role"}
                      onChange={() => setTargetMode("role")}
                    />
                    By role
                  </label>
                ) : null}
                <label className="inline-flex items-center gap-2 cursor-pointer">
                  <input
                    type="radio"
                    name="aud"
                    checked={targetMode === "course"}
                    onChange={() => setTargetMode("course")}
                  />
                  Course enrollments
                </label>
                <label className="inline-flex items-center gap-2 cursor-pointer">
                  <input
                    type="radio"
                    name="aud"
                    checked={targetMode === "users"}
                    onChange={() => setTargetMode("users")}
                  />
                  Specific user IDs
                </label>
              </div>
            </div>

            {isAdmin && targetMode === "role" ? (
              <div className="space-y-2">
                <Label htmlFor="n-role">Role</Label>
                <select
                  id="n-role"
                  value={targetRole}
                  onChange={(e) => setTargetRole(userRoleSchema.parse(e.target.value))}
                  className="h-12 w-full rounded-[calc(var(--radius)-0.125rem)] bg-surface-container-low px-4 text-sm text-on-surface shadow-[inset_0_0_0_1px_rgba(118,119,125,0.14)]"
                >
                  {userRoleValues.map((value) => (
                    <option key={value} value={value}>
                      {value.charAt(0) + value.slice(1).toLowerCase()}
                    </option>
                  ))}
                </select>
              </div>
            ) : null}

            {targetMode === "course" ? (
              <div className="space-y-2">
                <Label htmlFor="n-course">Course ID</Label>
                <Input
                  id="n-course"
                  value={courseId}
                  onChange={(e) => setCourseId(e.target.value)}
                  placeholder="UUID"
                  required
                />
              </div>
            ) : null}

            {targetMode === "users" ? (
              <div className="space-y-2">
                <Label htmlFor="n-users">User IDs (comma or space separated)</Label>
                <textarea
                  id="n-users"
                  value={userIdsText}
                  onChange={(e) => setUserIdsText(e.target.value)}
                  required
                  rows={3}
                  className="w-full rounded-[calc(var(--radius)-0.125rem)] bg-surface-container-low px-4 py-3 font-mono text-xs text-on-surface shadow-[inset_0_0_0_1px_rgba(118,119,125,0.14)]"
                />
              </div>
            ) : null}

            {error ? <p className="text-sm text-[#c4353b]">{error}</p> : null}
            {success ? (
              <p className="text-sm text-green-800">
                Sent to {success.delivered} recipient{success.delivered === 1 ? "" : "s"}.
              </p>
            ) : null}

            <Button type="submit" className="w-full" disabled={submitting}>
              {submitting ? "Sending…" : "Send notification"}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
