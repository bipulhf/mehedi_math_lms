import { Link } from "@tanstack/react-router";
import type { JSX } from "react";

import { Button } from "@/components/ui/button";
import { PriceText } from "@/components/ui/price-text";
import { Skeleton } from "@/components/ui/skeleton";
import type { CourseDetail } from "@/lib/api/courses";
import type { StudentEnrollment } from "@/lib/api/enrollments";
import { useT } from "@/lib/i18n/locale-context";

interface CourseBuyCardProps {
  readonly course: CourseDetail;
  readonly enrollment: StudentEnrollment | null;
  readonly isEnrolling: boolean;
  readonly isSessionPending: boolean;
  readonly onEnroll: () => void;
  readonly role: string | undefined;
  readonly isSignedIn: boolean;
}

/**
 * The right rail. Price, one action, and what the course includes.
 *
 * The previous version printed a struck-through "original" price of
 * `price × 2.5` and a "65% OFF" badge. Neither existed: the schema holds one
 * price and no discount, so both were invented and shown to buyers as fact.
 * They are gone — GENEX_MIGRATION.md §2 cuts the discount, the seat count, the
 * batch date and the countdown for the same reason.
 */
export function CourseBuyCard({
  course,
  enrollment,
  isEnrolling,
  isSessionPending,
  isSignedIn,
  onEnroll,
  role
}: CourseBuyCardProps): JSX.Element {
  const t = useT();

  const includes = [
    t("detail.includeLifetime"),
    t("detail.includeCertificate"),
    t("detail.includeTests"),
    t("detail.includeMaterials")
  ];

  return (
    <div className="border border-hairline bg-card p-6 lg:sticky lg:top-28">
      <PriceText amount={course.price} className="text-3xl font-medium" />

      <div className="mt-6 space-y-3">
        {isSessionPending ? (
          <Skeleton className="h-12 w-full" />
        ) : !isSignedIn ? (
          <>
            <Button asChild className="w-full" size="lg">
              <Link search={{ courseSlug: course.slug }} to="/auth/sign-up">
                {t("detail.enroll")}
              </Link>
            </Button>
            <Button asChild className="w-full" size="lg" variant="outline">
              <Link to="/auth/sign-in">{t("detail.signIn")}</Link>
            </Button>
          </>
        ) : role !== "STUDENT" ? (
          <p className="text-base font-light text-muted">{t("detail.staffNotice")}</p>
        ) : enrollment?.accessGranted ? (
          <Button asChild className="w-full" size="lg">
            <Link params={{ courseId: course.id }} to="/dashboard/learn/$courseId">
              {t("detail.openPlayer")}
            </Link>
          </Button>
        ) : (
          <Button className="w-full" disabled={isEnrolling} onClick={onEnroll} size="lg">
            {isEnrolling ? t("detail.enrolling") : t("detail.enroll")}
          </Button>
        )}
      </div>

      <div className="mt-8 border-t border-hairline pt-6">
        <p className="label-mono text-xs uppercase text-muted-faint">{t("detail.includes")}</p>
        <ul className="mt-4 space-y-3">
          {includes.map((item) => (
            <li className="flex gap-3 text-base font-light text-ink-muted" key={item}>
              <span aria-hidden="true" className="text-accent">
                ✓
              </span>
              {item}
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
