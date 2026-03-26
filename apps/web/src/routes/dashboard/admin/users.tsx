import { Link, createFileRoute } from "@tanstack/react-router";
import type { JSX } from "react";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { createAdminUserSchema } from "@mma/shared";
import { cn } from "@/lib/utils";
import { RouteErrorView } from "@/components/common/route-error";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import { useAuthSession } from "@/hooks/use-auth-session";
import type { AdminUserListItem, CreateAdminUserInput } from "@/lib/api/admin";
import {
  createAdminUser,
  deleteAdminUser,
  listAdminUsers,
  updateAdminUserStatus
} from "@/lib/api/admin";
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

  if (isLoading) {
    return (
      <div className="space-y-8">
        <div className="bg-surface-container-lowest/80 backdrop-blur-3xl rounded-4xl p-8 border border-outline-variant/40 shadow-xl relative w-full overflow-hidden">
          <Skeleton className="h-8 w-48 mb-4 bg-surface-container-highest" />
          <Skeleton className="h-4 w-full max-w-sm bg-surface-container-highest mb-8" />
          <div className="grid gap-6 lg:grid-cols-4">
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="space-y-2">
                <Skeleton className="h-3 w-16 bg-surface-container-highest" />
                <Skeleton className="h-12 w-full bg-surface-container-highest rounded-2xl" />
              </div>
            ))}
          </div>
        </div>
        <div className="bg-surface-container-lowest/80 backdrop-blur-3xl rounded-4xl p-8 border border-outline-variant/40 shadow-xl relative overflow-hidden">
          <Skeleton className="h-8 w-48 mb-6 bg-surface-container-highest" />
          <div className="space-y-4">
            {Array.from({ length: 10 }).map((_, i) => (
              <Skeleton key={i} className="h-16 w-full bg-surface-container-highest rounded-2xl" />
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <div className="bg-surface-container-lowest/80 backdrop-blur-3xl rounded-4xl p-8 sm:p-10 border border-outline-variant/40 shadow-xl relative w-full overflow-hidden group">
        <div className="absolute -top-12 -right-12 w-48 h-48 bg-primary/5 rounded-full blur-2xl pointer-events-none transition-all duration-1000 group-hover:bg-primary/10 z-[-1]"></div>
        <div className="mb-8">
          <h3 className="font-headline text-3xl font-extrabold tracking-tight text-on-surface">
            Account management
          </h3>
          <p className="mt-2 text-sm text-on-surface-variant font-light max-w-2xl leading-relaxed">
            Create teacher and accountant accounts, control access, and inspect user state from one
            surface.
          </p>
        </div>

        <form
          className="grid gap-6 lg:grid-cols-[1.2fr_1.2fr_0.8fr_auto] items-start"
          onSubmit={onCreate}
        >
          <div className="space-y-3">
            <Label
              htmlFor="create-name"
              className="text-[0.65rem] font-bold uppercase tracking-widest text-on-surface/60 pl-1"
            >
              Name
            </Label>
            <Input
              id="create-name"
              className="h-12 rounded-2xl bg-surface-container-low/50 border-outline-variant/30 font-body"
              error={errors.name?.message}
              {...register("name")}
            />
          </div>
          <div className="space-y-3">
            <Label
              htmlFor="create-email"
              className="text-[0.65rem] font-bold uppercase tracking-widest text-on-surface/60 pl-1"
            >
              Email
            </Label>
            <Input
              id="create-email"
              type="email"
              className="h-12 rounded-2xl bg-surface-container-low/50 border-outline-variant/30 font-body"
              error={errors.email?.message}
              {...register("email")}
            />
          </div>
          <div className="space-y-3">
            <Label
              htmlFor="create-role"
              className="text-[0.65rem] font-bold uppercase tracking-widest text-on-surface/60 pl-1"
            >
              Role
            </Label>
            <Select
              id="create-role"
              className="h-12 rounded-2xl bg-surface-container-low/50 border-outline-variant/30 font-body"
              error={errors.role?.message}
              {...register("role")}
            >
              <option value="TEACHER">Teacher</option>
              <option value="ACCOUNTANT">Accountant</option>
            </Select>
          </div>
          <div className="lg:pt-[1.7rem] flex items-end">
            <Button
              className="h-12 rounded-2xl px-10 font-headline font-extrabold shadow-lg transition-all hover:scale-[1.02] active:scale-[0.98] w-full"
              type="submit"
              disabled={isSubmitting}
            >
              {isSubmitting ? <Skeleton className="h-4 w-16 bg-white/20" /> : "Create account"}
            </Button>
          </div>
        </form>

        {createdPassword ? (
          <div className="mt-6 rounded-3xl bg-secondary/5 border border-secondary/20 p-6 shadow-inner animate-in fade-in slide-in-from-top-4 duration-500">
            <p className="text-xs font-bold uppercase tracking-widest text-secondary mb-2">
              Temporary password generated
            </p>
            <p className="text-2xl font-mono font-bold text-on-surface tracking-wider">
              {createdPassword}
            </p>
            <p className="mt-2 text-xs text-on-surface/50 font-light italic">
              Please copy this immediately. It won&apos;t be shown again.
            </p>
          </div>
        ) : null}
      </div>

      <div className="bg-surface-container-lowest/80 backdrop-blur-3xl rounded-4xl border border-outline-variant/40 shadow-xl relative overflow-hidden">
        <div className="p-8 sm:p-10 border-b border-outline-variant/30 flex flex-col gap-6 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h4 className="font-headline text-2xl font-extrabold tracking-tight text-on-surface leading-none">
              User directory
            </h4>
            <p className="mt-2 text-sm text-on-surface-variant font-light">
              Search, filter, and act on active or inactive accounts.
            </p>
          </div>
          <div className="flex flex-col sm:flex-row gap-4 flex-1 max-w-3xl">
            <div className="flex-1">
              <Input
                id="search-users"
                placeholder="Search by name or email..."
                className="h-11 rounded-2xl bg-surface-container-low/30 border-outline-variant/20 font-body"
                value={search}
                onChange={(event) => setSearch(event.target.value)}
              />
            </div>
            <div className="w-full sm:w-40">
              <Select
                id="filter-role"
                className="h-11 rounded-2xl bg-surface-container-low/30 border-outline-variant/20 font-body"
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
            <div className="w-full sm:w-40">
              <Select
                id="filter-status"
                className="h-11 rounded-2xl bg-surface-container-low/30 border-outline-variant/20 font-body"
                value={status}
                onChange={(event) => {
                  setStatus(event.target.value as "all" | "active" | "inactive");
                  setPage(1);
                }}
              >
                <option value="all">All statuses</option>
                <option value="active">Active</option>
                <option value="inactive">Inactive</option>
              </Select>
            </div>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full border-collapse text-left">
            <thead>
              <tr className="bg-surface-container-low/30 border-b border-outline-variant/20">
                <th className="px-8 py-5 text-[0.7rem] font-bold uppercase tracking-widest text-on-surface/50">
                  User Details
                </th>
                <th className="px-8 py-5 text-[0.7rem] font-bold uppercase tracking-widest text-on-surface/50">
                  Role
                </th>
                <th className="px-8 py-5 text-[0.7rem] font-bold uppercase tracking-widest text-on-surface/50">
                  Status
                </th>
                <th className="px-8 py-5 text-[0.7rem] font-bold uppercase tracking-widest text-on-surface/50">
                  Profile
                </th>
                <th className="px-8 py-5 text-[0.7rem] font-bold uppercase tracking-widest text-on-surface/50">
                  Created
                </th>
                <th className="px-8 py-5 text-[0.7rem] font-bold uppercase tracking-widest text-on-surface/50 text-right">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody>
              {users.map((user) => {
                const isOwnAccount = session?.user.id === user.id;

                return (
                  <tr
                    key={user.id}
                    className={cn(
                      "group border-t border-outline-variant/10 transition-all duration-300 hover:bg-primary/2",
                      !user.isActive && "opacity-60 grayscale-[0.2]"
                    )}
                  >
                    <td className="px-8 py-6">
                      <div className="flex flex-col">
                        <span className="font-headline text-base font-extrabold text-on-surface tracking-tight group-hover:text-primary transition-colors">
                          {user.name}
                        </span>
                        <span className="text-xs text-on-surface-variant font-light mt-0.5">
                          {user.email}
                        </span>
                      </div>
                    </td>
                    <td className="px-8 py-6">
                      <Badge
                        tone={roleTone(user.role)}
                        className="rounded-full px-3 font-semibold text-[0.65rem]"
                      >
                        {user.role}
                      </Badge>
                    </td>
                    <td className="px-8 py-6">
                      <Badge
                        tone={user.isActive ? "green" : "red"}
                        className="rounded-full px-3 font-semibold text-[0.65rem]"
                      >
                        {user.isActive ? "Active" : "Inactive"}
                      </Badge>
                    </td>
                    <td className="px-8 py-6">
                      <span
                        className={cn(
                          "text-[0.65rem] font-bold uppercase tracking-widest",
                          user.profileCompleted
                            ? "text-green-600/70 dark:text-green-400/70"
                            : "text-amber-600/70 dark:text-amber-400/70"
                        )}
                      >
                        {user.profileCompleted ? "Completed" : "Pending"}
                      </span>
                    </td>
                    <td className="px-8 py-6">
                      <span className="text-xs text-on-surface/40 font-bold uppercase tracking-tighter">
                        {new Date(user.createdAt).toLocaleDateString("en-GB", {
                          day: "numeric",
                          month: "short",
                          year: "numeric"
                        })}
                      </span>
                    </td>
                    <td className="px-8 py-6">
                      <div className="flex items-center justify-end gap-2">
                        <Button
                          asChild
                          size="sm"
                          variant="outline"
                          className="h-9 rounded-xl border-outline-variant/30 hover:bg-surface-container-high transition-all"
                        >
                          <Link to="/dashboard/admin/users/$id" params={{ id: user.id }}>
                            View
                          </Link>
                        </Button>
                        <div className="relative group/actions">
                          <span
                            title={isOwnAccount ? "Cannot deactivate your own account" : undefined}
                          >
                            <Button
                              size="sm"
                              type="button"
                              variant="ghost"
                              disabled={isOwnAccount}
                              onClick={() => void handleStatusToggle(user)}
                              className="h-9 rounded-xl hover:bg-surface-container-high transition-all font-semibold text-xs"
                            >
                              {user.isActive ? "Deactivate" : "Activate"}
                            </Button>
                          </span>
                        </div>
                        {!isOwnAccount ? (
                          <Button
                            size="sm"
                            type="button"
                            variant="ghost"
                            onClick={() => void handleDelete(user)}
                            className="h-9 rounded-xl text-red-500 hover:bg-red-50 hover:text-red-600 transition-all font-semibold text-xs"
                          >
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

        <div className="p-8 border-t border-outline-variant/20 flex flex-col sm:flex-row items-center justify-between gap-6">
          <p className="text-xs font-bold uppercase tracking-widest text-on-surface/40">
            Page <span className="text-on-surface">{page}</span> of{" "}
            <span className="text-on-surface">{totalPages}</span>
          </p>
          <div className="flex gap-3">
            <Button
              size="sm"
              type="button"
              variant="outline"
              disabled={page <= 1}
              onClick={() => setPage(page - 1)}
              className="h-10 px-6 rounded-xl border-outline-variant/30 font-bold text-xs uppercase tracking-widest transition-all hover:scale-105 active:scale-95 disabled:opacity-30 disabled:hover:scale-100"
            >
              Previous
            </Button>
            <Button
              size="sm"
              type="button"
              variant="outline"
              disabled={page >= totalPages}
              onClick={() => setPage(page + 1)}
              className="h-10 px-6 rounded-xl border-outline-variant/30 font-bold text-xs uppercase tracking-widest transition-all hover:scale-105 active:scale-95 disabled:opacity-30 disabled:hover:scale-100"
            >
              Next
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
