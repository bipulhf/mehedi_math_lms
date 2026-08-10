import { useQuery } from "@tanstack/react-query";
import { Link, createFileRoute } from "@tanstack/react-router";
import type { JSX } from "react";
import { lazy, Suspense, useMemo, useState } from "react";

import { certificateDisplayName } from "@/components/certificates/certificate-display-name";
import { RouteErrorView } from "@/components/common/route-error";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { DataTable, type DataTableColumn } from "@/components/ui/data-table";
import { EmptyState } from "@/components/ui/empty-state";
import { ProgressTrack } from "@/components/ui/progress-track";
import { Skeleton } from "@/components/ui/skeleton";
import { useAuthSession } from "@/hooks/use-auth-session";
import type { StudentEnrollment } from "@/lib/api/enrollments";
import { fetchEnrollmentReceiptPdf, listMyEnrollments } from "@/lib/api/enrollments";
import { queryKeys } from "@/lib/query/keys";
import { seo } from "@/lib/seo";
import { useFormat, useT } from "@/lib/i18n/locale-context";

const CertificatePreviewDialog = lazy(async () => {
  const mod = await import("@/components/certificates/certificate-preview-dialog");

  return { default: mod.CertificatePreviewDialog };
});

export const Route = createFileRoute("/dashboard/my-courses")({
  head: () =>
    seo({
      description: "Courses you are enrolled in, and your progress in each.",
      path: "/dashboard/my-courses",
      title: "My Courses"
    }),
  component: MyCoursesPage,
  errorComponent: RouteErrorView
} as never);

/**
 * DESIGN.md §2: no red/green status palette. `attention` is the one tone that
 * asks for an action — an unpaid or failed enrolment — and everything settled
 * stays quiet.
 */
function paymentTone(status: StudentEnrollment["latestPaymentStatus"]): "attention" | "neutral" {
  return status === "FAILED" || status === "REFUNDED" || status === "PENDING"
    ? "attention"
    : "neutral";
}

