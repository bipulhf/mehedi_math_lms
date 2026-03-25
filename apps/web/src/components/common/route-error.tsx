import type { ErrorComponentProps } from "@tanstack/react-router";
import type { JSX } from "react";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

export function RouteErrorView({ error, reset }: ErrorComponentProps): JSX.Element {
  return (
    <div className="flex min-h-[60vh] items-center justify-center bg-surface px-4 py-10">
      <Card className="w-full max-w-xl">
        <CardHeader>
          <CardTitle>Something interrupted the experience</CardTitle>
          <CardDescription>
            The route boundary caught this issue before it spread through the interface.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="rounded-[calc(var(--radius)-0.125rem)] bg-surface-container-low p-4 text-sm leading-7 text-on-surface/70">
            {error.message}
          </div>
          <Button type="button" onClick={() => reset()}>
            Try again
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
