import { createFileRoute } from "@tanstack/react-router";
import type { JSX } from "react";

import { RouteErrorView } from "@/components/common/route-error";
import { StaffExamWorkspace } from "@/components/exams/staff-exam-workspace";
import { StudentExamReview } from "@/components/exams/student-exam-review";
import { BackButton } from "@/components/ui/back-button";
import { Skeleton } from "@/components/ui/skeleton";
import { useAuthSession } from "@/hooks/use-auth-session";
import { seo } from "@/lib/seo";

export const Route = createFileRoute("/dashboard/exams/$testId")({
  head: () =>
    seo({
      description: "Answers, marks and papers for one exam.",
      path: "/dashboard/exams",
      title: "Exam"
    }),
  component: ExamWorkspacePage,
  errorComponent: RouteErrorView
} as never);

/**
 * One exam, from whichever side the reader is on. A student's view is the same
 * page with their own attempts in it and nothing to write.
 */
function ExamWorkspacePage(): JSX.Element {
  const { testId } = Route.useParams();
  const { isPending, session } = useAuthSession();

  if (isPending || !session) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-14 w-full" />
        <Skeleton className="h-72 w-full" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <BackButton to="/dashboard/exams" />
      {session.session.role === "STUDENT" ? (
        <StudentExamReview testId={testId} />
      ) : (
        <StaffExamWorkspace testId={testId} />
      )}
    </div>
  );
}
