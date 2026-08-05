import {
  adminSendNotificationSchema,
  notificationTypeSchema,
  notificationTypeValues,
  type NotificationTypeValue,
  userRoleSchema,
  type UserRole,
  userRoleValues
} from "@genex/shared";
import { useQuery } from "@tanstack/react-query";
import { createFileRoute, useRouter } from "@tanstack/react-router";
import { useEffect, useState, type FormEvent, type JSX } from "react";
import { toast } from "sonner";
import { BellRing, GraduationCap, Search, Send, Shield, Users, X } from "lucide-react";
import { z } from "zod";

import { adminSendNotification, getAdminUser, listAdminUsers } from "@/lib/api/admin";
import { useAuthSession } from "@/hooks/use-auth-session";
import { Badge } from "@/components/ui/badge";
import { BackButton } from "@/components/ui/back-button";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import { RichTextContent } from "@/components/ui/rich-text-content";
import { RichTextEditor } from "@/components/ui/rich-text-editor";
import { cn } from "@/lib/utils";
import { stripHtml } from "@/lib/html";
import { RouteErrorView } from "@/components/common/route-error";
import genexMark from "@/assets/genex-mark.png";
import { queryKeys } from "@/lib/query/keys";
import { seo } from "@/lib/seo";
import { useFormat, useT } from "@/lib/i18n/locale-context";

interface PickedUser {
  email: string;
  id: string;
  name: string;
}

const notifySearchSchema = z.object({
  userId: z.string().uuid().optional()
});

export const Route = createFileRoute("/dashboard/notifications/send")({
  head: () =>
    seo({
      description: "Send a notification to students, teachers, or everyone.",
      path: "/dashboard/notifications/send",
      title: "Send Notification"
    }),
  validateSearch: (search) => notifySearchSchema.parse(search),
  component: SendNotificationPage,
  errorComponent: RouteErrorView
});

function SendNotificationPage(): JSX.Element {
  const t = useT();
  const format = useFormat();

  const router = useRouter();
  const search = Route.useSearch();
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
  const [pickedUsers, setPickedUsers] = useState<readonly PickedUser[]>([]);
  const [userSearch, setUserSearch] = useState("");
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

  // A "Send notice" shortcut from a user's profile page arrives here with
  // ?userId=... — preselect that person and switch straight to users mode.
  useEffect(() => {
    if (!search.userId) {
      return;
    }

    setTargetMode("users");
    getAdminUser(search.userId)
      .then((user) => {
        setPickedUsers((current) =>
          current.some((picked) => picked.id === user.id)
            ? current
            : [...current, { email: user.email, id: user.id, name: user.name }]
        );
      })
      .catch(() => {
        toast.error("Could not load the preselected user");
      });
  }, [search.userId]);

  const { data: userSearchResults } = useQuery({
    enabled: targetMode === "users" && userSearch.trim().length > 0,
    queryFn: async () => listAdminUsers({ limit: 6, search: userSearch.trim() }),
    queryKey: queryKeys.admin.users({ limit: 6, search: userSearch.trim() })
  });

  const userSearchMatches = (userSearchResults?.data ?? []).filter(
    (user) => !pickedUsers.some((picked) => picked.id === user.id)
  );

  function pickUser(user: PickedUser): void {
    setPickedUsers((current) => [...current, user]);
    setUserSearch("");
  }

  function removePickedUser(userId: string): void {
    setPickedUsers((current) => current.filter((user) => user.id !== userId));
  }

  async function handleSubmit(e: FormEvent): Promise<void> {
    e.preventDefault();

    const target =
      targetMode === "role"
        ? { kind: "role" as const, role: targetRole }
        : targetMode === "course"
          ? { kind: "course" as const, courseId: courseId.trim() }
          : { kind: "users" as const, userIds: pickedUsers.map((user) => user.id) };

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
      setPickedUsers([]);
      setUserSearch("");
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
        <div className="border border-hairline bg-card p-4 sm:p-6 lg:p-8">
          <Skeleton className="mb-4 h-8 w-48" />
          <Skeleton className="h-4 w-96" />
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <BackButton to="/dashboard" />
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
                <span className="text-xs text-muted-faint">{stripHtml(body).trim().length} / 4000</span>
              </div>
              <RichTextEditor
                id="n-body"
                placeholder={t("notify.placeholder")}
                value={body}
                onChange={(value) => setBody(value)}
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
                <Label htmlFor="n-users">{t("notify.targetUsers")}</Label>

                {pickedUsers.length > 0 && (
                  <div className="flex flex-wrap gap-2">
                    {pickedUsers.map((user) => (
                      <span
                        className="inline-flex items-center gap-1.5 border border-hairline bg-chip-active px-2.5 py-1 text-xs text-ink"
                        key={user.id}
                      >
                        {user.name}
                        <button
                          aria-label={t("notify.removeUser", { name: user.name })}
                          onClick={() => removePickedUser(user.id)}
                          type="button"
                        >
                          <X className="size-3" />
                        </button>
                      </span>
                    ))}
                  </div>
                )}

                <div className="relative">
                  <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-faint" />
                  <Input
                    className="pl-9"
                    id="n-users"
                    onChange={(e) => setUserSearch(e.target.value)}
                    placeholder={t("notify.searchUsers")}
                    value={userSearch}
                  />
                  {userSearch.trim().length > 0 && (
                    <div className="absolute z-10 mt-1 w-full border border-hairline bg-card shadow-md">
                      {userSearchMatches.length > 0 ? (
                        userSearchMatches.map((user) => (
                          <button
                            className="flex w-full flex-col items-start px-3 py-2 text-left hover:bg-panel-warm"
                            key={user.id}
                            onClick={() => pickUser(user)}
                            type="button"
                          >
                            <span className="text-sm text-ink">{user.name}</span>
                            <span className="text-xs text-muted-faint">{user.email}</span>
                          </button>
                        ))
                      ) : (
                        <p className="px-3 py-2 text-xs text-muted-faint">{t("notify.noUsersFound")}</p>
                      )}
                    </div>
                  )}
                </div>

                {pickedUsers.length > 0 && (
                  <p className="text-xs text-muted-faint">
                    {t("notify.selectedCount", { count: format.digits(String(pickedUsers.length)) })}
                  </p>
                )}
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
                  {body.trim() ? (
                    <RichTextContent
                      className="text-sm font-light leading-relaxed text-muted"
                      html={body}
                    />
                  ) : (
                    <p className="text-sm font-light leading-relaxed text-muted">
                      Message preview will appear here as you type...
                    </p>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
