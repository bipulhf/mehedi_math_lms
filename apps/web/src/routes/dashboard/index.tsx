import { createFileRoute } from "@tanstack/react-router";
import { Activity, BarChart3, BookOpenCheck, UsersRound } from "lucide-react";
import type { JSX } from "react";

import { FadeIn } from "@/components/common/fade-in";
import { RouteErrorView } from "@/components/common/route-error";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";

export const Route = createFileRoute("/dashboard/")({
  component: DashboardHomePage,
  errorComponent: RouteErrorView
});

const metrics = [
  {
    icon: UsersRound,
    label: "Active students",
    value: "2,184"
  },
  {
    icon: BookOpenCheck,
    label: "Published courses",
    value: "37"
  },
  {
    icon: BarChart3,
    label: "Completion rate",
    value: "84%"
  },
  {
    icon: Activity,
    label: "Realtime sessions",
    value: "126"
  }
] as const;

function DashboardHomePage(): JSX.Element {
  return (
    <div className="space-y-4">
      <section className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {metrics.map((metric, index) => {
          const Icon = metric.icon;

          return (
            <FadeIn key={metric.label} delayClassName={index > 0 ? "delay-75" : undefined}>
              <Card>
                <CardHeader className="space-y-4">
                  <div className="inline-flex size-10 items-center justify-center rounded-full bg-surface-container-highest text-secondary-container">
                    <Icon className="size-4" />
                  </div>
                  <div>
                    <p className="text-[0.75rem] font-semibold uppercase tracking-[0.05em] text-on-surface/54">
                      {metric.label}
                    </p>
                    <CardTitle className="mt-2 text-3xl">{metric.value}</CardTitle>
                  </div>
                </CardHeader>
              </Card>
            </FadeIn>
          );
        })}
      </section>

      <section className="grid grid-cols-1 gap-4 xl:grid-cols-[1.2fr_0.8fr]">
        <Card className="bg-surface-container-low p-1">
          <div className="rounded-[calc(var(--radius)-0.125rem)] bg-surface-container-lowest">
            <CardHeader>
              <CardTitle>Course performance surfaces</CardTitle>
              <CardDescription>
                Sample loading states and dashboard composition for the analytics-heavy phases ahead.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <Skeleton className="h-56 w-full" />
              <div className="grid grid-cols-2 gap-3">
                <Skeleton className="h-20" />
                <Skeleton className="h-20" />
              </div>
            </CardContent>
          </div>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Transition system</CardTitle>
            <CardDescription>
              Smooth 150ms opacity + translate transitions replace abrupt state swaps throughout the app shell.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="rounded-[calc(var(--radius)-0.125rem)] bg-surface-container-low p-4 text-sm leading-7 text-on-surface/68">
              Data tables, cards, forms, and panels can all render custom skeletons before content settles in.
            </div>
            <div className="rounded-[calc(var(--radius)-0.125rem)] bg-surface-container-low p-4 text-sm leading-7 text-on-surface/68">
              The shell already supports role-driven navigation, ready for the profile and admin phases.
            </div>
          </CardContent>
        </Card>
      </section>
    </div>
  );
}
