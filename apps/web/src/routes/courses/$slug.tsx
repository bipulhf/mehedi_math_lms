import { createCourseReviewSchema } from "@mma/shared";
import { Link, createFileRoute, notFound } from "@tanstack/react-router";
import { Star } from "lucide-react";
import type { JSX } from "react";
import { useEffect, useState } from "react";
import { toast } from "sonner";

import { CourseStatusBadge } from "@/components/courses/course-status-badge";
import { FadeIn } from "@/components/common/fade-in";
import { RouteErrorView } from "@/components/common/route-error";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { useAuthSession } from "@/hooks/use-auth-session";
import { useZodForm } from "@/lib/forms/use-zod-form";
import type { CourseDetail, CourseTeacherSummary } from "@/lib/api/courses";
import type { StudentEnrollment } from "@/lib/api/enrollments";
import { createEnrollment, getMyCourseEnrollment } from "@/lib/api/enrollments";
import { breadcrumbJsonLd, courseJsonLd, seo } from "@/lib/seo";
import { SsrNotFoundError, ssrApiGet } from "@/lib/ssr-api";
import type { CourseReviewPublic } from "@/lib/api/reviews";
import { getCourseReviewSummary, listCourseReviews, submitCourseReview } from "@/lib/api/reviews";
import { siteConfig } from "@/lib/site";

export const Route = createFileRoute("/courses/$slug")({
  loader: async ({ params }) => {
    try {
      const course = await ssrApiGet<CourseDetail>(
        `/courses/by-slug/${encodeURIComponent(params.slug)}`
      );
      let reviewSummary: { average: number; count: number } | null = null;

      if (course.status === "PUBLISHED") {
        try {
          reviewSummary = await ssrApiGet<{ average: number; count: number }>(
            `/courses/${course.id}/review-summary`
          );
        } catch {
          reviewSummary = null;
        }
      }

      return { course, reviewSummary };
    } catch (error) {
      if (error instanceof SsrNotFoundError) {
        throw notFound();
      }

      throw error;
    }
  },
  head: ({ loaderData }) => {
    const data = loaderData;

    if (!data) {
      return seo({
        description: siteConfig.description,
        path: "/courses",
        title: "Course"
      });
    }

    const { course, reviewSummary } = data;
    const cover =
      course.coverImageUrl !== null && course.coverImageUrl.length > 0
        ? course.coverImageUrl
        : `/api/v1/og-image/course/${encodeURIComponent(course.slug)}`;

    return seo({
      description: course.description,
      jsonLd: [
        courseJsonLd(course, reviewSummary),
        breadcrumbJsonLd([
          { name: "Home", path: "/" },
          { name: "Courses", path: "/courses" },
          { name: course.category.name, path: `/categories/${course.category.slug}` },
          { name: course.title, path: `/courses/${course.slug}` }
        ])
      ],
      ogImageUrl: cover,
      ogType: "article",
      path: `/courses/${course.slug}`,
      title: course.title
    });
  },
  component: CourseDetailPage,
  errorComponent: RouteErrorView
});

function StarRow({ rating }: { rating: number }): JSX.Element {
  return (
    <div className="flex gap-0.5" role="img" aria-label={`Rating ${rating} out of 5`}>
      {[1, 2, 3, 4, 5].map((starNumber) => (
        <Star
          key={`rating-star-${rating}-${starNumber}`}
          className={`size-4 ${
            starNumber <= rating ? "fill-amber-400 text-amber-400" : "text-on-surface/24"
          }`}
        />
      ))}
    </div>
  );
}

