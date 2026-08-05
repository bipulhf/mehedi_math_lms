import { Link, createFileRoute, notFound } from "@tanstack/react-router";
import { useInfiniteQuery, useQuery } from "@tanstack/react-query";
import type { InfiniteData, QueryKey } from "@tanstack/react-query";
import { useState, type JSX } from "react";
import { toast } from "sonner";

import { CourseBuyCard, CourseMobileBuyBar } from "@/components/courses/course-buy-card";
import type { AppliedCoupon } from "@/components/courses/course-coupon-field";
import { CourseCurriculum } from "@/components/courses/course-curriculum";
import { CourseFacts } from "@/components/courses/course-facts";
import { CourseHero } from "@/components/courses/course-hero";
import { CoursePreviewDialog } from "@/components/courses/course-preview-dialog";
import { CourseReviews } from "@/components/courses/course-reviews";
import { CourseDetailSkeleton } from "@/components/common/skeletons";
import { PublicLayout } from "@/components/layout/public-layout";
import { RouteErrorView } from "@/components/common/route-error";
import { Avatar } from "@/components/ui/avatar";
import { EmptyState } from "@/components/ui/empty-state";
import { RichTextContent } from "@/components/ui/rich-text-content";
import { Tabs } from "@/components/ui/tabs";
import { useAuthSession } from "@/hooks/use-auth-session";
import type { CourseOutlineChapter } from "@/lib/api/content";
import type { CourseDetail, CourseTeacherSummary } from "@/lib/api/courses";
import type { PaginatedApiResponse } from "@/lib/api/client";
import type { StudentEnrollment } from "@/lib/api/enrollments";
import { createEnrollment, getMyCourseEnrollment } from "@/lib/api/enrollments";
import type { CourseReviewPublic } from "@/lib/api/reviews";
import { getCourseReviewSummary, listCourseReviews } from "@/lib/api/reviews";
import { useT } from "@/lib/i18n/locale-context";
import { queryKeys } from "@/lib/query/keys";
import { breadcrumbJsonLd, courseJsonLd, seo } from "@/lib/seo";
import { SsrNotFoundError, ssrApiGet } from "@/lib/ssr-api";
import { siteConfig } from "@/lib/site";

type DetailTab = "curriculum" | "teacher" | "reviews";

const REVIEWS_PER_PAGE = 20;

