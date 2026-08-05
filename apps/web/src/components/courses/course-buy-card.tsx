import { Link } from "@tanstack/react-router";
import { TicketPercent } from "lucide-react";
import type { JSX } from "react";

import { CourseCouponField, type AppliedCoupon } from "@/components/courses/course-coupon-field";
import { Button } from "@/components/ui/button";
import { RatingStars } from "@/components/ui/rating-stars";
import { RingedPlay } from "@/components/ui/doodles";
import { PriceText } from "@/components/ui/price-text";
import { Skeleton } from "@/components/ui/skeleton";
import type { CourseDetail } from "@/lib/api/courses";
import type { StudentEnrollment } from "@/lib/api/enrollments";
import { useFormat, useT } from "@/lib/i18n/locale-context";

/** What decides the button. A coupon changes the price, never the action. */
interface CoursePrimaryActionProps {
  readonly course: CourseDetail;
  readonly enrollment: StudentEnrollment | null;
  readonly isEnrolling: boolean;
  readonly isSessionPending: boolean;
  readonly isSignedIn: boolean;
  readonly onEnroll: () => void;
  readonly role: string | undefined;
}

interface CourseActionProps extends CoursePrimaryActionProps {
  /** Set once a code has been checked; the Payable then replaces the price. */
  readonly appliedCoupon: AppliedCoupon | null;
}

interface CourseBuyCardProps extends CourseActionProps {
  /** Opens the first free class from the rail, when the course keeps one. */
  readonly firstPreviewLessonId: string | null;
  readonly onCouponChange: (coupon: AppliedCoupon | null) => void;
  readonly onPreview: (lessonId: string) => void;
  readonly reviewSummary: { average: number; count: number } | null;
}

/**
 * The one action for this course, in whatever state the visitor is in.
 *
 * Extracted so the sidebar card and the phone bar cannot drift apart: a visitor
 * who is signed out must be offered the same thing at 360px as at 1440px, and
 * an enrolled student must never be shown an Enrol button in one of the two.
 */
export function CoursePrimaryAction({
  course,
  enrollment,
  isEnrolling,
  isSessionPending,
  isSignedIn,
  onEnroll,
  role
}: CoursePrimaryActionProps): JSX.Element {
  const t = useT();

  if (isSessionPending) {
    return <Skeleton className="h-12 w-full" />;
  }

  if (!isSignedIn) {
    return (
      <Button asChild className="w-full" size="lg">
        <Link search={{ courseSlug: course.slug }} to="/auth/sign-up">
          {t("detail.enroll")}
        </Link>
      </Button>
    );
  }

  if (role !== "STUDENT") {
    return <p className="text-base font-light text-muted">{t("detail.staffNotice")}</p>;
  }

  if (enrollment?.accessGranted) {
    return (
      <Button asChild className="w-full" size="lg">
        <Link params={{ courseId: course.id }} to="/dashboard/learn/$courseId">
          {t("detail.openPlayer")}
        </Link>
      </Button>
    );
  }

  return (
    <Button className="w-full" disabled={isEnrolling} onClick={onEnroll} size="lg">
      {isEnrolling ? t("detail.enrolling") : t("detail.enroll")}
    </Button>
  );
}

/**
 * The right rail. Price, one action, the free class, and what the course
 * includes.
 *
 * The previous version printed a struck-through "original" price of
 * `price × 2.5` and a "65% OFF" badge. Neither existed: the schema holds one
 * price and no discount, so both were invented and shown to buyers as fact.
 * They are gone — GENEX_MIGRATION.md §2 cuts the discount, the seat count, the
 * batch date and the countdown for the same reason.
 */
