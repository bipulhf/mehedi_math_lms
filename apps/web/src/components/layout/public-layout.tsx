import { Link } from "@tanstack/react-router";
import { ArrowRight, Sparkles } from "lucide-react";
import type { JSX, PropsWithChildren } from "react";

import { Button } from "@/components/ui/button";
import { siteConfig } from "@/lib/site";

interface PublicLayoutProps extends PropsWithChildren {
  eyebrow: string;
  subtitle: string;
  title: string;
}

export function PublicLayout({
  children,
  eyebrow,
  subtitle,
  title
}: PublicLayoutProps): JSX.Element {
  return (
    <div className="min-h-screen bg-surface text-on-surface">
      <header className="px-4 py-5 sm:px-6 lg:px-8">
        <div className="mx-auto flex w-full max-w-[88rem] items-center justify-between rounded-full bg-surface/80 px-4 py-3 shadow-[0_12px_30px_-20px_rgba(19,27,46,0.16)] backdrop-blur-[24px]">
          <Link to="/" className="font-display text-lg font-semibold tracking-[-0.03em]">
            {siteConfig.name}
          </Link>
          <div className="flex items-center gap-2">
            <Button asChild variant="ghost">
              <Link to="/login">Log in</Link>
            </Button>
            <Button asChild size="sm">
              <Link to="/auth/sign-up">Student signup</Link>
            </Button>
          </div>
        </div>
      </header>

      <main className="px-4 pb-12 sm:px-6 lg:px-8">
        <div className="mx-auto grid w-full max-w-[88rem] gap-10 lg:grid-cols-[minmax(0,1.15fr)_minmax(24rem,0.85fr)] lg:items-start">
          <section className="space-y-6 rounded-[calc(var(--radius)+0.5rem)] bg-surface-container-low p-6 shadow-[0_20px_48px_-24px_rgba(19,27,46,0.14)] sm:p-8 lg:p-10">
            <div className="inline-flex items-center gap-2 rounded-full bg-surface-container-lowest px-3 py-2 text-[0.75rem] font-semibold uppercase tracking-[0.05em] text-on-surface/70">
              <Sparkles className="size-3.5 text-secondary-container" />
              {eyebrow}
            </div>
            <div className="space-y-4">
              <h1 className="font-display text-[clamp(2.75rem,8vw,5.25rem)] font-semibold leading-[0.95] tracking-[-0.05em]">
                {title}
              </h1>
              <p className="max-w-[62ch] text-base leading-8 text-on-surface/68 sm:text-lg">
                {subtitle}
              </p>
            </div>
            <div className="flex flex-col gap-3 sm:flex-row">
              <Button asChild size="lg">
                <Link to="/auth/sign-up">
                  Create your student account
                  <ArrowRight className="size-4" />
                </Link>
              </Button>
              <Button asChild size="lg" variant="outline">
                <Link to="/login">Already have an account? Log in</Link>
              </Button>
            </div>
          </section>
          <section className="rounded-[calc(var(--radius)+0.5rem)] bg-surface-container-low p-4 shadow-[0_20px_48px_-24px_rgba(19,27,46,0.12)] sm:p-6">
            {children}
          </section>
        </div>
      </main>
    </div>
  );
}
