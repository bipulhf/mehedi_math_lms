import { Link, createFileRoute } from "@tanstack/react-router";
import type { JSX } from "react";
import { useEffect, useState } from "react";

import { DataTableSkeleton } from "@/components/common/data-table-skeleton";
import { RouteErrorView } from "@/components/common/route-error";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useAuthSession } from "@/hooks/use-auth-session";
import type { StudentEnrollment } from "@/lib/api/enrollments";
import { listMyEnrollments } from "@/lib/api/enrollments";

export const Route = createFileRoute("/dashboard/my-courses" as never)({
  component: MyCoursesPage,
  errorComponent: RouteErrorView
} as never);

function paymentTone(
  status: StudentEnrollment["latestPaymentStatus"]
): "amber" | "blue" | "green" | "red" {
  if (status === "SUCCESS") {
    return "green";
  }

  if (status === "FAILED" || status === "REFUNDED") {
    return "red";
  }

  if (status === "PENDING") {
    return "amber";
  }

  return "blue";
}

function MyCoursesPage(): JSX.Element {
  const { isPending: isSessionPending, session } = useAuthSession();
  const [enrollments, setEnrollments] = useState<readonly StudentEnrollment[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (isSessionPending || session?.session.role !== "STUDENT") {
      setIsLoading(false);
      return;
    }

    void (async () => {
      setIsLoading(true);

      try {
        const items = await listMyEnrollments();
        setEnrollments(items);
      } finally {
        setIsLoading(false);
      }
    })();
  }, [isSessionPending, session]);

  if (isLoading) {
    return <DataTableSkeleton columns={4} rows={4} />;
  }

  if (session?.session.role !== "STUDENT") {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Student access only</CardTitle>
          <CardDescription>This workspace is reserved for student enrollment and learning activity.</CardDescription>
        </CardHeader>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle>My courses</CardTitle>
          <CardDescription>
            Track active enrollments, payment state, and your current learning progress from one list.
          </CardDescription>
        </CardHeader>
      </Card>

      {enrollments.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col gap-4 p-6">
            <p className="text-sm leading-7 text-on-surface/68">
              You have not enrolled in any course yet. Explore the academy catalog to get started.
            </p>
            <div>
              <Button asChild>
                <Link to="/courses">Browse courses</Link>
              </Button>
            </div>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 xl:grid-cols-2">
          {enrollments.map((enrollment) => (
            <Card key={enrollment.id} className="overflow-hidden">
              {enrollment.course.coverImageUrl ? (
                <img
                  alt={enrollment.course.title}
                  className="aspect-16/7 w-full object-cover"
                  src={enrollment.course.coverImageUrl}
                />
              ) : (
                <div className="aspect-16/7 bg-[radial-gradient(circle_at_top_left,rgba(96,99,238,0.18),transparent_55%),linear-gradient(135deg,rgba(27,27,31,0.04),rgba(96,99,238,0.1))]" />
              )}
              <CardContent className="space-y-4 p-6">
                <div className="flex flex-wrap gap-2">
                  <Badge tone="blue">{enrollment.category.name}</Badge>
                  <Badge tone={paymentTone(enrollment.latestPaymentStatus)}>
                    {enrollment.latestPaymentStatus ?? "FREE"}
                  </Badge>
                  <Badge tone={enrollment.accessGranted ? "green" : "amber"}>
                    {enrollment.accessGranted ? "Access ready" : "Payment pending"}
                  </Badge>
                </div>

                <div className="space-y-2">
                  <h2 className="text-2xl font-semibold text-on-surface">{enrollment.course.title}</h2>
                  <p className="text-sm text-on-surface/62">
                    Enrolled on {new Date(enrollment.enrolledAt).toLocaleDateString()}
                  </p>
                </div>

                <div className="space-y-2">
                  <div className="flex items-center justify-between text-sm text-on-surface/68">
                    <span>Progress</span>
                    <span>{enrollment.progressPercentage}%</span>
                  </div>
                  <div className="h-2 overflow-hidden rounded-full bg-surface-container-low">
                    <div
                      className="h-full rounded-full bg-secondary-container transition-all duration-200 ease-out"
                      style={{ width: `${enrollment.progressPercentage}%` }}
                    />
                  </div>
                </div>

                <div className="flex gap-3">
                  <Button asChild>
                    {enrollment.accessGranted ? (
                      <Link
                        to="/dashboard/learn/$courseId"
                        params={{ courseId: enrollment.course.id }}
                      >
                        Resume learning
                      </Link>
                    ) : (
                      <Link to="/courses/$id" params={{ id: enrollment.course.id }}>
                        Finish payment
                      </Link>
                    )}
                  </Button>
                  <Button asChild variant="outline">
                    <Link to="/dashboard/payments">Payment history</Link>
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
