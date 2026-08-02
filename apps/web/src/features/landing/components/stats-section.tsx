import type { JSX } from "react";

import type { LandingStats } from "@/lib/api/landing";

function compact(value: number): string {
  return new Intl.NumberFormat("en", { maximumFractionDigits: 1, notation: "compact" }).format(
    value
  );
}

export function StatsSection({ stats }: { stats: LandingStats }): JSX.Element {
  // Only counts that exist get a tile. An empty catalog says nothing rather
  // than claiming a zero that reads as a broken page.
  const figures: Array<{ label: string; value: string }> = [];

  if (stats.students > 0) {
    figures.push({ label: "Active Learners", value: compact(stats.students) });
  }

  if (stats.publishedCourses > 0) {
    figures.push({ label: "Published Courses", value: compact(stats.publishedCourses) });
  }

  if (stats.teachers > 0) {
    figures.push({ label: "Teachers", value: compact(stats.teachers) });
  }

  if (stats.rating !== null) {
    figures.push({ label: "Avg. Rating", value: `${stats.rating.average}/5` });
  }

  return (
    <section className="bg-surface-container-low py-20 px-8">
      <div className="max-w-7xl mx-auto flex flex-col md:flex-row justify-between items-center gap-12">
        {figures.length > 0 && (
          <div className="flex flex-wrap gap-16">
            {figures.map((figure) => (
              <div key={figure.label} className="space-y-1">
                <p className="text-4xl font-headline font-extrabold text-primary">{figure.value}</p>
                <p className="text-xs font-bold tracking-widest text-outline uppercase">
                  {figure.label}
                </p>
              </div>
            ))}
          </div>
        )}
        <div className="max-w-md">
          <h3 className="text-xl font-headline font-bold mb-3">The Premium Learning Experience</h3>
          <p className="text-sm text-on-surface-variant font-light leading-relaxed">
            We don't just host videos. We curate environments where academic rigor meets modern
            intuition. Every course is audited for clarity, depth, and performance impact.
          </p>
        </div>
      </div>
    </section>
  );
}