function CourseDetailPage(): JSX.Element {
  const { course, reviewSummary: loaderReviewSummary } = Route.useLoaderData();
  const { isPending: isSessionPending, session } = useAuthSession();
  const [enrollment, setEnrollment] = useState<StudentEnrollment | null>(null);
  const [isSubmittingEnrollment, setIsSubmittingEnrollment] = useState(false);
  const [reviewSummary, setReviewSummary] = useState<{ average: number; count: number } | null>(
    loaderReviewSummary
  );
  const [reviews, setReviews] = useState<readonly CourseReviewPublic[]>([]);
  const [reviewsLoading, setReviewsLoading] = useState(false);

  const reviewForm = useZodForm({
    defaultValues: { comment: "", rating: 5 },
    schema: createCourseReviewSchema
  });

  useEffect(() => {
    setReviewSummary(loaderReviewSummary);
  }, [loaderReviewSummary]);

  useEffect(() => {
    if (isSessionPending || session?.session.role !== "STUDENT") {
      setEnrollment(null);
      return;
    }

    void (async () => {
      const currentEnrollment = await getMyCourseEnrollment(course.id);
      setEnrollment(currentEnrollment);
    })();
  }, [course.id, isSessionPending, session]);

  useEffect(() => {
    if (course.status !== "PUBLISHED") {
      setReviews([]);
      return;
    }

    void (async () => {
      setReviewsLoading(true);

      try {
        const [summary, page] = await Promise.all([
          getCourseReviewSummary(course.id),
          listCourseReviews(course.id, { limit: 20, page: 1 })
        ]);
        setReviewSummary(summary);
        setReviews(page.data);
      } catch {
        setReviewSummary(loaderReviewSummary);
        setReviews([]);
      } finally {
        setReviewsLoading(false);
      }
    })();
  }, [course.id, course.status, loaderReviewSummary]);

  const refreshReviews = async (): Promise<void> => {
    if (course.status !== "PUBLISHED") {
      return;
    }

    const [summary, page] = await Promise.all([
      getCourseReviewSummary(course.id),
      listCourseReviews(course.id, { limit: 20, page: 1 })
    ]);
    setReviewSummary(summary);
    setReviews(page.data);
  };

  const handleReviewSubmit = reviewForm.handleSubmit(async (values) => {
    try {
      await submitCourseReview(course.id, values);
      toast.success("Thanks for your review");
      reviewForm.reset({ comment: "", rating: 5 });
      await refreshReviews();
      if (session?.session.role === "STUDENT") {
        const next = await getMyCourseEnrollment(course.id);
        setEnrollment(next);
      }
    } catch {
      /* toast from api client */
    }
  });

  const handleEnroll = async (): Promise<void> => {
    setIsSubmittingEnrollment(true);

    try {
      const response = await createEnrollment({
        callbackOrigin: window.location.origin,
        courseId: course.id
      });

      if (response.requiresPayment && response.payment?.gatewayUrl) {
        window.location.href = response.payment.gatewayUrl;
        return;
      }

      toast.success("Course added to your dashboard");
      window.location.href = "/dashboard/my-courses";
    } finally {
      setIsSubmittingEnrollment(false);
    }
  };

  return (
    <div className="mx-auto flex w-full max-w-6xl flex-col gap-6 px-4 py-10">
      <FadeIn>
        <Card className="overflow-hidden">
          {course.coverImageUrl ? (
            <img
              alt={course.title}
              className="aspect-16/7 w-full object-cover"
              height={525}
              src={course.coverImageUrl}
              width={1200}
            />
          ) : (
            <div className="aspect-16/7 w-full bg-[radial-gradient(circle_at_top_left,rgba(96,99,238,0.18),transparent_55%),linear-gradient(135deg,rgba(27,27,31,0.04),rgba(96,99,238,0.1))]" />
          )}
          <CardContent className="space-y-4 p-6">
            <div className="flex flex-wrap items-center gap-3">
              <CourseStatusBadge status={course.status} />
              <span className="rounded-full bg-surface-container-low px-3 py-1 text-xs font-semibold text-on-surface">
                {course.category.name}
              </span>
              {course.isExamOnly ? (
                <span className="rounded-full bg-surface-container-low px-3 py-1 text-xs font-semibold text-on-surface">
                  Exam only
                </span>
              ) : null}
            </div>
            <div className="space-y-2">
              <h1 className="font-display text-4xl font-semibold tracking-[-0.03em] text-on-surface">
                {course.title}
              </h1>
              {reviewSummary && reviewSummary.count > 0 ? (
                <div className="flex flex-wrap items-center gap-3">
                  <StarRow rating={Math.round(reviewSummary.average)} />
                  <span className="text-sm text-on-surface/62">
                    {reviewSummary.average.toFixed(1)} · {reviewSummary.count} reviews
                  </span>
                </div>
              ) : null}
              <p className="max-w-4xl text-base leading-7 text-on-surface/70">
                {course.description}
              </p>
            </div>
          </CardContent>
        </Card>
      </FadeIn>

      <div className="grid gap-4 lg:grid-cols-[1.15fr_0.85fr]">
        <FadeIn>
          <Card>
            <CardHeader>
              <CardTitle>Teaching team</CardTitle>
              <CardDescription>
                Meet the teachers responsible for this learning experience.
              </CardDescription>
            </CardHeader>
            <CardContent className="grid gap-3">
              {course.teachers.map((teacher: CourseTeacherSummary) => (
                <div
                  key={teacher.id}
                  className="rounded-[calc(var(--radius)-0.125rem)] border border-outline-variant bg-surface-container-low p-4"
                >
                  {teacher.slug ? (
                    <p className="font-semibold text-on-surface">
                      <Link
                        className="text-secondary-container underline-offset-4 hover:underline"
                        to="/teachers/$slug"
                        params={{ slug: teacher.slug }}
                      >
                        {teacher.name}
                      </Link>
                    </p>
                  ) : (
                    <p className="font-semibold text-on-surface">{teacher.name}</p>
                  )}
                  <p className="text-sm text-on-surface/62">{teacher.email}</p>
                </div>
              ))}
            </CardContent>
          </Card>
        </FadeIn>

        <FadeIn delayClassName="animation-delay-100">
          <Card>
            <CardHeader>
              <CardTitle>Enrollment frame</CardTitle>
              <CardDescription>
                The enrollment and full player experience arrive in the next project phase.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="rounded-[calc(var(--radius)-0.125rem)] bg-surface-container-low p-4">
                <p className="text-sm text-on-surface/62">Price</p>
                <p className="mt-2 text-2xl font-semibold text-on-surface">
                  {Number(course.price) > 0 ? `BDT ${Number(course.price).toFixed(2)}` : "Free"}
                </p>
              </div>
              {isSessionPending ? (
                <div className="h-11 animate-pulse rounded-md bg-surface-container-low" />
              ) : !session ? (
                <div className="grid gap-3">
                  <Button asChild className="w-full">
                    <Link to="/auth/sign-up" search={{ courseSlug: course.slug }}>
                      Create a student account to enroll
                    </Link>
                  </Button>
                  <Button asChild className="w-full" variant="outline">
                    <Link to="/login">Already have an account? Sign in</Link>
                  </Button>
                </div>
              ) : session.session.role !== "STUDENT" ? (
                <Button className="w-full" disabled>
                  Student enrollment only
                </Button>
              ) : enrollment?.accessGranted ? (
                <Button asChild className="w-full">
                  <Link to="/dashboard/learn/$courseId" params={{ courseId: course.id }}>
                    Open course player
                  </Link>
                </Button>
              ) : (
                <Button
                  className="w-full"
                  disabled={isSubmittingEnrollment}
                  onClick={() => void handleEnroll()}
                >
                  {isSubmittingEnrollment
                    ? "Preparing checkout"
                    : enrollment?.latestPaymentStatus === "PENDING"
                      ? "Continue payment"
                      : Number(course.price) > 0
                        ? "Enroll and pay"
                        : "Enroll now"}
                </Button>
              )}
              {session?.session.role === "STUDENT" && enrollment ? (
                <p className="text-sm leading-6 text-on-surface/62">
                  {enrollment.accessGranted
                    ? "You already have access to this course."
                    : `Latest payment status: ${enrollment.latestPaymentStatus ?? "FREE"}.`}
                </p>
              ) : null}
            </CardContent>
          </Card>
        </FadeIn>
      </div>

      {course.status === "PUBLISHED" ? (
        <FadeIn>
          <Card>
            <CardHeader>
              <CardTitle>Learner reviews</CardTitle>
              <CardDescription>
                Transparent feedback from students who finished the journey.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {session?.session.role === "STUDENT" &&
              enrollment?.status === "COMPLETED" &&
              !enrollment.hasReview ? (
                <form
                  className="space-y-4 rounded-[calc(var(--radius)-0.125rem)] border border-outline-variant bg-surface-container-low p-4"
                  onSubmit={(event) => void handleReviewSubmit(event)}
                >
                  <div>
                    <p className="font-semibold text-on-surface">Share your experience</p>
                    <p className="text-sm text-on-surface/62">Ratings are public once submitted.</p>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="review-rating">Rating</Label>
                    <Select
                      id="review-rating"
                      value={String(reviewForm.watch("rating"))}
                      onChange={(event) =>
                        reviewForm.setValue("rating", Number(event.target.value), {
                          shouldValidate: true
                        })
                      }
                    >
                      <option value="5">5 — Excellent</option>
                      <option value="4">4 — Very good</option>
                      <option value="3">3 — Good</option>
                      <option value="2">2 — Fair</option>
                      <option value="1">1 — Needs improvement</option>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="review-comment">Comment (optional)</Label>
                    <Textarea
                      id="review-comment"
                      placeholder="What helped you the most?"
                      rows={4}
                      {...reviewForm.register("comment")}
                    />
                  </div>
                  <Button disabled={reviewForm.formState.isSubmitting} type="submit">
                    {reviewForm.formState.isSubmitting ? "Submitting" : "Submit review"}
                  </Button>
                </form>
              ) : null}

              {session?.session.role === "STUDENT" &&
              enrollment?.status === "COMPLETED" &&
              enrollment.hasReview ? (
                <p className="text-sm text-on-surface/68">
                  You already shared a review for this course.
                </p>
              ) : null}

              {reviewsLoading ? (
                <div className="h-24 animate-pulse rounded-md bg-surface-container-low" />
              ) : reviews.length === 0 ? (
                <p className="text-sm text-on-surface/62">
                  No reviews yet. Be the first after you complete the course.
                </p>
              ) : (
                <ul className="space-y-4">
                  {reviews.map((review) => (
                    <li
                      key={review.id}
                      className="rounded-[calc(var(--radius)-0.125rem)] border border-outline-variant bg-surface-container-low p-4"
                    >
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <p className="font-semibold text-on-surface">{review.authorName}</p>
                        <StarRow rating={review.rating} />
                      </div>
                      <p className="mt-1 text-xs text-on-surface/54">
                        {new Date(review.createdAt).toLocaleString()}
                      </p>
                      {review.comment ? (
                        <p className="mt-3 text-sm leading-7 text-on-surface/80">
                          {review.comment}
                        </p>
                      ) : null}
                    </li>
                  ))}
                </ul>
              )}
            </CardContent>
          </Card>
        </FadeIn>
      ) : null}
    </div>
  );
}
