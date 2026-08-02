import { Link } from "@tanstack/react-router";
import { ArrowRight, BookOpen, Star } from "lucide-react";
import type { JSX } from "react";

import { TeacherAvatar } from "@/features/landing/components/teacher-avatar";
import type { LandingCourse } from "@/lib/api/landing";

function priceLabel(price: string): string {
  const amount = Number(price);

  if (!Number.isFinite(amount) || amount <= 0) {
    return "Free";
  }

  return `৳${amount.toLocaleString()}`;
}

function CourseTile({ course }: { course: LandingCourse }): JSX.Element {
  return (
    <Link
      to="/courses/$slug"
      params={{ slug: course.slug }}
      className="bg-surface-container-lowest rounded-4xl overflow-hidden group border border-outline-variant/5 hover:shadow-2xl hover:shadow-primary/5 transition-all duration-500 flex flex-col"
    >
      <div className="h-64 overflow-hidden relative">
        {course.coverImageUrl !== null ? (
          <img
            decoding="async"
            height={512}
            loading="lazy"
            width={820}
            alt={course.title}
            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700"
            src={course.coverImageUrl}
          />
        ) : (
          <div className="w-full h-full bg-linear-to-br from-secondary/5 to-on-primary-container/20 flex items-center justify-center text-secondary/40">
            <BookOpen className="size-12 opacity-20" />
          </div>
        )}
        <div className="absolute top-6 left-6 flex gap-2">
          <span className="bg-white/90 backdrop-blur px-3 py-1 rounded-full text-[10px] font-bold tracking-wider text-primary uppercase">
            {course.category.name}
          </span>
        </div>
      </div>
      <div className="p-8 space-y-6 flex-1 flex flex-col">
        <div className="flex justify-between items-start gap-4">
          <h3 className="text-xl font-headline font-bold leading-tight group-hover:text-secondary transition-colors line-clamp-2">
            {course.title}
          </h3>
          <p className="text-lg font-bold font-headline shrink-0">{priceLabel(course.price)}</p>
        </div>
        <div className="flex items-center gap-4 py-4 border-y border-outline-variant/10 mt-auto">
          <TeacherAvatar
            className="w-10 h-10"
            name={course.teacher?.name ?? "Expert Faculty"}
            profilePhoto={course.teacher?.profilePhoto ?? null}
          />
          <div className="min-w-0">
            <p className="text-sm font-semibold truncate">
              {course.teacher?.name ?? "Expert Faculty"}
            </p>
            <p className="text-[10px] text-outline uppercase font-medium">Course Teacher</p>
          </div>
          {course.rating !== null && (
            <div className="ml-auto flex items-center gap-1 text-secondary shrink-0">
              <Star className="size-4 fill-secondary" />
              <span className="text-xs font-bold">{course.rating.average}</span>
            </div>
          )}
        </div>
        <div className="flex justify-between items-center text-[10px] font-bold tracking-widest text-outline uppercase">
          <span>
            {course.lectureCount} {course.lectureCount === 1 ? "Lecture" : "Lectures"}
          </span>
          {course.rating !== null && (
            <span>
              {course.rating.count} {course.rating.count === 1 ? "Review" : "Reviews"}
            </span>
          )}
        </div>
      </div>
    </Link>
  );
}

export function CoursesSection({
  courses,
  publishedCourses
}: {
  courses: readonly LandingCourse[];
  publishedCourses: number;
}): JSX.Element | null {
  if (courses.length === 0) {
    return null;
  }

  return (
    <section className="bg-surface-container-low py-32 px-8">
      <div className="max-w-7xl mx-auto">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-20 gap-8">
          <div className="space-y-4">
            <div className="flex items-center gap-4">
              <span className="h-px w-12 bg-primary"></span>
              <span className="text-xs font-bold tracking-widest text-outline uppercase">
                Showcasing {publishedCourses.toLocaleString()}{" "}
                {publishedCourses === 1 ? "course" : "courses"}
              </span>
            </div>
            <h2 className="text-5xl font-headline font-extrabold tracking-tight">Elite Coursework</h2>
          </div>
          <Link
            to="/courses"
            className="flex items-center gap-3 px-6 py-4 rounded-full border border-outline-variant/20 hover:bg-white transition-all text-sm font-headline font-bold"
          >
            Browse the catalog
            <ArrowRight className="size-5 text-on-surface" />
          </Link>
        </div>
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-10">
          {courses.map((course) => (
            <CourseTile key={course.id} course={course} />
          ))}
        </div>
      </div>
    </section>
  );
}
