import { Link, createFileRoute } from "@tanstack/react-router";
import type { JSX } from "react";
import { useEffect, useState } from "react";
import { toast } from "sonner";

import { CourseStatusBadge } from "@/components/courses/course-status-badge";
import { FadeIn } from "@/components/common/fade-in";
import { RouteErrorView } from "@/components/common/route-error";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useAuthSession } from "@/hooks/use-auth-session";
import type { CourseDetail } from "@/lib/api/courses";
import { getCourse } from "@/lib/api/courses";
import type { StudentEnrollment } from "@/lib/api/enrollments";
import { createEnrollment, getMyCourseEnrollment } from "@/lib/api/enrollments";

export const Route = createFileRoute("/courses/$id" as never)({
  component: CourseDetailPage,
  errorComponent: RouteErrorView
} as never);

function CourseDetailPage(): JSX.Element {
  const { id } = Route.useParams();
  const { isPending: isSessionPending, session } = useAuthSession();
  const [course, setCourse] = useState<CourseDetail | null>(null);
  const [enrollment, setEnrollment] = useState<StudentEnrollment | null>(null);
  const [isSubmittingEnrollment, setIsSubmittingEnrollment] = useState(false);

  useEffect(() => {
    void (async () => {
      const courseData = await getCourse(id);
      setCourse(courseData);
    })();
  }, [id]);

  useEffect(() => {
    if (isSessionPending || session?.session.role !== "STUDENT") {
      setEnrollment(null);
      return;
    }

    void (async () => {
      const currentEnrollment = await getMyCourseEnrollment(id);
      setEnrollment(currentEnrollment);
    })();
  }, [id, isSessionPending, session]);

  const handleEnroll = async (): Promise<void> => {
    setIsSubmittingEnrollment(true);

    try {
      const response = await createEnrollment({
        callbackOrigin: window.location.origin,
        courseId: id
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

  if (!course) {
    return (
      <div className="mx-auto flex w-full max-w-6xl flex-col gap-4 px-4 py-10">
        <div className="aspect-16/7 animate-pulse rounded-(--radius) bg-surface-container-low" />
        <div className="grid gap-4 lg:grid-cols-[1.15fr_0.85fr]">
          <div className="h-80 animate-pulse rounded-(--radius) bg-surface-container-low" />
          <div className="h-80 animate-pulse rounded-(--radius) bg-surface-container-low" />
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto flex w-full max-w-6xl flex-col gap-6 px-4 py-10">
      <FadeIn>
        <Card className="overflow-hidden">
          {course.coverImageUrl ? (
            <img
              alt={course.title}
              className="aspect-16/7 w-full object-cover"
              src={course.coverImageUrl}
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
              <p className="max-w-4xl text-base leading-7 text-on-surface/70">{course.description}</p>
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
              {course.teachers.map((teacher) => (
                <div
                  key={teacher.id}
                  className="rounded-[calc(var(--radius)-0.125rem)] border border-outline-variant bg-surface-container-low p-4"
                >
                  <p className="font-semibold text-on-surface">{teacher.name}</p>
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
                <Button asChild className="w-full">
                  <Link to="/auth/sign-in">Sign in to enroll</Link>
                </Button>
              ) : session.session.role !== "STUDENT" ? (
                <Button className="w-full" disabled>
                  Student enrollment only
                </Button>
              ) : enrollment?.accessGranted ? (
                <Button asChild className="w-full">
                  <Link to="/dashboard/my-courses">Open my courses</Link>
                </Button>
              ) : (
                <Button className="w-full" disabled={isSubmittingEnrollment} onClick={() => void handleEnroll()}>
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
    </div>
  );
}
