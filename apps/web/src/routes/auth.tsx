import { Outlet, createFileRoute, useLocation } from "@tanstack/react-router";
import type { JSX } from "react";
import type { MessageKey } from "@mma/i18n";

import { RouteErrorView } from "@/components/common/route-error";
import { AuthLayout } from "@/components/layout/auth-layout";
import { useT } from "@/lib/i18n/locale-context";

export const Route = createFileRoute("/auth")({
  component: AuthRoute,
  errorComponent: RouteErrorView
});

interface AuthCopy {
  descriptionKey: MessageKey;
  titleKey: MessageKey;
}

/**
 * The card's heading, per child route.
 *
 * The layout used to hard-code "welcome back" for everything under `/auth`,
 * which read as nonsense above a sign-up form and would read worse above a
 * password reset.
 */
const copyByPath: Readonly<Record<string, AuthCopy>> = {
  "/auth/forgot-password": {
    descriptionKey: "auth.forgotPasswordLead",
    titleKey: "auth.forgotPasswordTitle"
  },
  "/auth/reset-password": {
    descriptionKey: "auth.resetPasswordLead",
    titleKey: "auth.resetPassword"
  },
  "/auth/sign-up": { descriptionKey: "auth.signUpLead", titleKey: "auth.signUp" }
};

const signInCopy: AuthCopy = {
  descriptionKey: "auth.signInLead",
  titleKey: "auth.welcomeBack"
};

function AuthRoute(): JSX.Element {
  const t = useT();
  const { pathname } = useLocation();
  const copy = copyByPath[pathname.replace(/\/$/, "")] ?? signInCopy;

  return (
    <AuthLayout description={t(copy.descriptionKey, { count: 8 })} title={t(copy.titleKey)}>
      <Outlet />
    </AuthLayout>
  );
}
