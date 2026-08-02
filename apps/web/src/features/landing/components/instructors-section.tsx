import { Link } from "@tanstack/react-router";
import type { JSX } from "react";

import { TeacherAvatar } from "@/features/landing/components/teacher-avatar";
import type { LandingTeacher } from "@/lib/api/landing";

function subtitle(teacher: LandingTeacher): string {
  if (teacher.specializations !== null && teacher.specializations.trim().length > 0) {
    return teacher.specializations;
  }

  return `${teacher.courseCount} ${teacher.courseCount === 1 ? "course" : "courses"}`;
}

function TeacherCard({ teacher }: { teacher: LandingTeacher }): JSX.Element {
  const body = (
    <>
      <div className="relative mb-6 inline-block">
        <div className="absolute inset-0 bg-primary/10 rounded-full flex scale-0 group-hover:scale-100 transition-transform duration-500"></div>
        <TeacherAvatar
          className="w-32 h-32 mx-auto relative z-10 border-4 border-white shadow-xl text-3xl"
          name={teacher.name}
          profilePhoto={teacher.profilePhoto}
        />
      </div>
      <h4 className="text-lg font-headline font-bold">{teacher.name}</h4>
      <p className="text-xs text-outline uppercase tracking-wider mb-2 line-clamp-1">
        {subtitle(teacher)}
      </p>
      {teacher.studentCount > 0 && (
        <p className="text-xs font-bold text-secondary">
          {teacher.studentCount.toLocaleString()}{" "}
          {teacher.studentCount === 1 ? "Student" : "Students"}
        </p>
      )}
    </>
  );

  if (teacher.slug === null || teacher.slug.length === 0) {
    return <div className="text-center group">{body}</div>;
  }

  return (
    <Link to="/teachers/$slug" params={{ slug: teacher.slug }} className="text-center group block">
      {body}
    </Link>
  );
}

export function InstructorsSection({
  teachers
}: {
  teachers: readonly LandingTeacher[];
}): JSX.Element | null {
  if (teachers.length === 0) {
    return null;
  }

  return (
    <section className="py-32 px-8 max-w-7xl mx-auto">
      <div className="text-center max-w-2xl mx-auto mb-20 space-y-6">
        <p className="text-xs font-bold tracking-[0.3em] text-secondary uppercase">
          Learn from the Best
        </p>
        <h2 className="text-5xl font-headline font-extrabold tracking-tight">
          World-Class Educators
        </h2>
        <p className="text-on-surface-variant font-light">
          We only partner with educators who are masters of their craft, ensuring you learn not just
          the &quot;what&quot; but the &quot;why&quot;.
        </p>
      </div>
      <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-8">
        {teachers.map((teacher) => (
          <TeacherCard key={teacher.id} teacher={teacher} />
        ))}
      </div>
    </section>
  );
}
