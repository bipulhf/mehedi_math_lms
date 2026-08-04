import { useQuery } from "@tanstack/react-query";
import { Link, createFileRoute } from "@tanstack/react-router";
import type { JSX } from "react";
import { useEffect, useState } from "react";
import { toast } from "sonner";

import { Send } from "lucide-react";

import { ProfilePageSkeleton } from "@/components/profile/profile-editor";
import { RouteErrorView } from "@/components/common/route-error";
import { Badge } from "@/components/ui/badge";
import { BackButton } from "@/components/ui/back-button";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import type { AdminUserDetail } from "@/lib/api/admin";
import { getAdminUser, updateAdminUser } from "@/lib/api/admin";
import { queryKeys } from "@/lib/query/keys";
import { seo } from "@/lib/seo";
import { useT } from "@/lib/i18n/locale-context";

export const Route = createFileRoute("/dashboard/admin/users/$id")({
  head: () =>
    seo({
      description: "View and edit an account's role, status, and details.",
      path: "/dashboard/admin/users",
      title: "User Detail"
    }),
  component: AdminUserDetailPage,
  errorComponent: RouteErrorView
} as never);

function AdminUserDetailPage(): JSX.Element {
  const t = useT();

  const { id } = Route.useParams();
  const { data: fetchedUser, isPending: isLoading } = useQuery<AdminUserDetail>({
    queryFn: async () => getAdminUser(id),
    queryKey: queryKeys.admin.user(id)
  });
  const [user, setUser] = useState<AdminUserDetail | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [role, setRole] = useState<"STUDENT" | "TEACHER" | "ACCOUNTANT">("STUDENT");

  // The form is editable, so the fetched record seeds it rather than driving it.
  useEffect(() => {
    if (!fetchedUser) {
      return;
    }

    setUser(fetchedUser);
    setName(fetchedUser.name);
    setEmail(fetchedUser.email);

    if (fetchedUser.role !== "ADMIN") {
      setRole(fetchedUser.role);
    }
  }, [fetchedUser]);

  const handleSave = async (): Promise<void> => {
    setIsSaving(true);

    try {
      const updatedUser = await updateAdminUser(id, {
        email,
        name,
        role: user?.role === "ADMIN" ? undefined : role
      });

      setUser((currentUser) =>
        currentUser
          ? {
              ...currentUser,
              email: updatedUser.email,
              name: updatedUser.name,
              role: updatedUser.role
            }
          : currentUser
      );
      toast.success(t("auser.updated"));
    } finally {
      setIsSaving(false);
    }
  };

  if (isLoading || !user) {
    return <ProfilePageSkeleton />;
  }

  return (
    <div className="space-y-6">
      {/* Top Header Card */}
      <div className="border border-hairline bg-card p-6">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <div className="mb-1 flex items-center gap-3">
               <BackButton to="/dashboard/admin/users" />
              <Badge tone={user.isActive ? "neutral" : "attention"}>
                {user.isActive ? "Active" : "Suspended"}
              </Badge>
            </div>
            <h1 className="text-xl font-medium text-ink">{user.name}</h1>
            <p className="mt-0.5 text-sm font-light text-muted">{t("auser.lead")}</p>
          </div>
          <div className="flex flex-wrap gap-2">
            {user.role === "STUDENT" ? (
              <Button asChild size="sm" variant="outline">
                <Link params={{ id: user.id }} to="/dashboard/students/$id">
                  {t("auser.viewStudent")}
                </Link>
              </Button>
            ) : null}
            <Button asChild size="sm" variant="outline">
              <Link search={{ userId: user.id }} to="/dashboard/notifications/send">
                <Send className="mr-1.5 size-3.5" />
                {t("auser.sendNotice")}
              </Link>
            </Button>
          </div>
        </div>
      </div>

      {/* Main Details & Signals */}
      <div className="border border-hairline bg-card p-6">
        <div className="grid gap-6 xl:grid-cols-[1fr_0.8fr]">
          <div className="space-y-4">
            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-1.5 md:col-span-2">
                <Label htmlFor="detail-name">{t("common.name")}</Label>
                <Input id="detail-name" onChange={(event) => setName(event.target.value)} value={name} />
              </div>
              <div className="space-y-1.5 md:col-span-2">
                <Label htmlFor="detail-email">{t("auser.email")}</Label>
                <Input id="detail-email" onChange={(event) => setEmail(event.target.value)} type="email" value={email} />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="detail-role">{t("admin.users.role")}</Label>
                <Select
                  disabled={user.role === "ADMIN"}
                  id="detail-role"
                  onChange={(event) => setRole(event.target.value as "STUDENT" | "TEACHER" | "ACCOUNTANT")}
                  value={user.role === "ADMIN" ? "STUDENT" : role}
                >
                  <option value="STUDENT">{t("role.student")}</option>
                  <option value="TEACHER">{t("role.teacherOption")}</option>
                  <option value="ACCOUNTANT">{t("role.accountantOption")}</option>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label>{t("admin.users.statusColumn")}</Label>
                <div className="flex h-10 items-center border border-hairline bg-panel-warm px-3">
                  <Badge tone={user.isActive ? "neutral" : "attention"}>{user.isActive ? "Operational" : "Suspended"}</Badge>
                </div>
              </div>
            </div>

            <div className="pt-2">
              <Button disabled={isSaving} onClick={() => void handleSave()} type="button">
                {isSaving ? "Saving..." : "Save Changes"}
              </Button>
            </div>
          </div>

          <div className="border border-hairline bg-panel-warm/40 p-4 text-xs space-y-2">
            <p className="font-semibold text-ink uppercase tracking-wider">{t("auser.signals")}</p>
            <div className="space-y-1.5 text-muted font-light">
              <p><strong className="font-medium text-ink">User ID:</strong> {user.id}</p>
              <p><strong className="font-medium text-ink">Slug:</strong> {user.slug ?? "Not assigned"}</p>
              <p><strong className="font-medium text-ink">Role:</strong> {user.role}</p>
              <p><strong className="font-medium text-ink">Profile Status:</strong> {user.profileCompleted ? "Complete" : "Incomplete"}</p>
              <p><strong className="font-medium text-ink">Teacher Phone:</strong> {user.teacherProfile?.phone ?? "N/A"}</p>
              <p><strong className="font-medium text-ink">Institution:</strong> {user.studentProfile?.institution ?? "N/A"}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Session History & Bug Reports */}
      <div className="grid gap-6 xl:grid-cols-2">
        <div className="border border-hairline bg-card p-6 space-y-4">
          <div>
            <h2 className="text-base font-medium text-ink">{t("auser.sessions")}</h2>
            <p className="text-xs font-light text-muted">{t("auser.sessionsLead")}</p>
          </div>
          <div className="space-y-2.5">
            {user.sessionHistory.length > 0 ? (
              user.sessionHistory.map((session) => (
                <div key={session.id} className="border border-hairline bg-panel-warm/30 p-3 text-xs">
                  <p className="font-medium text-ink">{new Date(session.createdAt).toLocaleString()}</p>
                  <p className="mt-0.5 text-muted truncate">
                    {session.userAgent ?? "Unknown agent"}
                  </p>
                  <p className="text-muted-faint font-mono mt-0.5">IP: {session.ipAddress ?? "Unavailable"}</p>
                </div>
              ))
            ) : (
              <div className="border border-hairline bg-panel-warm/40 p-4 text-center text-xs font-light text-muted">{t("auser.noSessions")}</div>
            )}
          </div>
        </div>

        <div className="border border-hairline bg-card p-6 space-y-4">
          <div>
            <h2 className="text-base font-medium text-ink">{t("auser.bugs")}</h2>
            <p className="text-xs font-light text-muted">{t("auser.bugsLead")}</p>
          </div>
          <div className="space-y-2.5">
            {user.bugReports.length > 0 ? (
              user.bugReports.map((bug) => (
                <div key={bug.id} className="border border-hairline bg-panel-warm/30 p-3 text-xs">
                  <div className="flex items-center justify-between gap-3">
                    <p className="font-medium text-ink truncate">{bug.title}</p>
                    <Badge tone={bug.status === "OPEN" ? "attention" : bug.status === "IN_PROGRESS" ? "neutral" : bug.status === "RESOLVED" ? "neutral" : "quiet"}>
                      {bug.status}
                    </Badge>
                  </div>
                  <p className="mt-1 text-muted-faint">{new Date(bug.createdAt).toLocaleString()}</p>
                </div>
              ))
            ) : (
              <div className="border border-hairline bg-panel-warm/40 p-4 text-center text-xs font-light text-muted">{t("auser.noBugs")}</div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
