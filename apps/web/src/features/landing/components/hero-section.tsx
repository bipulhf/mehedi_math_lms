import { Link } from "@tanstack/react-router";
import { Search, Award } from "lucide-react";
import type { JSX } from "react";

import heroAtelier from "@/assets/hero-atelier.svg";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import type { LandingStats } from "@/lib/api/landing";

function badgeFigure(stats: LandingStats): { label: string; value: string } | null {
  if (stats.rating !== null) {
    return { label: "Curated Quality", value: `${stats.rating.average}/5 from learners` };
  }

  if (stats.publishedCourses > 0) {
    return {
      label: "Curated Quality",
      value: `${stats.publishedCourses} published ${stats.publishedCourses === 1 ? "course" : "courses"}`
    };
  }

  return null;
}

export function HeroSection({ stats }: { stats: LandingStats }): JSX.Element {
  const figure = badgeFigure(stats);

  return (
    <section className="relative px-8 pt-20 pb-32 max-w-7xl mx-auto overflow-hidden">
      <div className="grid lg:grid-cols-2 gap-16 items-center">
        <div className="space-y-10 z-10">
          <div className="inline-flex items-center gap-2 px-3 py-1 bg-surface-container-high rounded-full text-[10px] font-bold tracking-[0.1em] text-secondary uppercase">
            <span className="w-1 h-1 bg-secondary rounded-full"></span>
            The New Standard of Learning
          </div>
          <h1 className="text-7xl font-extrabold font-headline leading-[1.05] tracking-tight text-on-background">
            Elevating Your <br />
            <span className="text-on-primary-container italic font-light">Academic Potential</span>
          </h1>
          <p className="text-lg text-on-surface-variant leading-relaxed max-w-lg font-light">
            Experience a curated academic atelier designed for high-performance students. From SSC
            foundations to professional mastery, we treat education as a craft.
          </p>
          <div className="flex justify-between items-center w-full bg-surface-container-lowest border border-outline-variant/20 p-1.5 rounded-xl shadow-sm">
            <div className="flex items-center flex-1">
              <Search className="ml-4 text-outline size-5 shrink-0" />
              <Input
                className="bg-transparent border-none focus-visible:ring-0 shadow-none text-sm flex-1 py-3 px-3"
                placeholder="What would you like to learn today?"
                type="text"
              />
            </div>
            <Button
              asChild
              className="bg-primary text-white px-8 h-full py-3 rounded-lg font-headline font-semibold text-sm hover:bg-on-surface transition-all shrink-0"
            >
              <Link to="/courses">Explore</Link>
            </Button>
          </div>
        </div>
        <div className="relative">
          <div className="absolute -top-20 -right-20 w-96 h-96 bg-secondary/5 rounded-full blur-3xl"></div>
          <div className="bg-surface-container-low rounded-[2rem] p-4 aspect-square overflow-hidden rotate-2 shadow-2xl shadow-primary/5">
            <img
              decoding="async"
              // Above the fold: this is the LCP element, so it must not be lazy.
              fetchPriority="high"
              height={720}
              loading="eager"
              width={720}
              alt="Abstract geometric composition of a curve, an axis grid and concentric circles"
              className="w-full h-full object-cover rounded-[1.5rem]"
              src={heroAtelier}
            />
          </div>
          {figure !== null && (
            <div className="absolute bottom-12 -left-12 bg-surface-container-lowest p-6 rounded-2xl shadow-xl border border-outline-variant/10 max-w-[240px]">
              <div className="flex gap-4 items-center">
                <div className="w-12 h-12 rounded-full bg-linear-to-br from-primary to-on-primary-container flex items-center justify-center text-white">
                  <Award className="size-6" />
                </div>
                <div>
                  <p className="text-[10px] font-bold text-outline tracking-wider uppercase">
                    {figure.label}
                  </p>
                  <p className="text-sm font-headline font-bold">{figure.value}</p>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </section>
  );
}
