import { createFileRoute } from "@tanstack/react-router";
import type { JSX } from "react";

import { RouteErrorView } from "@/components/common/route-error";
import { SignUpPage } from "@/routes/auth/sign-up";
import { seo } from "@/lib/seo";

export const Route = createFileRoute("/signup")({
  head: () =>
    seo({
      description:
        "Join Mehedi's Math Academy to enroll in structured mathematics programs with progress tracking and teacher support.",
      path: "/signup",
      title: "Sign up"
    }),
  component: SignupAlias,
  errorComponent: RouteErrorView
});

function SignupAlias(): JSX.Element {
  return <SignUpPage />;
}
