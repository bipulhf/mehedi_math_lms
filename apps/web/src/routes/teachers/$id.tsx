import { createFileRoute } from "@tanstack/react-router";
import type { JSX } from "react";
import { useEffect, useState } from "react";

import { FadeIn } from "@/components/common/fade-in";
import { RouteErrorView } from "@/components/common/route-error";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import type { PublicTeacherProfileData } from "@/lib/api/profiles";
import { getPublicTeacherProfile } from "@/lib/api/profiles";

export const Route = createFileRoute("/teachers/$id")({
  component: TeacherProfilePage,
  errorComponent: RouteErrorView
});

function TeacherProfilePage(): JSX.Element {
  const { id } = Route.useParams();
  const [isLoading, setIsLoading] = useState(true);
  const [profile, setProfile] = useState<PublicTeacherProfileData | null>(null);

  useEffect(() => {
    void (async () => {
      setIsLoading(true);

      try {
        const nextProfile = await getPublicTeacherProfile(id);
        setProfile(nextProfile);
      } finally {
        setIsLoading(false);
      }
    })();
  }, [id]);

  if (isLoading || !profile) {
    return (
      <div className="mx-auto max-w-6xl space-y-4 px-4 py-10">
        <Skeleton className="h-48 w-full" />
        <div className="grid gap-4 lg:grid-cols-[1.2fr_0.8fr]">
          <Skeleton className="h-72" />
          <Skeleton className="h-72" />
        </div>
      </div>
    );
  }

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
                  {profile.teacherProfile?.qualifications ?? "Qualifications will appear here once provided."}
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
                profile.courses.map((course) => (
                  <div
                    key={course.id}
                    className="rounded-[calc(var(--radius)-0.125rem)] bg-surface-container-low p-4"
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
                  </div>
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
