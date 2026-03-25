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

export const Route = createFileRoute("/dashboard/admin/users/$id" as never)({
  component: AdminUserDetailPage,
  errorComponent: RouteErrorView
} as never);

function AdminUserDetailPage(): JSX.Element {
  const { id } = Route.useParams();
  const [user, setUser] = useState<AdminUserDetail | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [role, setRole] = useState<"STUDENT" | "TEACHER" | "ACCOUNTANT">("STUDENT");

  useEffect(() => {
    void (async () => {
      setIsLoading(true);

      try {
        const nextUser = await getAdminUser(id);
        setUser(nextUser);
        setName(nextUser.name);
        setEmail(nextUser.email);
        if (nextUser.role !== "ADMIN") {
          setRole(nextUser.role);
        }
      } finally {
        setIsLoading(false);
      }
    })();
  }, [id]);

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
      toast.success("User updated");
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
          <CardDescription>Account detail, editable profile fields, and recent activity history.</CardDescription>
        </CardHeader>
        <CardContent className="grid gap-6 xl:grid-cols-[1fr_0.9fr]">
          <div className="space-y-4">
            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2 md:col-span-2">
                <Label htmlFor="detail-name">Name</Label>
                <Input id="detail-name" value={name} onChange={(event) => setName(event.target.value)} />
              </div>
              <div className="space-y-2 md:col-span-2">
                <Label htmlFor="detail-email">Email</Label>
                <Input id="detail-email" type="email" value={email} onChange={(event) => setEmail(event.target.value)} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="detail-role">Role</Label>
                <Select
                  id="detail-role"
                  disabled={user.role === "ADMIN"}
                  value={user.role === "ADMIN" ? "STUDENT" : role}
                  onChange={(event) => setRole(event.target.value as "STUDENT" | "TEACHER" | "ACCOUNTANT")}
                >
                  <option value="STUDENT">Student</option>
                  <option value="TEACHER">Teacher</option>
                  <option value="ACCOUNTANT">Accountant</option>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Status</Label>
                <div className="rounded-[calc(var(--radius)-0.125rem)] bg-surface-container-low px-4 py-3">
                  <Badge tone={user.isActive ? "green" : "red"}>{user.isActive ? "Active" : "Inactive"}</Badge>
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
                  <Link to="/dashboard/students/$id" params={{ id: user.id }}>
                    View student profile
                  </Link>
                </Button>
              ) : null}
            </div>
          </div>

          <div className="space-y-4">
            <div className="rounded-[calc(var(--radius)-0.125rem)] bg-surface-container-low p-4 text-sm leading-7 text-on-surface/70">
              <p className="font-semibold text-on-surface">Profile signals</p>
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
            <CardTitle>Recent sessions</CardTitle>
            <CardDescription>Session creation history available to administrators.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {user.sessionHistory.length > 0 ? (
              user.sessionHistory.map((session) => (
                <div key={session.id} className="rounded-[calc(var(--radius)-0.125rem)] bg-surface-container-low p-4">
                  <p className="font-semibold text-on-surface">{new Date(session.createdAt).toLocaleString()}</p>
                  <p className="mt-1 text-sm leading-6 text-on-surface/68">
                    {session.userAgent ?? "Unknown agent"}
                  </p>
                  <p className="text-sm text-on-surface/58">IP: {session.ipAddress ?? "Unavailable"}</p>
                </div>
              ))
            ) : (
              <div className="rounded-[calc(var(--radius)-0.125rem)] bg-surface-container-low p-4 text-sm leading-7 text-on-surface/68">
                No recent sessions recorded for this user.
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Recent bug reports</CardTitle>
            <CardDescription>Support signals tied to this user account.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {user.bugReports.length > 0 ? (
              user.bugReports.map((bug) => (
                <div key={bug.id} className="rounded-[calc(var(--radius)-0.125rem)] bg-surface-container-low p-4">
                  <div className="flex items-center justify-between gap-3">
                    <p className="font-semibold text-on-surface">{bug.title}</p>
                    <Badge tone={bug.status === "OPEN" ? "amber" : bug.status === "IN_PROGRESS" ? "blue" : bug.status === "RESOLVED" ? "green" : "gray"}>
                      {bug.status}
                    </Badge>
                  </div>
                  <p className="mt-2 text-sm text-on-surface/58">{new Date(bug.createdAt).toLocaleString()}</p>
                </div>
              ))
            ) : (
              <div className="rounded-[calc(var(--radius)-0.125rem)] bg-surface-container-low p-4 text-sm leading-7 text-on-surface/68">
                No bug reports are associated with this user.
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
