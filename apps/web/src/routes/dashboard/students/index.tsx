import { useQuery } from "@tanstack/react-query";
import { Link, createFileRoute, useRouter } from "@tanstack/react-router";
import {
  Search,
  Users,
  Mail,
  Calendar,
  Eye,
  CheckCircle2,
  AlertCircle,
  Fingerprint
} from "lucide-react";
import type { JSX, KeyboardEvent, MouseEvent } from "react";
import { useState } from "react";

import { cn } from "@/lib/utils";
import { RouteErrorView } from "@/components/common/route-error";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { Skeleton } from "@/components/ui/skeleton";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import type { AdminUserListItem } from "@/lib/api/admin";
import { listAdminUsers } from "@/lib/api/admin";
import { queryKeys } from "@/lib/query/keys";
import { seo } from "@/lib/seo";
import { useT } from "@/lib/i18n/locale-context";

export const Route = createFileRoute("/dashboard/students/")({
  head: () =>
    seo({
      description: "Every enrolled student, searchable by name and status.",
      path: "/dashboard/students",
      title: "Students"
    }),
  component: StudentsDirectoryPage,
  errorComponent: RouteErrorView
} as never);

function StudentsDirectoryPage(): JSX.Element {
  const t = useT();
  const router = useRouter();

  const [search, setSearch] = useState("");
  const [status, setStatus] = useState<"all" | "active" | "inactive">("all");

  const openStudent = (studentId: string): void => {
    void router.navigate({ params: { id: studentId }, to: "/dashboard/students/$id" });
  };

  const activateStudentRow = (studentId: string, event: MouseEvent<HTMLElement>): void => {
    if ((event.target as HTMLElement).closest("a,button,input,select,textarea")) {
      return;
    }

    openStudent(studentId);
  };

  const activateStudentWithKeyboard = (
    studentId: string,
    event: KeyboardEvent<HTMLElement>
  ): void => {
    if (event.key !== "Enter" && event.key !== " ") {
      return;
    }

    event.preventDefault();
    openStudent(studentId);
  };
  const [page, setPage] = useState(1);

  const filters = { limit: 10, page, role: "STUDENT" as const, search, status };
  const { data: userPage, isPending: isLoading } = useQuery({
    queryFn: async () =>
      listAdminUsers({
        limit: 10,
        page,
        role: "STUDENT",
        search,
        status
      }),
    queryKey: queryKeys.admin.users(filters)
  });

  const students: readonly AdminUserListItem[] = userPage?.data ?? [];
  const totalPages = userPage?.pagination.pages ?? 1;

  if (isLoading) {
    return (
      <div className="space-y-8 p-4 sm:p-0">
        <div className="bg-card/80 p-4 sm:p-6 lg:p-8 border border-hairline/40 w-full overflow-hidden">
          <Skeleton className="h-8 w-48 mb-8 bg-chip-active" />
          <div className="grid gap-6 sm:grid-cols-3">
            {Array.from({ length: 3 }).map((_, i) => (
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
    <div className="space-y-6">
      {/* Search Header */}
      <div className="border border-hairline bg-card p-6">
        <div className="mb-6 flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
          <div>
            <div className="mb-1 flex items-center gap-2.5">
              <div className="flex size-7 items-center justify-center bg-panel-warm text-ink">
                <Users className="size-4" />
              </div>
              <h1 className="text-xl font-medium text-ink">Student Directory</h1>
            </div>
            <p className="max-w-xl text-sm font-light text-muted">
              Browse enrolled students, inspect individual learning progress, and review contact information.
            </p>
          </div>
        </div>

        <div className="flex flex-col gap-3 sm:flex-row">
          <div className="relative flex-1">
            <Search className="absolute left-3.5 top-1/2 size-4 -translate-y-1/2 text-muted-faint" />
            <Input
              className="pl-10"
              onChange={(e) => {
                setSearch(e.target.value);
                setPage(1);
              }}
              placeholder="Search by student name or email..."
              value={search}
            />
          </div>
          <Select
            className="min-w-40"
            onChange={(e) => {
              setStatus(e.target.value as "all" | "active" | "inactive");
              setPage(1);
            }}
            value={status}
          >
            <option value="all">All statuses</option>
            <option value="active">Active</option>
            <option value="inactive">Inactive</option>
          </Select>
        </div>
      </div>

      {/* Directory Table / Cards */}
      <div className="border border-hairline bg-card">
        {students.length === 0 ? (
          <div className="p-4 sm:p-6 lg:p-8">
            <EmptyState message="No students found matching your criteria." />
          </div>
        ) : (
          <>
            {/* Mobile Cards */}
            <div className="xl:hidden grid gap-4 grid-cols-1 md:grid-cols-2 p-4">
              {students.map((student) => (
                <div
                  key={student.id}
                  className={cn(
                    "cursor-pointer p-5 rounded-3xl border border-hairline/30 flex flex-col gap-4 transition-all",
                    student.isActive ? "bg-panel-warm/20" : "bg-neutral-500/5 opacity-60"
                  )}
                  onClick={(event) => activateStudentRow(student.id, event)}
                  onKeyDown={(event) => activateStudentWithKeyboard(student.id, event)}
                  role="link"
                  tabIndex={0}
                >
                  <div className="flex justify-between items-start">
                    <div className="flex flex-col">
                      <Link
                        className="text-base font-medium text-ink hover:underline"
                        params={{ id: student.id }}
                        to="/dashboard/students/$id"
                      >
                        {student.name}
                      </Link>
                      <span className="text-xs text-muted/70 font-medium flex items-center gap-1.5 mt-1">
                        <Mail className="size-3" /> {student.email}
                      </span>
                    </div>
                    <Badge tone="quiet" className="px-2.5 py-1">
                      Student
                    </Badge>
                  </div>

                  <div className="grid grid-cols-2 gap-4 py-3 border-y border-hairline/10 text-xs">
                    <div>
                      <span className="text-[0.6rem] uppercase tracking-widest text-ink/40 font-bold block mb-1">
                        Profile
                      </span>
                      <div className="flex items-center gap-1">
                        {student.profileCompleted ? (
                          <CheckCircle2 className="size-3 text-green-500" />
                        ) : (
                          <AlertCircle className="size-3 text-amber-500" />
                        )}
                        <span>{student.profileCompleted ? "Complete" : "Ongoing"}</span>
                      </div>
                    </div>
                    <div>
                      <span className="text-[0.6rem] uppercase tracking-widest text-ink/40 font-bold block mb-1">
                        Joined
                      </span>
                      <span>{new Date(student.createdAt).toLocaleDateString()}</span>
                    </div>
                  </div>

                  <Button asChild size="sm" variant="outline" className="w-full h-9">
                    <Link params={{ id: student.id }} to="/dashboard/students/$id">
                      <Eye className="mr-1.5 size-3.5" /> View Profile
                    </Link>
                  </Button>
                </div>
              ))}
            </div>

            {/* Desktop Table */}
            <div className="hidden xl:block overflow-x-auto">
              <table className="w-full border-collapse text-left">
                <thead>
                  <tr className="bg-panel-warm/10 border-b border-hairline/20">
                    <th className="px-6 py-4 text-[0.65rem] font-bold uppercase tracking-[0.2em] text-ink/30">
                      Student Identity
                    </th>
                    <th className="px-6 py-4 text-[0.65rem] font-bold uppercase tracking-[0.2em] text-ink/30">
                      Status
                    </th>
                    <th className="px-6 py-4 text-[0.65rem] font-bold uppercase tracking-[0.2em] text-ink/30">
                      Profile
                    </th>
                    <th className="px-6 py-4 text-[0.65rem] font-bold uppercase tracking-[0.2em] text-ink/30">
                      Joined
                    </th>
                    <th className="px-6 py-4 text-[0.65rem] font-bold uppercase tracking-[0.2em] text-ink/30 text-right">
                      {t("admin.users.actions")}
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-hairline/10">
                  {students.map((student) => (
                    <tr
                      key={student.id}
                      className={cn(
                        "group cursor-pointer transition-all duration-300 hover:bg-ink/[0.03]",
                        !student.isActive && "opacity-60"
                      )}
                      onClick={(event) => activateStudentRow(student.id, event)}
                      onKeyDown={(event) => activateStudentWithKeyboard(student.id, event)}
                      role="link"
                      tabIndex={0}
                    >
                      <td className="px-6 py-3">
                        <Link
                          className="flex items-center gap-3 group/user"
                          params={{ id: student.id }}
                          to="/dashboard/students/$id"
                        >
                          <div className="size-8 rounded-full bg-panel-warm border border-hairline flex items-center justify-center text-xs font-semibold text-ink group-hover/user:border-ink transition-colors">
                            {student.name.charAt(0)}
                          </div>
                          <div className="flex flex-col">
                            <span className="text-sm font-medium text-ink group-hover/user:text-accent transition-colors">
                              {student.name}
                            </span>
                            <div className="flex items-center gap-1.5 text-xs text-muted-faint">
                              <Mail className="size-3" /> {student.email}
                              <span className="mx-1 opacity-30">•</span>
                              <Fingerprint className="size-3" />{" "}
                              <code className="text-[0.6rem]">{student.id.slice(-8)}</code>
                            </div>
                          </div>
                        </Link>
                      </td>
                      <td className="px-6 py-3">
                        <div className="flex items-center gap-2">
                          <div
                            className={cn(
                              "size-2 rounded-full",
                              student.isActive ? "bg-green-500" : "bg-red-500"
                            )}
                          />
                          <span className="text-xs font-semibold">
                            {student.isActive ? "Active" : "Inactive"}
                          </span>
                        </div>
                      </td>
                      <td className="px-6 py-3">
                        <div
                          className={cn(
                            "flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[0.65rem] font-bold uppercase tracking-wider w-fit",
                            student.profileCompleted
                              ? "bg-green-500/10 text-green-700"
                              : "bg-amber-500/10 text-amber-700"
                          )}
                        >
                          {student.profileCompleted ? (
                            <CheckCircle2 className="size-3" />
                          ) : (
                            <AlertCircle className="size-3" />
                          )}
                          {student.profileCompleted ? "Complete" : "Incomplete"}
                        </div>
                      </td>
                      <td className="px-6 py-3">
                        <div className="flex items-center gap-1.5 text-xs text-muted">
                          <Calendar className="size-3.5 opacity-50" />
                          <span>{new Date(student.createdAt).toLocaleDateString()}</span>
                        </div>
                      </td>
                      <td className="px-6 py-3 text-right">
                        <Button asChild size="sm" variant="ghost" className="h-8 px-2.5">
                          <Link params={{ id: student.id }} to="/dashboard/students/$id">
                            <Eye className="mr-1 size-3.5" /> View
                          </Link>
                        </Button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </>
        )}

        {/* Pagination */}
        <div className="p-6 border-t border-hairline/20 flex flex-col sm:flex-row items-center justify-between gap-4 bg-panel-warm/5">
          <p className="text-[0.65rem] font-bold uppercase tracking-[0.2em] text-ink/40">
            Page{" "}
            <span className="text-ink font-mono text-xs">
              {page} / {totalPages}
            </span>
          </p>
          <div className="flex gap-3">
            <Button
              size="sm"
              variant="outline"
              disabled={page <= 1}
              onClick={() => setPage(page - 1)}
            >
              {t("common.back")}
            </Button>
            <Button
              size="sm"
              variant="outline"
              disabled={page >= totalPages}
              onClick={() => setPage(page + 1)}
            >
              {t("common.next")}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
