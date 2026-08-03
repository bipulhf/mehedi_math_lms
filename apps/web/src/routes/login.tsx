import { createFileRoute } from "@tanstack/react-router";
import type { JSX } from "react";

import { RouteErrorView } from "@/components/common/route-error";
import { AuthLayout } from "@/components/layout/auth-layout";
import { seo } from "@/lib/seo";
import { SignInPage } from "@/routes/auth/sign-in";
import { useT } from "@/lib/i18n/locale-context";

export const Route = createFileRoute("/login")({
  head: () =>
    seo({
      description:
        "Access your Genex student or instructor account with email, password, or Google OAuth.",
      // /login is a friendly alias for the same page as /auth/sign-in. Only
      // one of the two may claim to be the original.
      path: "/auth/sign-in",
      title: "Login"
    }),
  component: LoginAlias,
  errorComponent: RouteErrorView
});

function LoginAlias(): JSX.Element {
  const t = useT();

  return (
    <AuthLayout description={t("auth.signInLead")} title={t("auth.signIn")}>
      <SignInPage />
    </AuthLayout>
  );
}
