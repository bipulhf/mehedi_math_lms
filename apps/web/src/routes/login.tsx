import { createFileRoute } from "@tanstack/react-router";
import type { JSX } from "react";

import { RouteErrorView } from "@/components/common/route-error";
import { SignInPage } from "@/routes/auth/sign-in";
import { seo } from "@/lib/seo";

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
  return <SignInPage />;
}
