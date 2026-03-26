import { Outlet, createFileRoute, useLocation, useRouter } from "@tanstack/react-router";
import type { JSX } from "react";
import { useEffect } from "react";

import { ProfilePageSkeleton } from "@/components/profile/profile-editor";
import { RouteErrorView } from "@/components/common/route-error";
import { DashboardLayout } from "@/components/layout/dashboard-layout";
import { useAuthSession } from "@/hooks/use-auth-session";
import type { UserRole } from "@mma/shared";

export const Route = createFileRoute("/dashboard")({
  component: DashboardRoute,
  errorComponent: RouteErrorView
});

function DashboardRoute(): JSX.Element {
  const location = useLocation();
  const router = useRouter();
  const { isPending, session } = useAuthSession();

  useEffect(() => {
    if (isPending) {
      return;
    }

    if (!session) {
      void router.navigate({ to: "/auth/sign-in" });
      return;
    }

    if (!session.session.profileCompleted && location.pathname !== "/dashboard/profile-complete") {
      void router.navigate({ to: "/dashboard/profile-complete" });
    }
  }, [isPending, location.pathname, router, session]);

  if (isPending || !session) {
    return (
      <DashboardLayout isLoading={isPending}>
        <ProfilePageSkeleton />
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout role={session.session.role as UserRole}>
      <Outlet />
    </DashboardLayout>
  );
}
