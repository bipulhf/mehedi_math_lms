import { createFileRoute } from "@tanstack/react-router";
import type { JSX } from "react";

import { RouteErrorView } from "@/components/common/route-error";
import { AuthLayout } from "@/components/layout/auth-layout";
import { seo } from "@/lib/seo";
import { SignInPage } from "@/routes/auth/sign-in";

export const Route = createFileRoute("/login")({
  head: () =>
    seo({
      description:
        "Access your Mehedi's Math Academy student or instructor account with email, password, or Google OAuth.",
      path: "/login",
      title: "Login"
    }),
  component: LoginAlias,
  errorComponent: RouteErrorView
});

function LoginAlias(): JSX.Element {
  return (
    <AuthLayout
      title="Sign in to continue"
      description="Email, Google OAuth, and role-aware dashboard flows are already wired into the shared auth foundation."
    >
      <SignInPage />
    </AuthLayout>
  );
}
