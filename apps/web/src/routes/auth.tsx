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
      title="Sign in to continue"
      description="Email, Google OAuth, and role-aware dashboard flows are already wired into the shared auth foundation."
    >
      <Outlet />
    </AuthLayout>
  );
}
