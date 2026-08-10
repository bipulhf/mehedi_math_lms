import { Link, createFileRoute, notFound } from "@tanstack/react-router";
import type { JSX, ReactNode } from "react";

import { PublicLayout, PublicSection } from "@/components/layout/public-layout";
import { RouteErrorView } from "@/components/common/route-error";
import { Avatar } from "@/components/ui/avatar";
import { BackButton } from "@/components/ui/back-button";
import { DotPatch, FaintFormula, QuarterArc, RingedWord } from "@/components/ui/doodles";
import { EmptyState } from "@/components/ui/empty-state";
import { PriceText } from "@/components/ui/price-text";
import { ResponsiveImage } from "@/components/ui/responsive-image";
import { RichTextContent } from "@/components/ui/rich-text-content";
import { Skeleton } from "@/components/ui/skeleton";
import { SectionHeading } from "@/components/ui/section-heading";
import type { PublicTeacherProfileData, TeacherCourseSummary } from "@/lib/api/profiles";
import { useFormat, useT } from "@/lib/i18n/locale-context";
import { breadcrumbJsonLd, seo, teacherPersonJsonLd } from "@/lib/seo";
import { SsrNotFoundError, ssrApiGet } from "@/lib/ssr-api";
import { stripHtml } from "@/lib/html";
import { siteConfig } from "@/lib/site";

export const Route = createFileRoute("/teachers/$slug")({
  loader: async ({ params }) => {
    try {
      return await ssrApiGet<PublicTeacherProfileData>(
        `/profiles/teachers/by-slug/${encodeURIComponent(params.slug)}`
      );
    } catch (error) {
      if (error instanceof SsrNotFoundError) {
        throw notFound();
      }

      throw error;
    }
  },
  head: ({ loaderData, params }) => {
    const profile = loaderData;

    if (!profile) {
      return seo({ description: siteConfig.description, path: "/teachers", title: "Teacher" });
    }

    const pathSlug = profile.user.slug ?? params.slug;
    const photo = profile.user.image ?? profile.teacherProfile?.profilePhoto ?? null;
    const og: string =
      photo !== null && photo.length > 0
        ? photo
        : `/api/v1/og-image/teacher/${encodeURIComponent(pathSlug)}`;

    return seo({
      description:
        (profile.teacherProfile?.bio ? stripHtml(profile.teacherProfile.bio).trim() : undefined) ??
        `Courses and teaching profile for ${profile.user.name}.`,
      jsonLd: [
        teacherPersonJsonLd({
          bio: profile.teacherProfile?.bio ?? null,
          courses: profile.courses.map((course) => ({ slug: course.slug, title: course.title })),
          image: photo,
          name: profile.user.name,
          slug: profile.user.slug
        }),
        breadcrumbJsonLd([
          { name: "Home", path: "/" },
          { name: "Teachers", path: "/teachers" },
          { name: profile.user.name, path: `/teachers/${pathSlug}` }
        ])
      ],
      ogImageUrl: og,
      path: `/teachers/${pathSlug}`,
      title: profile.user.name
    });
  },
  component: TeacherProfilePage,
  errorComponent: RouteErrorView,
  pendingComponent: TeacherProfileSkeleton
});

/**
 * The teacher page's own shape — hero band with the portrait beside the name,
 * then the course grid.
 *
 * It used to borrow `ProfilePageSkeleton`, which is the dashboard's profile
 * *editor*: a stack of form cards, with no header or footer around it. The page
 * that arrived looked nothing like the one being promised.
 */
function TeacherProfileSkeleton(): JSX.Element {
  return (
    <PublicLayout>
      <section className="border-b border-hairline">
        <div className="mx-auto grid w-full max-w-[90rem] gap-10 px-4 py-14 sm:px-8 lg:grid-cols-[196px_1fr] lg:px-14 lg:py-20">
          <Skeleton className="size-40 rounded-full lg:size-[196px]" />
          <div className="min-w-0 space-y-6">
            <Skeleton className="h-10 w-3/5" />
            <Skeleton className="h-5 w-2/5" />
            <div className="space-y-3">
              <Skeleton className="h-4 w-full max-w-[56ch]" />
              <Skeleton className="h-4 w-4/5 max-w-[56ch]" />
            </div>
            <div className="flex flex-wrap gap-x-11 gap-y-6 border-t border-hairline pt-7">
              {Array.from({ length: 3 }, (_, index) => (
                <div className="space-y-2" key={index}>
                  <Skeleton className="h-7 w-16" />
                  <Skeleton className="h-4 w-20" />
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      <PublicSection className="space-y-8">
        <Skeleton className="h-6 w-40" />
        <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 3 }, (_, index) => (
            <Skeleton className="h-52 w-full" key={index} />
          ))}
        </div>
      </PublicSection>
    </PublicLayout>
  );
}

