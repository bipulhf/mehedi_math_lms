import { createFileRoute } from "@tanstack/react-router";
import type { JSX } from "react";

import { AccountantOverview } from "@/components/dashboard/accountant-overview";
import { AdminOverview } from "@/components/dashboard/admin-overview";
import { StudentOverview } from "@/components/dashboard/student-overview";
import { TeacherOverview } from "@/components/dashboard/teacher-overview";
import { RouteErrorView } from "@/components/common/route-error";
import { Skeleton } from "@/components/ui/skeleton";
import { useAuthSession } from "@/hooks/use-auth-session";

export const Route = createFileRoute("/dashboard/")({
  component: DashboardHomePage,
  errorComponent: RouteErrorView
});

/**
 * Four roles, four different questions. A student wants to know what to watch
 * next; a teacher, how their courses are doing; an admin, what is waiting on
 * them; an accountant, where the money went.
 *
 * They are separate components rather than one page of conditionals because
 * they share nothing but the shell.
 */
function DashboardHomePage(): JSX.Element {
  const { isPending, session } = useAuthSession();

  if (isPending || !session) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-10 w-64" />
        <Skeleton className="h-28 w-full" />
        <Skeleton className="h-64 w-full" />
      </div>
    );
  }

  const name = session.user.name;

  if (session.session.role === "ADMIN") {
    return <AdminOverview />;
  }

  if (session.session.role === "ACCOUNTANT") {
    return <AccountantOverview />;
  }

  if (session.session.role === "TEACHER") {
    return <TeacherOverview name={name} />;
  }

  return <StudentOverview name={name} />;
}
