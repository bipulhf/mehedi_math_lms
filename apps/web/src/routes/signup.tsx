import { createFileRoute } from "@tanstack/react-router";
import type { JSX } from "react";

import { RouteErrorView } from "@/components/common/route-error";
import { AuthLayout } from "@/components/layout/auth-layout";
import { seo } from "@/lib/seo";
import { SignUpPage, signUpSearchSchema } from "@/routes/auth/sign-up";

export const Route = createFileRoute("/signup")({
  head: () =>
    seo({
      description:
        "Join Mehedi's Math Academy to enroll in structured mathematics programs with progress tracking and teacher support.",
      path: "/auth/sign-up",
      title: "Sign up"
    }),
  validateSearch: (search) => signUpSearchSchema.parse(search),
  component: SignupAlias,
  errorComponent: RouteErrorView
});

function SignupAlias(): JSX.Element {
  const search = Route.useSearch();

  return (
    <AuthLayout
      title="Create your student account"
      description="Sign up with your email and password to unlock course enrollment, profile setup, and your learning dashboard."
    >
      <SignUpPage courseSlug={search.courseSlug} />
    </AuthLayout>
  );
}
