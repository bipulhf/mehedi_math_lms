import { Outlet, createFileRoute } from "@tanstack/react-router";
import type { JSX } from "react";

import { RouteErrorView } from "@/components/common/route-error";
import { DashboardLayout } from "@/components/layout/dashboard-layout";

export const Route = createFileRoute("/dashboard")({
  component: DashboardRoute,
  errorComponent: RouteErrorView
});

function DashboardRoute(): JSX.Element {
  return (
    <DashboardLayout>
      <Outlet />
    </DashboardLayout>
  );
}
