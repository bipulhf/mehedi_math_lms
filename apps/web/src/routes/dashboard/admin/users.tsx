import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Link, createFileRoute } from "@tanstack/react-router";
import {
  Search,
  UserPlus,
  UserCheck,
  UserX,
  Eye,
  Calendar,
  Mail,
  Shield,
  Fingerprint,
  CheckCircle2,
  AlertCircle
} from "lucide-react";
import type { JSX } from "react";
import { useState } from "react";
import { toast } from "sonner";
import { createAdminUserSchema } from "@genex/shared";

import { cn } from "@/lib/utils";
import { RouteErrorView } from "@/components/common/route-error";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { Skeleton } from "@/components/ui/skeleton";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import { useAuthSession } from "@/hooks/use-auth-session";
import type { AdminUserListItem, CreateAdminUserInput } from "@/lib/api/admin";
import {
  createAdminUser,
  listAdminUsers,
  updateAdminUserStatus
} from "@/lib/api/admin";
import { useZodForm } from "@/lib/forms/use-zod-form";
import { queryKeys } from "@/lib/query/keys";
import { useT } from "@/lib/i18n/locale-context";

export const Route = createFileRoute("/dashboard/admin/users")({
  component: AdminUsersPage,
  errorComponent: RouteErrorView
} as never);

function roleTone(role: AdminUserListItem["role"]): "neutral" | "quiet" | "neutral" | "neutral" {
  if (role === "ADMIN") return "neutral";
  if (role === "TEACHER") return "neutral";
  if (role === "ACCOUNTANT") return "quiet";
  return "neutral";
}

