import type { ErrorComponentProps } from "@tanstack/react-router";
import type { JSX } from "react";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useT } from "@/lib/i18n/locale-context";

export function RouteErrorView({ error, reset }: ErrorComponentProps): JSX.Element {
  const t = useT();

  return (
    <div className="flex min-h-[60vh] items-center justify-center bg-background px-4 py-10">
      <Card className="w-full max-w-xl">
        <CardHeader>
          <CardTitle>{t("error.title")}</CardTitle>
          <CardDescription>{t("error.lead")}</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="rounded-[calc(var(--radius)-0.125rem)] bg-panel-warm p-4 text-sm leading-7 text-ink/70">
            {error.message}
          </div>
          <Button type="button" onClick={() => reset()}>{t("action.retry")}</Button>
        </CardContent>
      </Card>
    </div>
  );
}
