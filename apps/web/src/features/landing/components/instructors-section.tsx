import { Link } from "@tanstack/react-router";
import type { JSX } from "react";

import { Reveal } from "@/components/marketing/reveal";
import { LandingSection } from "@/features/landing/components/landing-section";
import { TeacherAvatar } from "@/features/landing/components/teacher-avatar";
import type { LandingTeacher } from "@/lib/api/landing";
import { useFormat, useT } from "@/lib/i18n/locale-context";
import { hueForKey, spectrumClasses } from "@/lib/spectrum";
import { stripHtml } from "@/lib/html";

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
    <LandingSection
      action={
        <Link
          className="border-b border-line-strong pb-0.5 text-base text-ink transition-colors hover:border-spectrum-ember hover:text-spectrum-ember"
          to="/teachers"
        >
          {t("action.showAll")}
        </Link>
      }
      description={t("home.teachersLead")}
      title={t("home.teachersTitle")}
    >
      <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
          {teachers.map((teacher, index) => {
            const hue = spectrumClasses(hueForKey(teacher.id));
            const body = (
              <>
                <TeacherAvatar
                  className="size-14"
                  name={teacher.name}
                  profilePhoto={teacher.profilePhoto}
                />
                <div className="min-w-0 space-y-1">
                  <p className="truncate text-base font-medium text-ink transition-colors group-hover:text-spectrum-ember">
                    {teacher.name}
                  </p>
                  {teacher.specializations === null ? null : (
                    <p className="truncate text-sm text-muted-light">
                      {stripHtml(teacher.specializations)}
                    </p>
                  )}
                  <p className="text-sm text-muted-light">
                    {format.number(teacher.courseCount)} {t("common.courses")}
                  </p>
                </div>
              </>
            );

            const cardClassName = `group flex items-center gap-4 border border-l-2 border-hairline bg-card p-5 transition-colors hover:border-line-strong ${hue.rule}`;

            return (
              <Reveal delayMs={index * 80} key={teacher.id}>
                {teacher.slug === null ? (
                  <div className={cardClassName}>{body}</div>
                ) : (
                  <Link className={cardClassName} params={{ slug: teacher.slug }} to="/teachers/$slug">
                    {body}
                  </Link>
                )}
              </Reveal>
            );
          })}
      </div>
    </LandingSection>
  );
}
