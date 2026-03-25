import { createFileRoute } from "@tanstack/react-router";
import { Link } from "@tanstack/react-router";
import { ArrowRight, BookOpen, Layers3, Sparkles } from "lucide-react";
import type { JSX } from "react";

import { FadeIn } from "@/components/common/fade-in";
import { RouteErrorView } from "@/components/common/route-error";
import { PublicLayout } from "@/components/layout/public-layout";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { siteConfig } from "@/lib/site";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      {
        title: `${siteConfig.name} | Editorial LMS Foundation`
      }
    ]
  }),
  component: HomePage,
  errorComponent: RouteErrorView
});

const highlights = [
  {
    description: "Nested surfaces replace hard dividers to keep focus on course content.",
    icon: Layers3,
    title: "Tonal layering"
  },
  {
    description: "Every wait state is prepared with bespoke shimmer skeletons, never spinner noise.",
    icon: Sparkles,
    title: "Custom loading language"
  },
  {
    description: "Teachers, students, accountants, and admins inherit role-driven layouts from one foundation.",
    icon: BookOpen,
    title: "Role-shaped workflows"
  }
] as const;

function HomePage(): JSX.Element {
  return (
    <PublicLayout
      eyebrow="Phase 5 foundation"
      title="A Digital Atelier for focused mathematics learning."
      subtitle="This foundation establishes TanStack Start, editorial surfaces, motion-safe skeleton transitions, and reusable layouts for the full Mehedi's Math Academy product."
    >
      <div className="space-y-4">
        {highlights.map((highlight, index) => {
          const Icon = highlight.icon;

          return (
            <FadeIn key={highlight.title} delayClassName={index === 1 ? "delay-75" : index === 2 ? "delay-150" : undefined}>
              <Card className="bg-surface-container-low p-1">
                <div className="rounded-[calc(var(--radius)-0.125rem)] bg-surface-container-lowest">
                  <CardHeader className="pb-3">
                    <div className="inline-flex size-10 items-center justify-center rounded-full bg-surface-container-highest text-secondary-container">
                      <Icon className="size-4" />
                    </div>
                    <CardTitle className="text-xl">{highlight.title}</CardTitle>
                    <CardDescription>{highlight.description}</CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="grid grid-cols-3 gap-3">
                      <Skeleton className="h-20" />
                      <Skeleton className="h-20" />
                      <Skeleton className="h-20" />
                    </div>
                    <div className="flex flex-wrap gap-3">
                      <Button asChild variant="ghost" className="px-0 text-secondary-container hover:bg-transparent">
                        <Link to="/courses">
                          Browse courses
                          <ArrowRight className="size-4" />
                        </Link>
                      </Button>
                      <Button asChild variant="ghost" className="px-0 text-secondary-container hover:bg-transparent">
                        <Link to="/categories">
                          Browse categories
                          <ArrowRight className="size-4" />
                        </Link>
                      </Button>
                    </div>
                  </CardContent>
                </div>
              </Card>
            </FadeIn>
          );
        })}
      </div>
    </PublicLayout>
  );
}