function AdminUsersPage(): JSX.Element {
  const t = useT();

  const { session } = useAuthSession();
  const queryClient = useQueryClient();
  const [search, setSearch] = useState("");
  const [role, setRole] = useState("");
  const [status, setStatus] = useState<"all" | "active" | "inactive">("all");
  const [page, setPage] = useState(1);
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

  const userFilters = { limit: 10, page, role, search, status };
  const { data: userPage, isPending: isLoading } = useQuery({
    queryFn: async () =>
      listAdminUsers({
        limit: 10,
        page,
        role: role ? (role as AdminUserListItem["role"]) : undefined,
        search,
        status
      }),
    queryKey: queryKeys.admin.users(userFilters)
  });
  const users: readonly AdminUserListItem[] = userPage?.data ?? [];
  const totalPages = userPage?.pagination.pages ?? 1;

  const loadUsers = async (): Promise<void> => {
    await queryClient.invalidateQueries({ queryKey: queryKeys.admin.users(userFilters) });
  };

  const onCreate = handleSubmit(async (values) => {
    setIsSubmitting(true);
    try {
      const createdUser = await createAdminUser(values);
      setCreatedPassword(createdUser.temporaryPassword);
      reset();
      toast.success(t("admin.users.created"));
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

  if (isLoading) {
    return (
      <div className="space-y-8 p-4 sm:p-0">
        <div className="bg-card/80 p-8 border border-hairline/40 w-full overflow-hidden">
          <Skeleton className="h-8 w-48 mb-8 bg-chip-active" />
          <div className="grid gap-6 sm:grid-cols-4">
            {Array.from({ length: 4 }).map((_, i) => (
              <Skeleton key={i} className="h-12 w-full bg-chip-active" />
            ))}
          </div>
        </div>
        <div className="bg-card/80 p-4 border border-hairline/40 overflow-hidden">
          <div className="space-y-4">
            {Array.from({ length: 5 }).map((_, i) => (
              <Skeleton key={i} className="h-20 w-full bg-chip-active" />
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-8 p-4 sm:p-0">
      {/* Creation Surface */}
      <div className="bg-card/80 p-8 border border-hairline/40 relative w-full overflow-hidden group">

        <div className="mb-8 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-3 mb-2">
              <div className="size-8 rounded-lg bg-ink/10 flex items-center justify-center text-ink">
                <UserPlus className="size-5" />
              </div>
              <h3 className="font-body text-2xl font-medium tracking-tight text-ink">{t("admin.users.staffTitle")}</h3>
            </div>
            <p className="text-sm text-muted font-light max-w-xl leading-relaxed">
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
              className="text-[0.65rem] font-bold uppercase tracking-widest text-ink/40 ml-1"
            >{t("admin.users.fullName")}</Label>
            <Input
              id="create-name"
              placeholder="e.g. John Doe"
              className="h-12 bg-panel-warm/50 border-hairline/30 px-4"
              error={errors.name?.message}
              {...register("name")}
            />
          </div>
          <div className="space-y-2">
            <Label
              htmlFor="create-email"
              className="text-[0.65rem] font-bold uppercase tracking-widest text-ink/40 ml-1"
            >{t("admin.users.email")}</Label>
            <Input
              id="create-email"
              type="email"
              placeholder="john@example.com"
              className="h-12 bg-panel-warm/50 border-hairline/30 px-4"
              error={errors.email?.message}
              {...register("email")}
            />
          </div>
          <div className="space-y-2">
            <Label
              htmlFor="create-role"
              className="text-[0.65rem] font-bold uppercase tracking-widest text-ink/40 ml-1"
            >{t("admin.users.role")}</Label>
            <Select
              id="create-role"
              className="h-12 bg-panel-warm/50 border-hairline/30"
              error={errors.role?.message}
              {...register("role")}
            >
              <option value="TEACHER">{t("role.teacherOption")}</option>
              <option value="ACCOUNTANT">{t("role.accountantOption")}</option>
            </Select>
          </div>
          <div className="lg:pt-[1.7rem]">
            <Button
              className="h-12 px-8 font-body font-medium transition-all w-full lg:w-fit"
              type="submit"
              disabled={isSubmitting}
            >
              {isSubmitting ? "Authorizing" : "Authorize Staff"}
            </Button>
          </div>
        </form>

        {createdPassword && (
          <div className="mt-8 bg-accent/5 border border-accent/20 p-6 flex flex-col sm:flex-row items-center justify-between gap-6">
            <div className="space-y-1 text-center sm:text-left">
              <p className="text-[0.6rem] font-bold uppercase tracking-[0.2em] text-accent">{t("admin.users.secretTitle")}</p>
              <p className="font-mono text-3xl font-bold text-ink tracking-widest">
                {createdPassword}
              </p>
            </div>
            <div className="px-5 py-3 bg-accent/10 text-accent text-xs italic font-medium max-w-xs text-center">{t("admin.users.secretLead")}</div>
          </div>
        )}
      </div>

      {/* List Surface */}
      <div className="bg-card/80 border border-hairline/40 overflow-hidden">
        <div className="p-8 border-b border-hairline/30">
          <div className="flex flex-col xl:flex-row xl:items-center justify-between gap-8 mb-8">
            <div>
              <h4 className="font-body text-2xl font-medium tracking-tight text-ink leading-none mb-2">{t("admin.users.title")}</h4>
              <p className="text-sm text-muted font-light">{t("admin.users.lead")}</p>
            </div>

            <div className="flex flex-col sm:flex-row gap-3 flex-1 max-w-4xl">
              <div className="relative flex-1 group">
                <Search className="absolute left-4 top-1/2 -translate-y-1/2 size-4 text-ink/30 group-focus-within:text-ink transition-colors" />
                <Input
                  placeholder={t("admin.users.search")}
                  className="h-12 pl-11 bg-panel-warm/30 border-hairline/20 font-body transition-all focus:bg-panel-warm"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                />
              </div>
              <div className="flex gap-2">
                <Select
                  className="h-12 bg-panel-warm/30 border-hairline/20 min-w-32 sm:min-w-40"
                  value={role}
                  onChange={(e) => {
                    setRole(e.target.value);
                    setPage(1);
                  }}
                >
                  <option value="">{t("admin.users.allRoles")}</option>
                  <option value="STUDENT">{t("role.student")}</option>
                  <option value="TEACHER">{t("role.teacherOption")}</option>
                  <option value="ACCOUNTANT">{t("role.accountantOption")}</option>
                  <option value="ADMIN">{t("role.adminOption")}</option>
                </Select>
                <Select
                  className="h-12 bg-panel-warm/30 border-hairline/20 min-w-32 sm:min-w-40"
                  value={status}
                  onChange={(e) => {
                    setStatus(e.target.value as "all" | "active" | "inactive");
                    setPage(1);
                  }}
                >
                  <option value="all">{t("admin.users.anyStatus")}</option>
                  <option value="active">{t("admin.users.active")}</option>
                  <option value="inactive">{t("admin.users.suspended")}</option>
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
                  "p-5 rounded-3xl border border-hairline/30 flex flex-col gap-5 transition-all",
                  user.isActive
                    ? "bg-panel-warm/20"
                    : "bg-neutral-500/5 opacity-60 grayscale-[0.3]"
                )}
              >
                <div className="flex justify-between items-start">
                  <div className="flex flex-col">
                    <span className="font-body text-lg font-medium text-ink leading-tight">
                      {user.name}
                    </span>
                    <span className="text-xs text-muted/70 font-medium flex items-center gap-1.5 mt-1">
                      <Mail className="size-3" /> {user.email}
                    </span>
                  </div>
                  <Badge tone={roleTone(user.role)} className="px-2.5 py-1">
                    {user.role}
                  </Badge>
                </div>

                <div className="grid grid-cols-2 gap-4 py-4 border-y border-hairline/10">
                  <div className="flex flex-col gap-1">
                    <span className="text-[0.6rem] uppercase tracking-widest text-ink/40 font-bold">{t("admin.users.profile")}</span>
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
                    <span className="text-[0.6rem] uppercase tracking-widest text-ink/40 font-bold">{t("admin.users.memberSince")}</span>
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
                    className="flex-1 h-10 font-bold uppercase tracking-widest text-[0.65rem] border-hairline/40"
                  >
                    <Link to="/dashboard/admin/users/$id" params={{ id: user.id }}>{t("admin.users.manageProfile")}</Link>
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
          {users.length === 0 ? (
            <div className="p-8">
              <EmptyState message={t("admin.users.empty")} />
            </div>
          ) : (
            <div className="hidden xl:block overflow-x-auto">
              <table className="w-full border-collapse text-left">
              <thead>
                <tr className="bg-panel-warm/10 border-b border-hairline/20">
                  <th className="px-10 py-6 text-[0.65rem] font-bold uppercase tracking-[0.2em] text-ink/30">{t("admin.users.identity")}</th>
                  <th className="px-10 py-6 text-[0.65rem] font-bold uppercase tracking-[0.2em] text-ink/30">{t("admin.users.roleColumn")}</th>
                  <th className="px-10 py-6 text-[0.65rem] font-bold uppercase tracking-[0.2em] text-ink/30">{t("admin.users.statusColumn")}</th>
                  <th className="px-10 py-6 text-[0.65rem] font-bold uppercase tracking-[0.2em] text-ink/30">{t("admin.users.profileComplete")}</th>
                  <th className="px-10 py-6 text-[0.65rem] font-bold uppercase tracking-[0.2em] text-ink/30">{t("admin.users.onboarding")}</th>
                  <th className="px-10 py-6 text-[0.65rem] font-bold uppercase tracking-[0.2em] text-ink/30 text-right">{t("admin.users.actions")}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-hairline/10">
                {users.map((user) => {
                  const isOwn = session?.user.id === user.id;
                  return (
                    <tr
                      key={user.id}
                      className={cn(
                        "group transition-all duration-300 hover:bg-ink/[0.03]",
                        !user.isActive && "opacity-60 grayscale-[0.1]"
                      )}
                    >
                      <td className="px-10 py-6">
                        <div className="flex items-center gap-4">
                          <div className="size-10 rounded-full bg-panel-warm border border-hairline/20 flex items-center justify-center font-body font-bold text-ink">
                            {user.name.charAt(0)}
                          </div>
                          <div className="flex flex-col">
                            <span className="font-body text-base font-medium text-ink tracking-tight group-hover:text-ink transition-colors">
                              {user.name}
                            </span>
                            <div className="flex items-center gap-1.5 text-xs text-ink/40 font-medium">
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
                          {/* One icon colour. The role already reads in the
                              badge beside it, and DESIGN.md §2 has no second
                              saturated colour to spend here. */}
                          <Shield className="size-4 text-muted-light" />
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
                        <div className="flex items-center gap-2 text-ink/40">
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
                            className="size-9 hover:bg-ink/10 hover:text-ink transition-all"
                          >
                            <Link
                              to="/dashboard/admin/users/$id"
                              params={{ id: user.id }}
                              title={t("admin.users.view")}
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
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
        </div>

        {/* Improved Pagination */}
        <div className="p-8 border-t border-hairline/20 flex flex-col sm:flex-row items-center justify-between gap-6 bg-panel-warm/5">
          <div className="flex items-center gap-3">
            <p className="text-[0.65rem] font-bold uppercase tracking-[0.2em] text-ink/40">
              Page Registry:{" "}
              <span className="text-ink px-2 py-1 rounded-md bg-panel-warm font-mono text-xs">
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
              className="h-11 px-8 border-hairline/30 font-medium text-[0.6rem] uppercase tracking-widest bg-card transition-all hover:translate-x-[-2px] disabled:opacity-30 disabled:hover:translate-x-0"
            >{t("common.back")}</Button>
            <Button
              size="sm"
              variant="outline"
              disabled={page >= totalPages}
              onClick={() => setPage(page + 1)}
              className="h-11 px-8 border-hairline/30 font-medium text-[0.6rem] uppercase tracking-widest bg-card transition-all hover:translate-x-[2px] disabled:opacity-30 disabled:hover:translate-x-0"
            >{t("common.next")}</Button>
          </div>
        </div>
      </div>
    </div>
  );
}
