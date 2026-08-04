import { Link, createFileRoute, notFound } from "@tanstack/react-router";
import { useInfiniteQuery, useQuery } from "@tanstack/react-query";
import type { InfiniteData, QueryKey } from "@tanstack/react-query";
import { useState, type JSX } from "react";
import { toast } from "sonner";

import { CourseBuyCard } from "@/components/courses/course-buy-card";
import { CourseCurriculum } from "@/components/courses/course-curriculum";
import { courseMetaParts } from "@/components/courses/course-meta";
import { CourseReviews } from "@/components/courses/course-reviews";
import { CourseDetailSkeleton } from "@/components/common/skeletons";
import { PublicLayout } from "@/components/layout/public-layout";
import { RouteErrorView } from "@/components/common/route-error";
import { Avatar } from "@/components/ui/avatar";
import { EmptyState } from "@/components/ui/empty-state";
import { Pill } from "@/components/ui/pill";
import { ResponsiveImage } from "@/components/ui/responsive-image";
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
import { useFormat, useT } from "@/lib/i18n/locale-context";
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
  const format = useFormat();
  const { isPending: isSessionPending, session } = useAuthSession();
  const [tab, setTab] = useState<DetailTab>("curriculum");
  const [isEnrolling, setIsEnrolling] = useState(false);

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
  const meta = courseMetaParts(course.stats, t, format);

  const handleEnroll = async (): Promise<void> => {
    setIsEnrolling(true);

    try {
      const response = await createEnrollment({
        callbackOrigin: window.location.origin,
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
      <div className="mx-auto grid w-full max-w-[90rem] gap-10 px-4 py-10 sm:px-8 lg:grid-cols-[1fr_380px] lg:gap-14 lg:px-14 lg:py-14">
        <div className="min-w-0 space-y-8">
          <div className="space-y-5">
            <p className="label-mono text-xs uppercase text-muted-faint">{course.category.name}</p>
            <h1 className="max-w-[22ch] text-3xl font-medium leading-tight tracking-tight text-ink sm:text-4xl lg:text-[2.75rem]">
              {course.title}
            </h1>
            <RichTextContent
              className="max-w-[56ch] text-lg font-light leading-relaxed text-muted"
              html={course.description}
            />

            <div className="flex flex-wrap gap-2.5">
              {meta.map((part) => (
                <Pill key={part}>{part}</Pill>
              ))}
              {course.isExamOnly ? <Pill isAccent>{t("course.examOnly")}</Pill> : null}
              {reviewSummary && reviewSummary.count > 0 ? (
                <Pill>
                  {t("detail.reviewSummary", {
                    average: format.rating(reviewSummary.average),
                    count: format.number(reviewSummary.count)
                  })}
                </Pill>
              ) : null}
            </div>
          </div>

          <div className="flex aspect-video items-center justify-center overflow-hidden bg-placeholder-fill">
            {course.coverImageUrl ? (
              <ResponsiveImage
                alt={course.title}
                className="size-full object-cover"
                fetchPriority="high"
                loading="eager"
                sizes="(min-width: 1024px) 62vw, 100vw"
                src={course.coverImageUrl}
              />
            ) : (
              <span className="label-mono text-xs uppercase text-muted-faint">
                {t("course.noThumbnail")}
              </span>
            )}
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

          {tab === "curriculum" ? <CourseCurriculum chapters={content} /> : null}

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
          course={course}
          enrollment={enrollment}
          isEnrolling={isEnrolling}
          isSessionPending={isSessionPending}
          isSignedIn={Boolean(session)}
          onEnroll={() => void handleEnroll()}
          role={session?.session.role}
        />
      </div>
    </PublicLayout>
  );
}