function MyCoursesPage(): JSX.Element {
  const t = useT();
  const format = useFormat();

  const { isPending: isSessionPending, session } = useAuthSession();
  const isStudent = !isSessionPending && session?.session.role === "STUDENT";
  const { data: enrollments = [], isPending } = useQuery<readonly StudentEnrollment[]>({
    enabled: isStudent,
    queryFn: async () => listMyEnrollments(),
    queryKey: queryKeys.enrollments.mine()
  });
  // A disabled query stays pending forever; a non-student is done loading.
  const isLoading = isStudent && isPending;
  const [certificatePreview, setCertificatePreview] = useState<{
    courseTitle: string;
    enrollmentId: string;
    issuedAt: Date;
    studentName: string;
    title: string;
  } | null>(null);

  const downloadBlob = (blob: Blob, filename: string): void => {
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = filename;
    anchor.click();
    URL.revokeObjectURL(url);
  };

  const columns = useMemo<readonly DataTableColumn<StudentEnrollment>[]>(
    () => [
      {
        cell: (enrollment) => (
          <div className="min-w-0 space-y-1">
            <Link
              className="block truncate text-base font-medium text-ink transition-colors hover:text-accent"
              params={{ courseId: enrollment.course.id }}
              to="/dashboard/learn/$courseId"
            >
              {enrollment.course.title}
            </Link>
            <p className="text-sm text-muted-light">{enrollment.category.name}</p>
          </div>
        ),
        header: t("mine.colCourse"),
        key: "course"
      },
      {
        cell: (enrollment) => format.date(enrollment.enrolledAt),
        header: t("mine.colEnrolled"),
        key: "enrolled"
      },
      {
        cell: (enrollment) => (
          <div className="min-w-32 space-y-1.5">
            <ProgressTrack
              completed={enrollment.progressPercentage}
              label={`${enrollment.course.title} ${t("mine.progress")}`}
              total={100}
            />
            <p className="text-sm text-muted-light">
              {format.percent(enrollment.progressPercentage)}
            </p>
          </div>
        ),
        header: t("mine.progress"),
        key: "progress"
      },
      {
        cell: (enrollment) => (
          <div className="flex flex-wrap justify-end gap-2 md:justify-start">
            <Badge tone={enrollment.accessGranted ? "neutral" : "attention"}>
              {enrollment.accessGranted ? t("mine.accessReady") : t("mine.paymentPending")}
            </Badge>
            <Badge tone={paymentTone(enrollment.latestPaymentStatus)}>
              {enrollment.latestPaymentStatus ?? t("mine.free")}
            </Badge>
          </div>
        ),
        header: t("mine.colStatus"),
        key: "status"
      },
      {
        align: "end",
        cell: (enrollment) => (
          <div className="flex flex-wrap justify-end gap-2">
            {enrollment.accessGranted ? (
              <Button asChild size="sm">
                <Link params={{ courseId: enrollment.course.id }} to="/dashboard/learn/$courseId">
                  {t("mine.resume")}
                </Link>
              </Button>
            ) : (
              <Button asChild size="sm">
                <Link params={{ slug: enrollment.course.slug }} to="/courses/$slug">
                  {t("mine.finishPayment")}
                </Link>
              </Button>
            )}

            {enrollment.status === "COMPLETED" && session && enrollment.course.certificateEnabled ? (
              <>
                <Button
                  onClick={() =>
                    setCertificatePreview({
                      courseTitle: enrollment.course.title,
                      enrollmentId: enrollment.id,
                      issuedAt: new Date(enrollment.completedAt ?? Date.now()),
                      studentName: certificateDisplayName(session.user.name, session.user.email),
                      title: `${t("mine.viewCertificate")} · ${enrollment.course.title}`
                    })
                  }
                  size="sm"
                  type="button"
                  variant="outline"
                >
                  {t("mine.viewCertificate")}
                </Button>
                <Button
                  onClick={() =>
                    void (async () => {
                      const [{ pdf }, { CertificatePdfDocument }] = await Promise.all([
                        import("@react-pdf/renderer"),
                        import("@/components/certificates/certificate-pdf-document")
                      ]);
                      const blob = await pdf(
                        <CertificatePdfDocument
                          courseTitle={enrollment.course.title}
                          issuedAt={new Date(enrollment.completedAt ?? Date.now())}
                          studentName={certificateDisplayName(
                            session.user.name,
                            session.user.email
                          )}
                        />
                      ).toBlob();
                      downloadBlob(blob, `certificate-${enrollment.id}.pdf`);
                    })()
                  }
                  size="sm"
                  type="button"
                  variant="outline"
                >
                  {t("mine.downloadCertificate")}
                </Button>
              </>
            ) : null}

            {enrollment.latestPaymentStatus === "SUCCESS" ? (
              <Button
                onClick={() =>
                  void (async () => {
                    const blob = await fetchEnrollmentReceiptPdf(enrollment.id);
                    downloadBlob(blob, `receipt-${enrollment.id}.pdf`);
                  })()
                }
                size="sm"
                type="button"
                variant="outline"
              >
                {t("mine.downloadReceipt")}
              </Button>
            ) : null}
          </div>
        ),
        header: t("mine.colActions"),
        key: "actions"
      }
    ],
    [format, session, t]
  );

  if (isLoading) {
    return (
      <div className="space-y-4">
        <div className="border border-hairline bg-card p-6 sm:p-8">
          <Skeleton className="h-8 w-48" />
          <Skeleton className="mt-3 h-4 w-full max-w-sm" />
        </div>
        <div className="border border-hairline bg-card">
          {Array.from({ length: 5 }).map((_, index) => (
            <Skeleton className="m-4 h-10" key={index} />
          ))}
        </div>
      </div>
    );
  }

  if (session?.session.role !== "STUDENT") {
    return (
      <div className="w-full border border-hairline bg-card p-6 sm:p-8">
        <h1 className="text-2xl font-medium text-ink">{t("mine.studentOnly")}</h1>
        <p className="mt-2 max-w-2xl text-base font-light leading-relaxed text-muted">
          {t("mine.studentOnlyLead")}
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {certificatePreview && session ? (
        <Suspense
          fallback={
            <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4">
              <div className="h-[70vh] w-full max-w-4xl border border-hairline bg-placeholder-fill" />
            </div>
          }
        >
          <CertificatePreviewDialog
            courseTitle={certificatePreview.courseTitle}
            enrollmentId={certificatePreview.enrollmentId}
            issuedAt={certificatePreview.issuedAt}
            onClose={() => setCertificatePreview(null)}
            studentName={certificatePreview.studentName}
            title={certificatePreview.title}
          />
        </Suspense>
      ) : null}

      <div className="flex flex-col gap-4 border-b border-hairline pb-5 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="text-2xl font-medium text-ink">{t("mine.title")}</h1>
          <p className="mt-2 max-w-2xl text-base font-light leading-relaxed text-muted">
            {t("mine.lead")}
          </p>
        </div>
        <Button asChild className="h-11 shrink-0" variant="outline">
          <Link to="/dashboard/payments">{t("mine.paymentHistory")}</Link>
        </Button>
      </div>

      <DataTable
        columns={columns}
        emptyState={
          <EmptyState
            action={
              <Button asChild>
                <Link to="/courses">{t("mine.browse")}</Link>
              </Button>
            }
            message={t("mine.empty")}
          />
        }
        rowKey={(enrollment) => enrollment.id}
        rowHref={(enrollment) => `/dashboard/learn/${enrollment.course.id}`}
        rows={enrollments}
      />
    </div>
  );
}