export const Route = createFileRoute("/courses/$slug")({
  loader: async ({ params }) => {
    try {
      const course = await ssrApiGet<CourseDetail>(
        `/courses/by-slug/${encodeURIComponent(params.slug)}`
      );

      let reviewSummary: { average: number; count: number } | null = null;
      let content: readonly CourseOutlineChapter[] = [];

      const promises: Promise<void>[] = [];

      if (course.status === "PUBLISHED") {
        promises.push(
          ssrApiGet<{ average: number; count: number }>(`/courses/${course.id}/review-summary`)
            .then((res) => {
              reviewSummary = res;
            })
            .catch(() => {
              reviewSummary = null;
            })
        );
        // The outline, not the content: `/content` requires a session, so an
        // anonymous visitor used to land on an empty class list — which is the
        // page's main selling surface.
        promises.push(
          ssrApiGet<readonly CourseOutlineChapter[]>(`/courses/${course.id}/outline`)
            .then((res) => {
              content = res;
            })
            .catch(() => {
              content = [];
            })
        );
      }

      await Promise.all(promises);

      return { course, content, reviewSummary };
    } catch (error) {
      if (error instanceof SsrNotFoundError) {
        throw notFound();
      }

      throw error;
    }
  },
  head: ({ loaderData }) => {
    if (!loaderData) {
      return seo({ description: siteConfig.description, path: "/courses", title: "Course" });
    }

    const { course, reviewSummary } = loaderData;
    const cover =
      course.coverImageUrl || `/api/v1/og-image/course/${encodeURIComponent(course.slug)}`;

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
  errorComponent: RouteErrorView,
  // Slow navigations show the page's own shape; fast ones skip it.
  pendingComponent: () => (
    <PublicLayout>
      <CourseDetailSkeleton />
    </PublicLayout>
  )
});

function CourseDetailPage(): JSX.Element {
  const { course, content, reviewSummary: loaderReviewSummary } = Route.useLoaderData();
  const t = useT();
  const { isPending: isSessionPending, session } = useAuthSession();
  const [tab, setTab] = useState<DetailTab>("curriculum");
  const [isEnrolling, setIsEnrolling] = useState(false);
  const [previewLessonId, setPreviewLessonId] = useState<string | null>(null);
  // Held by the page rather than the buy card, because the pinned phone bar
  // quotes the same Payable and the enrol call has to carry the code.
  const [appliedCoupon, setAppliedCoupon] = useState<AppliedCoupon | null>(null);

  const isStudent = !isSessionPending && session?.session.role === "STUDENT";

  const { data: enrollment = null } = useQuery<StudentEnrollment | null>({
    enabled: isStudent,
    queryFn: async () => getMyCourseEnrollment(course.id),
    queryKey: queryKeys.enrollments.course(course.id)
  });

  // The loader already put a summary in the page for SEO; the query only
  // refines it, so a failed refresh falls back rather than blanking the rating.
  const summaryQuery = useQuery({
    enabled: course.status === "PUBLISHED",
    queryFn: async () => getCourseReviewSummary(course.id),
    queryKey: queryKeys.reviews.courseSummary(course.id)
  });
  const reviewSummary = summaryQuery.data ?? loaderReviewSummary;

  const reviewPageQuery = useInfiniteQuery<
    PaginatedApiResponse<CourseReviewPublic>,
    Error,
    InfiniteData<PaginatedApiResponse<CourseReviewPublic>, number>,
    QueryKey,
    number
  >({
    enabled: course.status === "PUBLISHED",
    getNextPageParam: (lastPage) =>
      lastPage.pagination.page < lastPage.pagination.pages
        ? lastPage.pagination.page + 1
        : undefined,
    initialPageParam: 1,
    queryFn: async ({ pageParam }) =>
      listCourseReviews(course.id, { limit: REVIEWS_PER_PAGE, page: pageParam }),
    queryKey: queryKeys.reviews.courseList(course.id)
  });

  const reviews: readonly CourseReviewPublic[] =
    reviewPageQuery.data?.pages.flatMap((page) => page.data) ?? [];
  // The hero and the buy card both offer "watch a free class", and both open
  // this one — the first lesson in outline order that anybody may watch.
  const firstPreviewLessonId =
    (content as readonly CourseOutlineChapter[])
      .flatMap((chapter) => chapter.lessons)
      .find((lesson) => lesson.isPreview)?.id ?? null;

  const handleEnroll = async (): Promise<void> => {
    setIsEnrolling(true);

    try {
      const response = await createEnrollment({
        callbackOrigin: window.location.origin,
        // Re-priced server-side from the course row; what the card quoted is
        // only a quote. ADR-0013.
        ...(appliedCoupon ? { couponCode: appliedCoupon.code } : {}),
        courseId: course.id
      });

      if (response.requiresPayment && response.payment?.gatewayUrl) {
        window.location.href = response.payment.gatewayUrl;

        return;
      }

      toast.success(t("detail.openPlayer"));
      window.location.href = "/dashboard/my-courses";
    } finally {
      setIsEnrolling(false);
    }
  };

  return (
    <PublicLayout>
      <CourseHero
        course={course}
        firstPreviewLessonId={firstPreviewLessonId}
        onPreview={setPreviewLessonId}
        reviewSummary={reviewSummary}
      />
      <CourseFacts course={course} reviewSummary={reviewSummary} />

      {/* `pb-28` on the phone: the buy bar is pinned to the bottom edge and
          would otherwise cover the last review. */}
      <div className="mx-auto grid w-full max-w-[90rem] gap-10 px-4 pb-28 pt-10 sm:px-8 lg:grid-cols-[1fr_380px] lg:gap-14 lg:px-14 lg:pb-14 lg:pt-14">
        <div className="min-w-0 space-y-8">
          <div className="space-y-4">
            <h2 className="text-xl font-medium text-ink">{t("detail.about")}</h2>
            <RichTextContent
              className="max-w-[68ch] text-base font-light leading-relaxed text-muted"
              html={course.description}
            />
          </div>

          <Tabs
            label={course.title}
            onChange={setTab}
            tabs={[
              { label: t("detail.tabCurriculum"), value: "curriculum" },
              { label: t("detail.tabTeacher"), value: "teacher" },
              { label: t("detail.tabReviews"), value: "reviews" }
            ]}
            value={tab}
          />

          {tab === "curriculum" ? (
            <CourseCurriculum chapters={content} onPreview={setPreviewLessonId} />
          ) : null}

          {tab === "teacher" ? (
            course.teachers.length === 0 ? (
              <EmptyState message={t("empty.generic")} />
            ) : (
              <ul className="border-t border-hairline">
                {course.teachers.map((teacher: CourseTeacherSummary) => (
                  <li
                    className="flex flex-col gap-5 border-b border-hairline-faint py-6 sm:flex-row"
                    key={teacher.id}
                  >
                    <Avatar className="size-24" name={teacher.name} photo={teacher.profilePhoto} />
                    <div className="space-y-3">
                      <p className="text-xl font-medium text-ink">{teacher.name}</p>
                      {teacher.slug === null ? null : (
                        <Link
                          className="inline-block border-b border-line-strong pb-0.5 text-base text-ink transition-colors hover:border-accent hover:text-accent"
                          params={{ slug: teacher.slug }}
                          to="/teachers/$slug"
                        >
                          {t("detail.viewTeacherPage")}
                        </Link>
                      )}
                    </div>
                  </li>
                ))}
              </ul>
            )
          ) : null}

          {tab === "reviews" ? (
            <CourseReviews
              hasNextPage={reviewPageQuery.hasNextPage}
              isFetchingNextPage={reviewPageQuery.isFetchingNextPage}
              isPending={reviewPageQuery.isPending}
              onLoadMore={() => void reviewPageQuery.fetchNextPage()}
              reviews={reviews}
              summary={reviewSummary}
            />
          ) : null}
        </div>

        <CourseBuyCard
          appliedCoupon={appliedCoupon}
          course={course}
          enrollment={enrollment}
          firstPreviewLessonId={firstPreviewLessonId}
          isEnrolling={isEnrolling}
          isSessionPending={isSessionPending}
          isSignedIn={Boolean(session)}
          onCouponChange={setAppliedCoupon}
          onEnroll={() => void handleEnroll()}
          onPreview={setPreviewLessonId}
          reviewSummary={reviewSummary}
          role={session?.session.role}
        />
      </div>

      <CourseMobileBuyBar
        appliedCoupon={appliedCoupon}
        course={course}
        enrollment={enrollment}
        isEnrolling={isEnrolling}
        isSessionPending={isSessionPending}
        isSignedIn={Boolean(session)}
        onEnroll={() => void handleEnroll()}
        role={session?.session.role}
      />

      {/* One dialog for the page: the hero, the buy card and the class list all
          open the same free class through it. */}
      <CoursePreviewDialog lessonId={previewLessonId} onClose={() => setPreviewLessonId(null)} />
    </PublicLayout>
  );
}
