import { Outlet, createFileRoute } from "@tanstack/react-router";
import type { JSX } from "react";

import { RouteErrorView } from "@/components/common/route-error";
import { AuthLayout } from "@/components/layout/auth-layout";

export const Route = createFileRoute("/auth")({
  component: AuthRoute,
  errorComponent: RouteErrorView
});

function AuthRoute(): JSX.Element {
  return (
    <AuthLayout
      title="Access your academy account"
      description="Sign in or create your student account to enter the academy workspace, manage your profile, and continue into role-aware dashboard flows."
    >
      <Outlet />
    </AuthLayout>
  );
}
