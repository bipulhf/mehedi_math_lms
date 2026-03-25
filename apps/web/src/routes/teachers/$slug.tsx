import { Link, createFileRoute, notFound } from "@tanstack/react-router";
import type { JSX } from "react";

import { FadeIn } from "@/components/common/fade-in";
import { RouteErrorView } from "@/components/common/route-error";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import type { PublicTeacherProfileData, TeacherCourseSummary } from "@/lib/api/profiles";
import { breadcrumbJsonLd, seo, teacherPersonJsonLd } from "@/lib/seo";
import { SsrNotFoundError, ssrApiGet } from "@/lib/ssr-api";
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
      return seo({
        description: siteConfig.description,
        path: "/teachers",
        title: "Teacher"
      });
    }

    const pathSlug = profile.user.slug ?? params.slug;
    const photo =
      profile.user.image ??
      profile.teacherProfile?.profilePhoto ??
      null;
    const og: string =
      photo !== null && photo.length > 0
        ? photo
        : `/api/v1/og-image/teacher/${encodeURIComponent(pathSlug)}`;

    return seo({
      description:
        profile.teacherProfile?.bio?.trim() ?? `Courses and teaching profile for ${profile.user.name}.`,
      jsonLd: [
        teacherPersonJsonLd({
          bio: profile.teacherProfile?.bio ?? null,
          courses: profile.courses.map((c) => ({ slug: c.slug, title: c.title })),
          image: profile.user.image ?? profile.teacherProfile?.profilePhoto ?? null,
          name: profile.user.name,
          slug: profile.user.slug
        }),
        breadcrumbJsonLd([
          { name: "Home", path: "/" },
          { name: "Courses", path: "/courses" },
          { name: profile.user.name, path: `/teachers/${pathSlug}` }
        ])
      ],
      ogImageUrl: og,
      path: `/teachers/${pathSlug}`,
      title: profile.user.name
    });
  },
  component: TeacherProfilePage,
  errorComponent: RouteErrorView
});

function TeacherProfilePage(): JSX.Element {
  const profile = Route.useLoaderData();

  return (
    <div className="mx-auto max-w-6xl space-y-6 px-4 py-10">
      <FadeIn>
        <Card className="overflow-hidden bg-linear-to-br from-surface-container-lowest to-surface-container-low">
          <CardHeader className="space-y-4">
            <p className="text-[0.75rem] font-semibold uppercase tracking-[0.08em] text-secondary-container">
              Public teacher profile
            </p>
            <div className="grid gap-6 lg:grid-cols-[1fr_0.8fr]">
              <div className="space-y-3">
                <CardTitle className="text-4xl">{profile.user.name}</CardTitle>
                <CardDescription className="max-w-2xl text-base leading-7">
                  {profile.teacherProfile?.bio ??
                    "This teacher profile is ready for deeper course storytelling as more public content ships."}
                </CardDescription>
                <div className="flex flex-wrap gap-3 text-sm text-on-surface/70">
                  <span className="rounded-full bg-surface px-4 py-2">
                    {profile.metrics.publishedCourseCount} published courses
                  </span>
                  <span className="rounded-full bg-surface px-4 py-2">
                    {profile.metrics.reviewAverage ?? "No"} average rating
                  </span>
                  <span className="rounded-full bg-surface px-4 py-2">
                    {profile.metrics.reviewCount} reviews
                  </span>
                </div>
              </div>
              <div className="rounded-[calc(var(--radius)-0.125rem)] bg-surface p-6">
                <p className="text-[0.75rem] font-semibold uppercase tracking-[0.06em] text-on-surface/50">
                  Qualifications
                </p>
                <p className="mt-3 text-sm leading-7 text-on-surface/72">
                  {profile.teacherProfile?.qualifications ?? "Once qualifications are added, they appear here for students deciding on the right guide."}
                </p>
                <p className="mt-6 text-[0.75rem] font-semibold uppercase tracking-[0.06em] text-on-surface/50">
                  Specializations
                </p>
                <p className="mt-3 text-sm leading-7 text-on-surface/72">
                  {profile.teacherProfile?.specializations ?? "Specializations will appear here once provided."}
                </p>
              </div>
            </div>
          </CardHeader>
        </Card>
      </FadeIn>

      <div className="grid gap-4 lg:grid-cols-[1.2fr_0.8fr]">
        <FadeIn delayClassName="delay-75">
          <Card>
            <CardHeader>
              <CardTitle>Published courses</CardTitle>
              <CardDescription>
                Students can browse the courses currently associated with this teacher profile.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {profile.courses.length > 0 ? (
                profile.courses.map((course: TeacherCourseSummary) => (
                  <Link
                    key={course.id}
                    className="block rounded-[calc(var(--radius)-0.125rem)] bg-surface-container-low p-4 transition-colors hover:bg-surface-container-highest/40"
                    to="/courses/$slug"
                    params={{ slug: course.slug }}
                  >
                    <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                      <div className="space-y-2">
                        <p className="font-semibold text-on-surface">{course.title}</p>
                        <p className="text-sm leading-6 text-on-surface/68">{course.description}</p>
                      </div>
                      <div className="text-sm text-on-surface/62">
                        <div>{course.price} BDT</div>
                        <div>{course.reviewCount} reviews</div>
                      </div>
                    </div>
                  </Link>
                ))
              ) : (
                <div className="rounded-[calc(var(--radius)-0.125rem)] bg-surface-container-low p-4 text-sm leading-7 text-on-surface/68">
                  No published courses are attached to this teacher yet.
                </div>
              )}
            </CardContent>
          </Card>
        </FadeIn>

        <FadeIn delayClassName="delay-150">
          <Card>
            <CardHeader>
              <CardTitle>Public links</CardTitle>
              <CardDescription>Links, contact surfaces, and public discovery details.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="rounded-[calc(var(--radius)-0.125rem)] bg-surface-container-low p-4 text-sm leading-7 text-on-surface/68">
                {profile.teacherProfile?.socialLinks ?? "Public links will appear here once added."}
              </div>
              <div className="rounded-[calc(var(--radius)-0.125rem)] bg-surface-container-low p-4 text-sm leading-7 text-on-surface/68">
                Phone: {profile.teacherProfile?.phone ?? "Not shared"}
              </div>
            </CardContent>
          </Card>
        </FadeIn>
      </div>
    </div>
  );
}
