import { Outlet, createFileRoute } from "@tanstack/react-router";
import type { JSX } from "react";

import { RouteErrorView } from "@/components/common/route-error";
import { AuthLayout } from "@/components/layout/auth-layout";
import { useT } from "@/lib/i18n/locale-context";

export const Route = createFileRoute("/auth")({
  component: AuthRoute,
  errorComponent: RouteErrorView
});

function AuthRoute(): JSX.Element {
  const t = useT();

  return (
    <AuthLayout description={t("auth.signInLead")} title={t("auth.welcomeBack")}>
      <Outlet />
    </AuthLayout>
  );
}
