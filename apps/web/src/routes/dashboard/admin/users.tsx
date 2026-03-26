import { Link, createFileRoute } from "@tanstack/react-router";
import {
  Search,
  UserPlus,
  Trash2,
  UserCheck,
  UserX,
  Eye,
  Calendar,
  Mail,
  Shield,
  Fingerprint,
  Loader2,
  CheckCircle2,
  AlertCircle
} from "lucide-react";
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
  if (role === "ADMIN") return "violet";
  if (role === "TEACHER") return "blue";
  if (role === "ACCOUNTANT") return "gray";
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
    defaultValues: { email: "", name: "", role: "TEACHER" },
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
    if (
      !window.confirm(
        `Are you sure you want to ${nextStatus ? "activate" : "deactivate"} ${user.name}?`
      )
    )
      return;
    await updateAdminUserStatus(user.id, { isActive: nextStatus });
    toast.success(`User ${nextStatus ? "activated" : "deactivated"}`);
    await loadUsers();
  };

  const handleDelete = async (user: AdminUserListItem): Promise<void> => {
    if (!window.confirm(`Soft delete ${user.name}? This will disable access.`)) return;
    await deleteAdminUser(user.id);
    toast.success("User deleted");
    await loadUsers();
  };

  if (isLoading) {
    return (
      <div className="space-y-8 p-4 sm:p-0">
        <div className="bg-surface-container-lowest/80 backdrop-blur-3xl rounded-4xl p-8 border border-outline-variant/40 shadow-xl w-full overflow-hidden">
          <Skeleton className="h-8 w-48 mb-8 bg-surface-container-highest" />
          <div className="grid gap-6 sm:grid-cols-4">
            {Array.from({ length: 4 }).map((_, i) => (
              <Skeleton key={i} className="h-12 w-full bg-surface-container-highest rounded-2xl" />
            ))}
          </div>
        </div>
        <div className="bg-surface-container-lowest/80 backdrop-blur-3xl rounded-4xl p-4 border border-outline-variant/40 shadow-xl overflow-hidden">
          <div className="space-y-4">
            {Array.from({ length: 5 }).map((_, i) => (
              <Skeleton key={i} className="h-20 w-full bg-surface-container-highest rounded-2xl" />
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-8 animate-in fade-in duration-700 p-4 sm:p-0">
      {/* Creation Surface */}
      <div className="bg-surface-container-lowest/80 backdrop-blur-3xl rounded-4xl p-8 border border-outline-variant/40 shadow-xl relative w-full overflow-hidden group">
        <div className="absolute -top-12 -right-12 w-48 h-48 bg-primary/5 rounded-full blur-2xl pointer-events-none group-hover:bg-primary/10 transition-all duration-1000 z-[-1]" />

        <div className="mb-8 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-3 mb-2">
              <div className="size-8 rounded-lg bg-primary/10 flex items-center justify-center text-primary">
                <UserPlus className="size-5" />
              </div>
              <h3 className="font-headline text-2xl font-extrabold tracking-tight text-on-surface">
                Staff Access Control
              </h3>
            </div>
            <p className="text-sm text-on-surface-variant font-light max-w-xl leading-relaxed">
              Onboard new academic or operational staff. Temporary credentials will be generated
              securely.
            </p>
          </div>
        </div>

        <form
          className="grid gap-6 lg:grid-cols-[1.2fr_1.2fr_1fr_auto] items-start"
          onSubmit={onCreate}
        >
          <div className="space-y-2">
            <Label
              htmlFor="create-name"
              className="text-[0.65rem] font-bold uppercase tracking-widest text-on-surface/40 ml-1"
            >
              Full Name
            </Label>
            <Input
              id="create-name"
              placeholder="e.g. John Doe"
              className="h-12 rounded-2xl bg-surface-container-low/50 border-outline-variant/30 px-4"
              error={errors.name?.message}
              {...register("name")}
            />
          </div>
          <div className="space-y-2">
            <Label
              htmlFor="create-email"
              className="text-[0.65rem] font-bold uppercase tracking-widest text-on-surface/40 ml-1"
            >
              Email Address
            </Label>
            <Input
              id="create-email"
              type="email"
              placeholder="john@example.com"
              className="h-12 rounded-2xl bg-surface-container-low/50 border-outline-variant/30 px-4"
              error={errors.email?.message}
              {...register("email")}
            />
          </div>
          <div className="space-y-2">
            <Label
              htmlFor="create-role"
              className="text-[0.65rem] font-bold uppercase tracking-widest text-on-surface/40 ml-1"
            >
              Assigned Role
            </Label>
            <Select
              id="create-role"
              className="h-12 rounded-2xl bg-surface-container-low/50 border-outline-variant/30"
              error={errors.role?.message}
              {...register("role")}
            >
              <option value="TEACHER">Instructor/Teacher</option>
              <option value="ACCOUNTANT">Financial/Accountant</option>
            </Select>
          </div>
          <div className="lg:pt-[1.7rem]">
            <Button
              className="h-12 rounded-2xl px-8 font-headline font-extrabold shadow-lg transition-all hover:scale-[1.02] active:scale-[0.98] w-full lg:w-fit"
              type="submit"
              disabled={isSubmitting}
            >
              {isSubmitting ? (
                <Loader2 className="size-5 animate-spin mx-auto" />
              ) : (
                "Authorize Staff"
              )}
            </Button>
          </div>
        </form>

        {createdPassword && (
          <div className="mt-8 rounded-3xl bg-secondary/5 border border-secondary/20 p-6 animate-in slide-in-from-top-4 duration-500 flex flex-col sm:flex-row items-center justify-between gap-6">
            <div className="space-y-1 text-center sm:text-left">
              <p className="text-[0.6rem] font-bold uppercase tracking-[0.2em] text-secondary">
                Sensitive Credential Generated
              </p>
              <p className="font-mono text-3xl font-bold text-on-surface tracking-widest">
                {createdPassword}
              </p>
            </div>
            <div className="px-5 py-3 rounded-2xl bg-secondary/10 text-secondary text-xs italic font-medium max-w-xs text-center">
              Copy now. This key is transient and encrypted for security.
            </div>
          </div>
        )}
      </div>

      {/* List Surface */}
      <div className="bg-surface-container-lowest/80 backdrop-blur-3xl rounded-4xl border border-outline-variant/40 shadow-xl overflow-hidden">
        <div className="p-8 border-b border-outline-variant/30">
          <div className="flex flex-col xl:flex-row xl:items-center justify-between gap-8 mb-8">
            <div>
              <h4 className="font-headline text-2xl font-extrabold tracking-tight text-on-surface leading-none mb-2">
                User Registry
              </h4>
              <p className="text-sm text-on-surface-variant font-light">
                Global directory for all platform participants.
              </p>
            </div>

            <div className="flex flex-col sm:flex-row gap-3 flex-1 max-w-4xl">
              <div className="relative flex-1 group">
                <Search className="absolute left-4 top-1/2 -translate-y-1/2 size-4 text-on-surface/30 group-focus-within:text-primary transition-colors" />
                <Input
                  placeholder="Search identity..."
                  className="h-12 pl-11 rounded-2xl bg-surface-container-low/30 border-outline-variant/20 font-body transition-all focus:bg-surface-container-low"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                />
              </div>
              <div className="flex gap-2">
                <Select
                  className="h-12 rounded-2xl bg-surface-container-low/30 border-outline-variant/20 min-w-32 sm:min-w-40"
                  value={role}
                  onChange={(e) => {
                    setRole(e.target.value);
                    setPage(1);
                  }}
                >
                  <option value="">All Roles</option>
                  <option value="STUDENT">Student</option>
                  <option value="TEACHER">Instructor</option>
                  <option value="ACCOUNTANT">Accountant</option>
                  <option value="ADMIN">Administrator</option>
                </Select>
                <Select
                  className="h-12 rounded-2xl bg-surface-container-low/30 border-outline-variant/20 min-w-32 sm:min-w-40"
                  value={status}
                  onChange={(e) => {
                    setStatus(e.target.value as "all" | "active" | "inactive");
                    setPage(1);
                  }}
                >
                  <option value="all">Any Status</option>
                  <option value="active">Operational</option>
                  <option value="inactive">Suspended</option>
                </Select>
              </div>
            </div>
          </div>

          {/* Mobile List View - Cards */}
          <div className="xl:hidden grid gap-4 grid-cols-1 md:grid-cols-2">
            {users.map((user) => (
              <div
                key={user.id}
                className={cn(
                  "p-5 rounded-3xl border border-outline-variant/30 flex flex-col gap-5 transition-all",
                  user.isActive
                    ? "bg-surface-container-low/20"
                    : "bg-neutral-500/5 opacity-60 grayscale-[0.3]"
                )}
              >
                <div className="flex justify-between items-start">
                  <div className="flex flex-col">
                    <span className="font-headline text-lg font-extrabold text-on-surface leading-tight">
                      {user.name}
                    </span>
                    <span className="text-xs text-on-surface-variant/70 font-medium flex items-center gap-1.5 mt-1">
                      <Mail className="size-3" /> {user.email}
                    </span>
                  </div>
                  <Badge tone={roleTone(user.role)} className="rounded-xl px-2.5 py-1">
                    {user.role}
                  </Badge>
                </div>

                <div className="grid grid-cols-2 gap-4 py-4 border-y border-outline-variant/10">
                  <div className="flex flex-col gap-1">
                    <span className="text-[0.6rem] uppercase tracking-widest text-on-surface/40 font-bold">
                      Profile Info
                    </span>
                    <div className="flex items-center gap-1.5">
                      {user.profileCompleted ? (
                        <CheckCircle2 className="size-3 text-green-500" />
                      ) : (
                        <AlertCircle className="size-3 text-amber-500" />
                      )}
                      <span className="text-xs font-semibold">
                        {user.profileCompleted ? "Complete" : "Ongoing"}
                      </span>
                    </div>
                  </div>
                  <div className="flex flex-col gap-1">
                    <span className="text-[0.6rem] uppercase tracking-widest text-on-surface/40 font-bold">
                      Member Since
                    </span>
                    <span className="text-xs font-semibold">
                      {new Date(user.createdAt).toLocaleDateString()}
                    </span>
                  </div>
                </div>

                <div className="flex gap-2 pt-1">
                  <Button
                    asChild
                    size="sm"
                    variant="outline"
                    className="flex-1 h-10 rounded-xl font-bold uppercase tracking-widest text-[0.65rem] border-outline-variant/40"
                  >
                    <Link to="/dashboard/admin/users/$id" params={{ id: user.id }}>
                      Manage Profile
                    </Link>
                  </Button>
                  <Button
                    size="sm"
                    variant="ghost"
                    disabled={session?.user.id === user.id}
                    onClick={() => handleStatusToggle(user)}
                    className={cn(
                      "h-10 px-4 rounded-xl font-bold uppercase tracking-widest text-[0.65rem] transition-all",
                      user.isActive
                        ? "text-red-500/80 hover:bg-red-50"
                        : "text-green-500/80 hover:bg-green-50"
                    )}
                  >
                    {user.isActive ? (
                      <UserX className="size-4" />
                    ) : (
                      <UserCheck className="size-4" />
                    )}
                  </Button>
                </div>
              </div>
            ))}
          </div>

          {/* Desktop Table View */}
          <div className="hidden xl:block overflow-x-auto">
            <table className="w-full border-collapse text-left">
              <thead>
                <tr className="bg-surface-container-low/10 border-b border-outline-variant/20">
                  <th className="px-10 py-6 text-[0.65rem] font-bold uppercase tracking-[0.2em] text-on-surface/30">
                    User Identity
                  </th>
                  <th className="px-10 py-6 text-[0.65rem] font-bold uppercase tracking-[0.2em] text-on-surface/30">
                    Role & Rank
                  </th>
                  <th className="px-10 py-6 text-[0.65rem] font-bold uppercase tracking-[0.2em] text-on-surface/30">
                    System Status
                  </th>
                  <th className="px-10 py-6 text-[0.65rem] font-bold uppercase tracking-[0.2em] text-on-surface/30">
                    Data Integrity
                  </th>
                  <th className="px-10 py-6 text-[0.65rem] font-bold uppercase tracking-[0.2em] text-on-surface/30">
                    Onboarding
                  </th>
                  <th className="px-10 py-6 text-[0.65rem] font-bold uppercase tracking-[0.2em] text-on-surface/30 text-right">
                    Operations
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-outline-variant/10">
                {users.map((user) => {
                  const isOwn = session?.user.id === user.id;
                  return (
                    <tr
                      key={user.id}
                      className={cn(
                        "group transition-all duration-300 hover:bg-primary/[0.03]",
                        !user.isActive && "opacity-60 grayscale-[0.1]"
                      )}
                    >
                      <td className="px-10 py-6">
                        <div className="flex items-center gap-4">
                          <div className="size-10 rounded-full bg-surface-container-low border border-outline-variant/20 flex items-center justify-center font-headline font-bold text-primary group-hover:scale-110 transition-transform">
                            {user.name.charAt(0)}
                          </div>
                          <div className="flex flex-col">
                            <span className="font-headline text-base font-extrabold text-on-surface tracking-tight group-hover:text-primary transition-colors">
                              {user.name}
                            </span>
                            <div className="flex items-center gap-1.5 text-xs text-on-surface/40 font-medium">
                              <Mail className="size-3" /> {user.email}
                              <span className="mx-1 opacity-30">•</span>
                              <Fingerprint className="size-3" />{" "}
                              <code className="text-[0.6rem] tracking-tighter opacity-60 group-hover:opacity-100 transition-opacity">
                                {user.id.slice(-8)}
                              </code>
                            </div>
                          </div>
                        </div>
                      </td>
                      <td className="px-10 py-6">
                        <div className="flex items-center gap-2.5">
                          <Shield
                            className={cn(
                              "size-4 opacity-40",
                              roleTone(user.role) === "violet"
                                ? "text-violet-500"
                                : "text-on-surface"
                            )}
                          />
                          <Badge
                            tone={roleTone(user.role)}
                            className="rounded-full px-3 py-1 font-bold text-[0.6rem] uppercase tracking-widest"
                          >
                            {user.role}
                          </Badge>
                        </div>
                      </td>
                      <td className="px-10 py-6">
                        <div className="flex items-center gap-2 p-1.5 pl-0 pr-4 rounded-full w-fit">
                          <div
                            className={cn(
                              "size-2 rounded-full",
                              user.isActive
                                ? "bg-green-500 shadow-[0_0_8px_rgba(34,197,94,0.4)]"
                                : "bg-red-500"
                            )}
                          />
                          <span
                            className={cn(
                              "text-xs font-bold uppercase tracking-wider",
                              user.isActive ? "text-green-600/80" : "text-red-500/80"
                            )}
                          >
                            {user.isActive ? "Operational" : "Suspended"}
                          </span>
                        </div>
                      </td>
                      <td className="px-10 py-6">
                        <div
                          className={cn(
                            "flex items-center gap-2 px-3 py-1.5 rounded-2xl text-[0.65rem] font-bold uppercase tracking-wider w-fit",
                            user.profileCompleted
                              ? "bg-green-500/10 text-green-600"
                              : "bg-amber-500/10 text-amber-600"
                          )}
                        >
                          {user.profileCompleted ? (
                            <CheckCircle2 className="size-3.5" />
                          ) : (
                            <AlertCircle className="size-3.5" />
                          )}
                          {user.profileCompleted ? "Full" : "Partial"}
                        </div>
                      </td>
                      <td className="px-10 py-6">
                        <div className="flex items-center gap-2 text-on-surface/40">
                          <Calendar className="size-3.5 opacity-50" />
                          <span className="text-[0.7rem] font-bold uppercase tracking-tighter">
                            {new Date(user.createdAt).toLocaleDateString("en-GB", {
                              day: "numeric",
                              month: "short",
                              year: "numeric"
                            })}
                          </span>
                        </div>
                      </td>
                      <td className="px-10 py-6 text-right">
                        <div className="flex items-center justify-end gap-2 pr-2">
                          <Button
                            asChild
                            size="sm"
                            variant="ghost"
                            className="size-9 rounded-xl hover:bg-primary/10 hover:text-primary transition-all shadow-sm"
                          >
                            <Link
                              to="/dashboard/admin/users/$id"
                              params={{ id: user.id }}
                              title="View Identity"
                            >
                              <Eye className="size-4" />
                            </Link>
                          </Button>
                          <Button
                            size="sm"
                            variant="ghost"
                            disabled={isOwn}
                            onClick={() => void handleStatusToggle(user)}
                            className={cn(
                              "size-9 rounded-xl transition-all shadow-sm",
                              user.isActive
                                ? "hover:bg-red-50 hover:text-red-500"
                                : "hover:bg-green-50 hover:text-green-500"
                            )}
                            title={user.isActive ? "Suspend Access" : "Restore Access"}
                          >
                            {user.isActive ? (
                              <UserX className="size-4" />
                            ) : (
                              <UserCheck className="size-4" />
                            )}
                          </Button>
                          {!isOwn && (
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() => void handleDelete(user)}
                              className="size-9 rounded-xl text-red-500/40 hover:text-red-500 hover:bg-red-50 transition-all font-semibold"
                              title="Archive Record"
                            >
                              <Trash2 className="size-4" />
                            </Button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>

        {/* Improved Pagination */}
        <div className="p-8 border-t border-outline-variant/20 flex flex-col sm:flex-row items-center justify-between gap-6 bg-surface-container-low/5">
          <div className="flex items-center gap-3">
            <p className="text-[0.65rem] font-bold uppercase tracking-[0.2em] text-on-surface/40">
              Page Registry:{" "}
              <span className="text-on-surface px-2 py-1 rounded-md bg-surface-container-low font-mono text-xs">
                {page} / {totalPages}
              </span>
            </p>
          </div>
          <div className="flex gap-4">
            <Button
              size="sm"
              variant="outline"
              disabled={page <= 1}
              onClick={() => setPage(page - 1)}
              className="h-11 px-8 rounded-2xl border-outline-variant/30 font-extrabold text-[0.6rem] uppercase tracking-widest bg-surface-container-lowest transition-all hover:translate-x-[-2px] active:scale-95 disabled:opacity-30 disabled:hover:translate-x-0"
            >
              Back
            </Button>
            <Button
              size="sm"
              variant="outline"
              disabled={page >= totalPages}
              onClick={() => setPage(page + 1)}
              className="h-11 px-8 rounded-2xl border-outline-variant/30 font-extrabold text-[0.6rem] uppercase tracking-widest bg-surface-container-lowest transition-all hover:translate-x-[2px] active:scale-95 disabled:opacity-30 disabled:hover:translate-x-0"
            >
              Next
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
