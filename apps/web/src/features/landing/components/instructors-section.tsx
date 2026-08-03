import { Link } from "@tanstack/react-router";
import type { JSX } from "react";

import { SectionHeading } from "@/components/ui/section-heading";
import { TeacherAvatar } from "@/features/landing/components/teacher-avatar";
import type { LandingTeacher } from "@/lib/api/landing";
import { useFormat, useT } from "@/lib/i18n/locale-context";

/**
 * The teacher strip. A teacher without a slug has no public page, so their card
 * renders without a link rather than pointing at a 404 — that mismatch was a
 * real bug on the dashboard once already.
 */
export function InstructorsSection({
  teachers
}: {
  teachers: readonly LandingTeacher[];
}): JSX.Element | null {
  const t = useT();
  const format = useFormat();

  if (teachers.length === 0) {
    return null;
  }

  return (
    <section className="border-b border-hairline">
      <div className="mx-auto w-full max-w-[90rem] space-y-8 px-4 py-14 sm:px-8 lg:px-14 lg:py-20">
        <SectionHeading
          action={
            <Link
              className="border-b border-line-strong pb-0.5 text-base text-ink transition-colors hover:border-accent hover:text-accent"
              to="/teachers"
            >
              {t("action.showAll")}
            </Link>
          }
          description={t("home.teachersLead")}
          title={t("home.teachersTitle")}
        />

        <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
          {teachers.map((teacher) => {
            const body = (
              <>
                <TeacherAvatar
                  className="size-14 transition-transform duration-300 group-hover:scale-105"
                  name={teacher.name}
                  profilePhoto={teacher.profilePhoto}
                />
                <div className="min-w-0 space-y-1">
                  <p className="truncate text-base font-medium text-ink transition-colors group-hover:text-accent">{teacher.name}</p>
                  {teacher.specializations === null ? null : (
                    <p className="truncate text-sm text-muted-light">{teacher.specializations}</p>
                  )}
                  <p className="text-sm text-muted-light">
                    {format.number(teacher.courseCount)} {t("common.courses")}
                  </p>
                </div>
              </>
            );

            return teacher.slug === null ? (
              <div
                className="group flex items-center gap-4 border border-hairline bg-card p-5 transition-all duration-300 hover:-translate-y-1.5 hover:border-line-strong hover:shadow-md"
                key={teacher.id}
              >
                {body}
              </div>
            ) : (
              <Link
                className="group flex items-center gap-4 border border-hairline bg-card p-5 transition-all duration-300 hover:-translate-y-1.5 hover:border-line-strong hover:shadow-md"
                key={teacher.id}
                params={{ slug: teacher.slug }}
                to="/teachers/$slug"
              >
                {body}
              </Link>
            );
          })}
        </div>
      </div>
    </section>
  );
}
