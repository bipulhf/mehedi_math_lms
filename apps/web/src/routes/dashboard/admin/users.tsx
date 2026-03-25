import { Link, createFileRoute } from "@tanstack/react-router";
import type { JSX } from "react";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { createAdminUserSchema } from "@mma/shared";

import { DataTableSkeleton } from "@/components/common/data-table-skeleton";
import { RouteErrorView } from "@/components/common/route-error";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import { useAuthSession } from "@/hooks/use-auth-session";
import type { AdminUserListItem, CreateAdminUserInput } from "@/lib/api/admin";
import { createAdminUser, deleteAdminUser, listAdminUsers, updateAdminUserStatus } from "@/lib/api/admin";
import { useZodForm } from "@/lib/forms/use-zod-form";

export const Route = createFileRoute("/dashboard/admin/users" as never)({
  component: AdminUsersPage,
  errorComponent: RouteErrorView
} as never);

function roleTone(role: AdminUserListItem["role"]): "blue" | "gray" | "green" | "violet" {
  if (role === "ADMIN") {
    return "violet";
  }

  if (role === "TEACHER") {
    return "blue";
  }

  if (role === "ACCOUNTANT") {
    return "gray";
  }

  return "green";
}

function AdminUsersPage(): JSX.Element {
  const { session } = useAuthSession();
  const [users, setUsers] = useState<readonly AdminUserListItem[]>([]);
  const [search, setSearch] = useState("");
  const [role, setRole] = useState("");
  const [status, setStatus] = useState<"all" | "active" | "inactive">("all");
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [createdPassword, setCreatedPassword] = useState<string | null>(null);
  const form = useZodForm<CreateAdminUserInput>({
    defaultValues: {
      email: "",
      name: "",
      role: "TEACHER"
    },
    schema: createAdminUserSchema
  });
  const {
    formState: { errors },
    handleSubmit,
    register,
    reset
  } = form;

  const loadUsers = async (): Promise<void> => {
    setIsLoading(true);

    try {
      const response = await listAdminUsers({
        limit: 10,
        page,
        role: role ? (role as AdminUserListItem["role"]) : undefined,
        search,
        status
      });

      setUsers(response.data);
      setTotalPages(response.pagination.pages);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    void loadUsers();
  }, [page, role, search, status]);

  const onCreate = handleSubmit(async (values) => {
    setIsSubmitting(true);

    try {
      const createdUser = await createAdminUser(values);
      setCreatedPassword(createdUser.temporaryPassword);
      reset();
      toast.success("Staff account created");
      await loadUsers();
    } finally {
      setIsSubmitting(false);
    }
  });

  const handleStatusToggle = async (user: AdminUserListItem): Promise<void> => {
    const nextStatus = !user.isActive;
    const actionLabel = nextStatus ? "activate" : "deactivate";

    if (!window.confirm(`Are you sure you want to ${actionLabel} ${user.name}?`)) {
      return;
    }

    await updateAdminUserStatus(user.id, { isActive: nextStatus });
    toast.success(`User ${nextStatus ? "activated" : "deactivated"}`);
    await loadUsers();
  };

  const handleDelete = async (user: AdminUserListItem): Promise<void> => {
    if (!window.confirm(`Soft delete ${user.name}? This will disable access.`)) {
      return;
    }

    await deleteAdminUser(user.id);
    toast.success("User deleted");
    await loadUsers();
  };

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle>Account management</CardTitle>
          <CardDescription>
            Create teacher and accountant accounts, control access, and inspect user state from one surface.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <form className="grid gap-4 lg:grid-cols-[1fr_1fr_0.7fr_auto]" onSubmit={onCreate}>
            <div className="space-y-2">
              <Label htmlFor="create-name">Name</Label>
              <Input id="create-name" error={errors.name?.message} {...register("name")} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="create-email">Email</Label>
              <Input id="create-email" type="email" error={errors.email?.message} {...register("email")} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="create-role">Role</Label>
              <Select id="create-role" error={errors.role?.message} {...register("role")}>
                <option value="TEACHER">Teacher</option>
                <option value="ACCOUNTANT">Accountant</option>
              </Select>
            </div>
            <div className="flex items-end">
              <Button className="w-full" type="submit" disabled={isSubmitting}>
                {isSubmitting ? <span className="h-4 w-16 rounded-full bg-white/25" aria-hidden="true" /> : null}
                {isSubmitting ? "Creating user" : "Create account"}
              </Button>
            </div>
          </form>

          {createdPassword ? (
            <div className="rounded-[calc(var(--radius)-0.125rem)] bg-surface-container-low p-4">
              <p className="text-sm font-semibold text-on-surface">Temporary password generated</p>
              <p className="mt-2 text-sm leading-6 text-on-surface/70">{createdPassword}</p>
            </div>
          ) : null}
        </CardContent>
      </Card>

      {isLoading ? (
        <DataTableSkeleton columns={6} rows={6} />
      ) : (
        <Card>
          <CardHeader>
            <CardTitle>User directory</CardTitle>
            <CardDescription>Search, filter, and act on active or inactive accounts.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-4 md:grid-cols-[1.3fr_0.8fr_0.8fr]">
              <div className="space-y-2">
                <Label htmlFor="search-users">Search</Label>
                <Input id="search-users" value={search} onChange={(event) => setSearch(event.target.value)} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="filter-role">Role</Label>
                <Select
                  id="filter-role"
                  value={role}
                  onChange={(event) => {
                    setRole(event.target.value);
                    setPage(1);
                  }}
                >
                  <option value="">All roles</option>
                  <option value="STUDENT">Student</option>
                  <option value="TEACHER">Teacher</option>
                  <option value="ACCOUNTANT">Accountant</option>
                  <option value="ADMIN">Admin</option>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="filter-status">Status</Label>
                <Select
                  id="filter-status"
                  value={status}
                  onChange={(event) => {
                    setStatus(event.target.value as "all" | "active" | "inactive");
                    setPage(1);
                  }}
                >
                  <option value="all">All users</option>
                  <option value="active">Active</option>
                  <option value="inactive">Inactive</option>
                </Select>
              </div>
            </div>

            <div className="overflow-hidden rounded-[calc(var(--radius)-0.125rem)] border border-outline-variant">
              <table className="w-full border-collapse text-left text-sm">
                <thead className="bg-surface-container-low">
                  <tr>
                    <th className="px-4 py-3 font-semibold text-on-surface/62">User</th>
                    <th className="px-4 py-3 font-semibold text-on-surface/62">Role</th>
                    <th className="px-4 py-3 font-semibold text-on-surface/62">Status</th>
                    <th className="px-4 py-3 font-semibold text-on-surface/62">Profile</th>
                    <th className="px-4 py-3 font-semibold text-on-surface/62">Created</th>
                    <th className="px-4 py-3 font-semibold text-on-surface/62">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {users.map((user) => {
                    const isOwnAccount = session?.user.id === user.id;

                    return (
                      <tr
                        key={user.id}
                        className={[
                          "border-t border-outline-variant transition-colors",
                          user.isActive ? "bg-surface-container-lowest" : "bg-surface-container-low text-on-surface/55"
                        ].join(" ")}
                      >
                        <td className="px-4 py-4">
                          <div>
                            <p className="font-semibold text-on-surface">{user.name}</p>
                            <p className="text-on-surface/62">{user.email}</p>
                          </div>
                        </td>
                        <td className="px-4 py-4">
                          <Badge tone={roleTone(user.role)}>{user.role}</Badge>
                        </td>
                        <td className="px-4 py-4">
                          <Badge tone={user.isActive ? "green" : "red"}>
                            {user.isActive ? "Active" : "Inactive"}
                          </Badge>
                        </td>
                        <td className="px-4 py-4">{user.profileCompleted ? "Completed" : "Pending"}</td>
                        <td className="px-4 py-4">{new Date(user.createdAt).toLocaleDateString()}</td>
                        <td className="px-4 py-4">
                          <div className="flex flex-wrap gap-2">
                            <Button asChild size="sm" variant="outline">
                              <Link to="/dashboard/admin/users/$id" params={{ id: user.id }}>
                                View
                              </Link>
                            </Button>
                            <span title={isOwnAccount ? "Cannot deactivate your own account" : undefined}>
                              <Button
                                size="sm"
                                type="button"
                                variant="ghost"
                                disabled={isOwnAccount}
                                onClick={() => void handleStatusToggle(user)}
                              >
                                {user.isActive ? "Deactivate" : "Activate"}
                              </Button>
                            </span>
                            {!isOwnAccount ? (
                              <Button size="sm" type="button" variant="ghost" onClick={() => void handleDelete(user)}>
                                Delete
                              </Button>
                            ) : null}
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            <div className="flex items-center justify-between">
              <p className="text-sm text-on-surface/62">Page {page} of {totalPages}</p>
              <div className="flex gap-2">
                <Button size="sm" type="button" variant="outline" disabled={page <= 1} onClick={() => setPage(page - 1)}>
                  Previous
                </Button>
                <Button
                  size="sm"
                  type="button"
                  variant="outline"
                  disabled={page >= totalPages}
                  onClick={() => setPage(page + 1)}
                >
                  Next
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