export function CourseBuyCard({
  appliedCoupon,
  course,
  enrollment,
  firstPreviewLessonId,
  isEnrolling,
  isSessionPending,
  isSignedIn,
  onCouponChange,
  onEnroll,
  onPreview,
  reviewSummary,
  role
}: CourseBuyCardProps): JSX.Element {
  const t = useT();
  const format = useFormat();
  const publicCoupon = course.publicCoupon ?? null;
  // The code box needs a session — the preview endpoint is students-only, so a
  // visitor sees the advertised code and nothing to type into until they join.
  const canApplyCoupon =
    !isSessionPending &&
    isSignedIn &&
    role === "STUDENT" &&
    !enrollment?.accessGranted &&
    Number(course.price) > 0;

  const includes = [
    t("detail.includeLifetime"),
    t("detail.includeCertificate"),
    t("detail.includeTests"),
    t("detail.includeMaterials")
  ];

  return (
    <div className="border border-hairline bg-card p-4 sm:p-6 lg:sticky lg:top-28">
      <PriceText
        amount={appliedCoupon ? appliedCoupon.payable : course.price}
        className="text-3xl font-medium"
      />

      {reviewSummary && reviewSummary.count > 0 ? (
        <div className="mt-2 flex items-center gap-2 text-sm text-muted-light">
          <RatingStars rating={reviewSummary.average} />
          <span>
            {t("detail.reviewSummary", {
              average: format.rating(reviewSummary.average),
              count: format.number(reviewSummary.count)
            })}
          </span>
        </div>
      ) : null}

      <div className="mt-6 space-y-3">
        <CoursePrimaryAction
          course={course}
          enrollment={enrollment}
          isEnrolling={isEnrolling}
          isSessionPending={isSessionPending}
          isSignedIn={isSignedIn}
          onEnroll={onEnroll}
          role={role}
        />

        {isSessionPending || isSignedIn ? null : (
          <Button asChild className="w-full" size="lg" variant="outline">
            <Link to="/auth/sign-in">{t("detail.signIn")}</Link>
          </Button>
        )}

        {/* Second in the stack, never styled as the primary: watching a class
            is the step before paying, not an alternative to it. */}
        {firstPreviewLessonId === null ? null : (
          <button
            className="flex min-h-11 w-full items-center justify-center gap-2.5 border-b border-line-strong pb-1 text-base text-ink transition-colors hover:border-accent hover:text-accent"
            onClick={() => onPreview(firstPreviewLessonId)}
            type="button"
          >
            <RingedPlay />
            <span>
              {t("course.freeLessons", {
                count: format.number(course.stats.freeLessonCount)
              })}
            </span>
          </button>
        )}
      </div>

      {canApplyCoupon ? (
        <div className="mt-6">
          <CourseCouponField
            applied={appliedCoupon}
            courseId={course.id}
            onApplied={onCouponChange}
            publicDiscountAmount={publicCoupon?.discountAmount ?? null}
            publicCode={publicCoupon?.code ?? null}
          />
        </div>
      ) : publicCoupon ? (
        // Signed out, or staff: the code is worth knowing, but there is nothing
        // here to type it into yet.
        <div className="mt-6 border border-accent/30 bg-accent/5 p-3.5 sm:p-4">
          <div className="flex items-start gap-3">
            <div
              aria-hidden="true"
              className="flex size-9 shrink-0 items-center justify-center border border-accent/25 bg-card text-accent"
            >
              <TicketPercent className="size-4" />
            </div>
            <p className="min-w-0 pt-0.5 text-base font-medium leading-snug text-ink">
              {t("coupon.bannerTitle", {
                amount: format.currency(publicCoupon.discountAmount),
                code: publicCoupon.code
              })}
            </p>
          </div>
          <div className="mt-3 flex items-center justify-between gap-3 border border-dashed border-accent/50 bg-card px-3 py-2.5">
            <span className="label-mono text-[0.7rem] uppercase text-muted-faint">
              {t("coupon.code")}
            </span>
            <span className="truncate font-mono text-sm font-medium text-ink">
              {publicCoupon.code}
            </span>
          </div>
        </div>
      ) : null}

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

/**
 * The same price and the same action, pinned to the bottom of a phone.
 *
 * Below `lg` the buy card sits under the class list, the teacher and every
 * review — a visitor who has decided has to scroll past the whole page to act.
 * The page reserves room for this so the bar never covers its last line.
 */
export function CourseMobileBuyBar(props: CourseActionProps): JSX.Element | null {
  // Staff see a sentence rather than a button, and a sentence does not belong
  // in a pinned bar.
  if (!props.isSessionPending && props.isSignedIn && props.role !== "STUDENT") {
    return null;
  }

  return (
    <div className="fixed inset-x-0 bottom-0 z-30 border-t border-hairline bg-paper lg:hidden">
      <div className="flex items-center gap-4 px-4 py-3 sm:px-8">
        {/* The Payable, once a code is applied: the bar and the card must never
            quote two different numbers for the same purchase. */}
        <PriceText
          amount={props.appliedCoupon ? props.appliedCoupon.payable : props.course.price}
          className="shrink-0 text-xl font-medium"
        />
        <div className="min-w-0 flex-1">
          <CoursePrimaryAction {...props} />
        </div>
      </div>
    </div>
  );
}