function TeacherProfilePage(): JSX.Element {
  const profile: PublicTeacherProfileData = Route.useLoaderData();
  const t = useT();
  const format = useFormat();
  const teacherProfile = profile.teacherProfile;

  // The design rings the surname. Splitting on the last space keeps that
  // working for a Bangla name and an English one alike, and a single-word name
  // simply gets the whole thing ringed.
  const nameParts = profile.user.name.trim().split(/\s+/);
  const ringed = nameParts.length > 1 ? nameParts[nameParts.length - 1] : profile.user.name;
  const beforeRing = nameParts.length > 1 ? nameParts.slice(0, -1).join(" ") : "";

  const figures: readonly { label: string; value: string }[] = [
    {
      label: t("common.courses"),
      value: format.number(profile.metrics.publishedCourseCount)
    },
    { label: t("common.reviews"), value: format.number(profile.metrics.reviewCount) },
    ...(profile.metrics.reviewAverage === null
      ? []
      : [
          {
            label: t("common.rating"),
            value: format.rating(profile.metrics.reviewAverage)
          }
        ])
  ];

  return (
    <PublicLayout>
      <section className="relative overflow-hidden border-b border-hairline">
        <DotPatch className="-left-4 bottom-6 hidden lg:block" />
        <QuarterArc className="right-20 top-12 hidden lg:block" />
        <FaintFormula className="-bottom-10 right-0 hidden lg:block" glyph="π" rotate={8} />

        <div className="mx-auto grid w-full max-w-[90rem] gap-10 px-4 py-14 sm:px-8 lg:grid-cols-[196px_1fr] lg:px-14 lg:py-20">
          <Avatar
            className="size-40 lg:size-[196px]"
            name={profile.user.name}
            photo={teacherProfile?.profilePhoto ?? profile.user.image ?? null}
            sizes="196px"
          />

          <div className="space-y-6">
            <BackButton to="/teachers" />
            <h1 className="text-3xl font-medium leading-tight tracking-tight text-ink sm:text-4xl lg:text-[2.75rem]">
              {beforeRing.length > 0 ? `${beforeRing} ` : ""}
              <RingedWord>{ringed}</RingedWord>
            </h1>

            {teacherProfile?.specializations ? (
              <RichTextContent
                className="text-lg text-muted"
                html={teacherProfile.specializations}
              />
            ) : null}

            {teacherProfile?.bio ? (
              <RichTextContent
                className="max-w-[56ch] text-lg font-light leading-relaxed text-muted"
                html={teacherProfile.bio}
              />
            ) : (
              <p className="max-w-[56ch] text-lg font-light leading-relaxed text-muted">
                {t("teacher.noBio")}
              </p>
            )}

            <dl className="flex flex-wrap gap-x-11 gap-y-6 border-t border-hairline pt-7">
              {figures.map((figure) => (
                <div key={figure.label}>
                  <dd className="text-2xl font-medium text-ink sm:text-3xl">{figure.value}</dd>
                  <dt className="text-base font-light text-muted-light">{figure.label}</dt>
                </div>
              ))}
            </dl>
          </div>
        </div>
      </section>

      <PublicSection className="space-y-8">
        <SectionHeading title={t("teacher.courses")} />

        {profile.courses.length === 0 ? (
          <EmptyState message={t("teacher.noCourses")} />
        ) : (
          <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {profile.courses.map((course) => (
              <TeacherCourseCard course={course} key={course.id} />
            ))}
          </div>
        )}
      </PublicSection>

      {teacherProfile?.qualifications || teacherProfile?.socialLinks || teacherProfile?.phone ? (
        <PublicSection className="grid gap-6 border-t border-hairline lg:grid-cols-3">
          {teacherProfile.qualifications ? (
            <DetailBlock title={t("detail.qualifications")}>
              <RichTextContent html={teacherProfile.qualifications} />
            </DetailBlock>
          ) : null}
          {teacherProfile.socialLinks ? (
            <DetailBlock title={t("teacher.links")}>
              <RichTextContent html={teacherProfile.socialLinks} />
            </DetailBlock>
          ) : null}
          {teacherProfile.phone ? (
            <DetailBlock title={t("teacher.phone")}>
              <a className="transition-colors hover:text-accent" href={`tel:${teacherProfile.phone}`}>
                {format.digits(teacherProfile.phone)}
              </a>
            </DetailBlock>
          ) : null}
        </PublicSection>
      ) : null}
    </PublicLayout>
  );
}

function DetailBlock({
  children,
  title
}: {
  children: ReactNode;
  title: string;
}): JSX.Element {
  return (
    <div className="border border-hairline bg-card p-6">
      <p className="label-mono text-xs uppercase text-muted-faint">{title}</p>
      {/* A div, not a p: qualifications come from the rich text editor, and a
          rendered paragraph inside a paragraph is closed by the parser. */}
      <div className="mt-3 break-words text-base font-light leading-relaxed text-ink-muted">
        {children}
      </div>
    </div>
  );
}

function TeacherCourseCard({ course }: { course: TeacherCourseSummary }): JSX.Element {
  const t = useT();
  const format = useFormat();

  return (
    <Link
      className="group flex h-full flex-col border border-hairline bg-card transition-colors hover:border-line-strong"
      params={{ slug: course.slug }}
      to="/courses/$slug"
    >
      <div className="relative flex h-[150px] items-center justify-center overflow-hidden bg-placeholder-fill">
        {course.coverImageUrl ? (
          <ResponsiveImage
            alt={course.title}
            className="size-full object-cover transition-transform duration-500 ease-out group-hover:scale-105"
            sizes="(min-width: 1024px) 33vw, (min-width: 640px) 45vw, 100vw"
            src={course.coverImageUrl}
          />
        ) : (
          <span className="label-mono text-xs uppercase text-muted-faint transition-transform duration-300 group-hover:scale-105">
            {t("course.noThumbnail")}
          </span>
        )}
      </div>

      <div className="flex flex-1 flex-col gap-3 p-5">
        <p className="text-lg font-medium leading-snug text-ink">{course.title}</p>
        <RichTextContent
          className="line-clamp-3 text-base font-light leading-relaxed text-muted"
          html={course.description}
        />
        <div className="mt-auto flex items-end justify-between border-t border-hairline-faint pt-4">
          <PriceText amount={course.price} />
          <span className="text-sm text-muted-light">
            {t("course.reviews", { count: format.number(course.reviewCount) })}
          </span>
        </div>
      </div>
    </Link>
  );
}
