import { useQuery } from "@tanstack/react-query";
import { Link, createFileRoute } from "@tanstack/react-router";
import type { JSX } from "react";
import { useEffect, useState } from "react";
import { toast } from "sonner";

import { ProfilePageSkeleton } from "@/components/profile/profile-editor";
import { RouteErrorView } from "@/components/common/route-error";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import type { AdminUserDetail } from "@/lib/api/admin";
import { getAdminUser, updateAdminUser } from "@/lib/api/admin";
import { queryKeys } from "@/lib/query/keys";
import { useT } from "@/lib/i18n/locale-context";

export const Route = createFileRoute("/dashboard/admin/users/$id")({
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
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle>{user.name}</CardTitle>
          <CardDescription>{t("auser.lead")}</CardDescription>
        </CardHeader>
        <CardContent className="grid gap-6 xl:grid-cols-[1fr_0.9fr]">
          <div className="space-y-4">
            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2 md:col-span-2">
                <Label htmlFor="detail-name">{t("common.name")}</Label>
                <Input id="detail-name" value={name} onChange={(event) => setName(event.target.value)} />
              </div>
              <div className="space-y-2 md:col-span-2">
                <Label htmlFor="detail-email">{t("auser.email")}</Label>
                <Input id="detail-email" type="email" value={email} onChange={(event) => setEmail(event.target.value)} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="detail-role">{t("admin.users.role")}</Label>
                <Select
                  id="detail-role"
                  disabled={user.role === "ADMIN"}
                  value={user.role === "ADMIN" ? "STUDENT" : role}
                  onChange={(event) => setRole(event.target.value as "STUDENT" | "TEACHER" | "ACCOUNTANT")}
                >
                  <option value="STUDENT">{t("role.student")}</option>
                  <option value="TEACHER">{t("role.teacherOption")}</option>
                  <option value="ACCOUNTANT">{t("role.accountantOption")}</option>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>{t("admin.users.statusColumn")}</Label>
                <div className="rounded-[calc(var(--radius)-0.125rem)] bg-panel-warm px-4 py-3">
                  <Badge tone={user.isActive ? "neutral" : "attention"}>{user.isActive ? "Active" : "Inactive"}</Badge>
                </div>
              </div>
            </div>

            <div className="flex gap-3">
              <Button type="button" disabled={isSaving} onClick={() => void handleSave()}>
                {isSaving ? <span className="h-4 w-16 rounded-full bg-white/25" aria-hidden="true" /> : null}
                {isSaving ? "Saving user" : "Save changes"}
              </Button>
              {user.role === "STUDENT" ? (
                <Button asChild type="button" variant="outline">
                  <Link to="/dashboard/students/$id" params={{ id: user.id }}>{t("auser.viewStudent")}</Link>
                </Button>
              ) : null}
            </div>
          </div>

          <div className="space-y-4">
            <div className="rounded-[calc(var(--radius)-0.125rem)] bg-panel-warm p-4 text-sm leading-7 text-ink/70">
              <p className="font-semibold text-ink">{t("auser.signals")}</p>
              <p>Slug: {user.slug ?? "Not assigned"}</p>
              <p>Image: {user.image ?? "Not assigned"}</p>
              <p>Profile completed: {user.profileCompleted ? "Yes" : "No"}</p>
              <p>Teacher phone: {user.teacherProfile?.phone ?? "N/A"}</p>
              <p>Student institution: {user.studentProfile?.institution ?? "N/A"}</p>
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="grid gap-4 xl:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>{t("auser.sessions")}</CardTitle>
            <CardDescription>{t("auser.sessionsLead")}</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {user.sessionHistory.length > 0 ? (
              user.sessionHistory.map((session) => (
                <div key={session.id} className="rounded-[calc(var(--radius)-0.125rem)] bg-panel-warm p-4">
                  <p className="font-semibold text-ink">{new Date(session.createdAt).toLocaleString()}</p>
                  <p className="mt-1 text-sm leading-6 text-ink/68">
                    {session.userAgent ?? "Unknown agent"}
                  </p>
                  <p className="text-sm text-ink/58">IP: {session.ipAddress ?? "Unavailable"}</p>
                </div>
              ))
            ) : (
              <div className="rounded-[calc(var(--radius)-0.125rem)] bg-panel-warm p-4 text-sm leading-7 text-ink/68">{t("auser.noSessions")}</div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>{t("auser.bugs")}</CardTitle>
            <CardDescription>{t("auser.bugsLead")}</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {user.bugReports.length > 0 ? (
              user.bugReports.map((bug) => (
                <div key={bug.id} className="rounded-[calc(var(--radius)-0.125rem)] bg-panel-warm p-4">
                  <div className="flex items-center justify-between gap-3">
                    <p className="font-semibold text-ink">{bug.title}</p>
                    <Badge tone={bug.status === "OPEN" ? "attention" : bug.status === "IN_PROGRESS" ? "neutral" : bug.status === "RESOLVED" ? "neutral" : "quiet"}>
                      {bug.status}
                    </Badge>
                  </div>
                  <p className="mt-2 text-sm text-ink/58">{new Date(bug.createdAt).toLocaleString()}</p>
                </div>
              ))
            ) : (
              <div className="rounded-[calc(var(--radius)-0.125rem)] bg-panel-warm p-4 text-sm leading-7 text-ink/68">{t("auser.noBugs")}</div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
