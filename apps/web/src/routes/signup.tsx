import { createFileRoute } from "@tanstack/react-router";
import type { JSX } from "react";

import { RouteErrorView } from "@/components/common/route-error";
import { AuthLayout } from "@/components/layout/auth-layout";
import { seo } from "@/lib/seo";
import { SignUpPage, signUpSearchSchema } from "@/routes/auth/sign-up";
import { useT } from "@/lib/i18n/locale-context";

export const Route = createFileRoute("/signup")({
  head: () =>
    seo({
      description:
        "Join Mehedi's Math Academy to enroll in structured mathematics programs with progress tracking and teacher support.",
      // /signup is a friendly alias for the same page as /auth/sign-up. Only
      // one of the two may claim to be the original.
      path: "/auth/sign-up",
      title: "Sign up"
    }),
  validateSearch: (search) => signUpSearchSchema.parse(search),
  component: SignupAlias,
  errorComponent: RouteErrorView
});

function SignupAlias(): JSX.Element {
  const t = useT();

  const search = Route.useSearch();

  return (
    <AuthLayout description={t("auth.signUpLead")} title={t("auth.signUp")}>
      <SignUpPage courseSlug={search.courseSlug} />
    </AuthLayout>
  );
}
