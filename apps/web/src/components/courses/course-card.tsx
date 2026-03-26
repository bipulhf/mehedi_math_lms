import { Link } from "@tanstack/react-router";
import { Users, Clock, ArrowRight, GraduationCap, BookOpen } from "lucide-react";
import type { JSX } from "react";
import { FadeIn } from "@/components/common/fade-in";
import { CourseStatusBadge } from "@/components/courses/course-status-badge";
import { Button } from "@/components/ui/button";
import type { CourseSummary } from "@/lib/api/courses";

export function CourseCard({
  course,
  managementHref
}: {
  course: CourseSummary;
  managementHref?:
    | {
        params?: { id: string } | undefined;
        to: "/dashboard/courses/$id/edit" | "/dashboard/admin/courses";
      }
    | undefined;
}): JSX.Element {
  return (
    <FadeIn>
      <div className="group relative flex flex-col bg-surface-container-lowest rounded-4xl border border-outline-variant/10 shadow-[0_15px_45px_-12px_rgba(19,27,46,0.06)] overflow-hidden hover:shadow-[0_25px_60px_-15px_rgba(19,27,46,0.12)] hover:-translate-y-2 transition-all duration-700 ease-[cubic-bezier(0.33,1,0.68,1)] pb-4">
        {/* Image / Thumbnail Section */}
        <div className="relative aspect-[16/10] overflow-hidden bg-surface-container-low group-hover:aspect-[16/9] transition-all duration-700 m-2 rounded-3xl">
          {course.coverImageUrl ? (
            <img
              alt={course.title}
              className="h-full w-full object-cover group-hover:scale-105 transition-transform duration-700"
              src={course.coverImageUrl}
            />
          ) : (
            <div className="h-full w-full bg-linear-to-br from-secondary/5 to-on-primary-container/20 flex items-center justify-center text-secondary/40">
              <BookOpen className="size-12 opacity-10" />
            </div>
          )}

          <div className="absolute top-4 left-4 flex flex-wrap gap-2">
            <CourseStatusBadge status={course.status} />
            {course.isExamOnly && (
              <span className="bg-white/80 backdrop-blur-md text-[0.6rem] font-bold uppercase tracking-widest px-2 py-0.5 rounded-lg text-secondary border border-secondary/10">
                Exam Only
              </span>
            )}
          </div>

          <div className="absolute bottom-4 left-4 right-4 translate-y-full group-hover:translate-y-0 transition-transform duration-500">
            <div className="bg-white/95 backdrop-blur-xl p-3 rounded-2xl flex items-center justify-between shadow-xl">
              <div className="flex items-center gap-2">
                <div className="size-8 rounded-full bg-secondary/10 flex items-center justify-center text-secondary">
                  <Users className="size-4" />
                </div>
                <div>
                  <p className="text-[0.6rem] font-black uppercase tracking-widest text-on-surface-variant opacity-60">
                    Architect
                  </p>
                  <p className="text-xs font-bold text-on-background line-clamp-1">
                    {course.teachers[0]?.name || "Expert Faculty"}
                  </p>
                </div>
              </div>
              <div className="text-right">
                <p className="text-[0.6rem] font-black uppercase tracking-widest text-on-surface-variant opacity-60">
                  Price
                </p>
                <p className="text-xs font-black text-secondary">
                  ৳{Number(course.price).toLocaleString()}
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Content Section */}
        <div className="flex-1 p-6 lg:p-8 pt-4 space-y-6">
          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <span className="h-px w-6 bg-secondary/20"></span>
              <p className="text-[0.65rem] font-black uppercase tracking-widest text-secondary opacity-80">
                {course.category.name}
              </p>
            </div>
            <h3 className="font-headline text-2xl font-black text-on-background tracking-tight leading-[1.2] min-h-[3rem] line-clamp-2">
              {course.title}
            </h3>
            <p className="text-sm font-medium italic opacity-60 line-clamp-2 leading-relaxed h-[2.5rem]">
              {course.description}
            </p>
          </div>

          <div className="flex items-center gap-6 py-4 border-y border-outline-variant/5">
            <div className="flex items-center gap-2 group/icon">
              <GraduationCap className="size-4 text-on-surface-variant group-hover/icon:text-secondary transition-colors" />
              <p className="text-[0.6rem] font-black uppercase tracking-widest text-on-surface-variant opacity-40">
                Enrollment Active
              </p>
            </div>
            <div className="h-4 w-px bg-outline-variant/10"></div>
            <div className="flex items-center gap-2 group/icon">
              <Clock className="size-4 text-on-surface-variant group-hover/icon:text-secondary transition-colors" />
              <p className="text-[0.6rem] font-black uppercase tracking-widest text-on-surface-variant opacity-40">
                Lifetime Access
              </p>
            </div>
          </div>

          <div className="pt-2">
            {course.status === "PUBLISHED" && !managementHref ? (
              <Button
                asChild
                className="w-full h-14 rounded-2xl bg-surface-container-high text-on-surface hover:bg-secondary hover:text-white font-headline font-black text-sm uppercase tracking-widest flex items-center gap-3 transition-all"
              >
                <Link to="/courses/$slug" params={{ slug: course.slug }}>
                  Initiate Entry
                  <ArrowRight className="size-4 group-hover:translate-x-1" />
                </Link>
              </Button>
            ) : managementHref ? (
              <div className="grid grid-cols-2 gap-3">
                <Button
                  asChild
                  variant="outline"
                  className="h-14 rounded-2xl border-outline-variant/20 font-black text-[0.65rem] uppercase tracking-widest shadow-none"
                >
                  <Link to="/courses/$slug" params={{ slug: course.slug }}>
                    Public Hub
                  </Link>
                </Button>
                <Button
                  asChild
                  className="h-14 rounded-2xl bg-secondary text-white font-black text-[0.65rem] uppercase tracking-widest shadow-xl shadow-secondary/10"
                >
                  {"params" in managementHref && managementHref.params ? (
                    <Link to={managementHref.to} params={managementHref.params}>
                      Configure Course
                    </Link>
                  ) : (
                    <Link to={managementHref.to}>Configure Architecture</Link>
                  )}
                </Button>
              </div>
            ) : null}
          </div>
        </div>
      </div>
    </FadeIn>
  );
}

export function CourseGridSkeleton(): JSX.Element {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-10">
      {Array.from({ length: 6 }).map((_, index) => (
        <div
          key={index}
          className="bg-surface-container-lowest rounded-4xl border border-outline-variant/10 overflow-hidden m-2 pb-8 p-4"
        >
          <div className="aspect-[16/10] bg-surface-container-low animate-pulse rounded-3xl mb-8" />
          <div className="px-4 space-y-6">
            <div className="space-y-4">
              <div className="h-2 w-24 bg-surface-container-low animate-pulse rounded-full" />
              <div className="h-8 w-full bg-surface-container-low animate-pulse rounded-2xl" />
              <div className="h-4 w-5/6 bg-surface-container-low animate-pulse rounded-xl" />
            </div>
            <div className="h-10 w-full bg-surface-container-low animate-pulse rounded-2xl mt-8" />
          </div>
        </div>
      ))}
    </div>
  );
}
