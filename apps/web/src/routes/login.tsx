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
      // /login is a friendly alias for the same page as /auth/sign-in. Only
      // one of the two may claim to be the original.
      path: "/auth/sign-in",
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
