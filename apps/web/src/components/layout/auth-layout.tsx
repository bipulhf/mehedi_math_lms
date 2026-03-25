import type { JSX, PropsWithChildren } from "react";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

interface AuthLayoutProps extends PropsWithChildren {
  description: string;
  title: string;
}

export function AuthLayout({ children, description, title }: AuthLayoutProps): JSX.Element {
  return (
    <div className="min-h-screen bg-surface px-4 py-10 sm:px-6 lg:px-8">
      <div className="mx-auto grid w-full max-w-6xl gap-6 lg:grid-cols-[1.1fr_minmax(24rem,30rem)]">
        <section className="rounded-[calc(var(--radius)+0.5rem)] bg-surface-container-low p-8 shadow-[0_20px_48px_-24px_rgba(19,27,46,0.14)]">
          <p className="text-[0.75rem] font-semibold uppercase tracking-[0.05em] text-on-surface/54">
            Focused Access
          </p>
          <h1 className="mt-4 font-display text-[clamp(2.25rem,5vw,4rem)] font-semibold leading-[0.96] tracking-[-0.04em]">
            Quiet entry points for students, teachers, accountants, and admin workflows.
          </h1>
          <p className="mt-5 max-w-[48ch] text-base leading-8 text-on-surface/66">
            Every authentication touchpoint is prepared for Better Auth, refined with soft surfaces, and designed to swap skeletons in place of generic loading states.
          </p>
        </section>

        <Card className="self-start">
          <CardHeader>
            <CardTitle>{title}</CardTitle>
            <CardDescription>{description}</CardDescription>
          </CardHeader>
          <CardContent>{children}</CardContent>
        </Card>
      </div>
    </div>
  );
}
