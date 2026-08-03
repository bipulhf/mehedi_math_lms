import { useQuery } from "@tanstack/react-query";
import { Link, createFileRoute } from "@tanstack/react-router";
import type { JSX } from "react";
import { lazy, Suspense, useState } from "react";

import { certificateDisplayName } from "@/components/certificates/certificate-display-name";
import { RouteErrorView } from "@/components/common/route-error";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ProgressTrack } from "@/components/ui/progress-track";
import { ResponsiveImage } from "@/components/ui/responsive-image";
import { Skeleton } from "@/components/ui/skeleton";
import { useAuthSession } from "@/hooks/use-auth-session";
import type { StudentEnrollment } from "@/lib/api/enrollments";
import { fetchEnrollmentReceiptPdf, listMyEnrollments } from "@/lib/api/enrollments";
import { queryKeys } from "@/lib/query/keys";
import { useT } from "@/lib/i18n/locale-context";

const CertificatePreviewDialog = lazy(async () => {
  const mod = await import("@/components/certificates/certificate-preview-dialog");

  return { default: mod.CertificatePreviewDialog };
});

export const Route = createFileRoute("/dashboard/my-courses")({
  component: MyCoursesPage,
  errorComponent: RouteErrorView
} as never);

function paymentTone(
  status: StudentEnrollment["latestPaymentStatus"]
): "attention" | "neutral" | "neutral" | "attention" {
  if (status === "SUCCESS") {
    return "neutral";
  }

  if (status === "FAILED" || status === "REFUNDED") {
    return "attention";
  }

  if (status === "PENDING") {
    return "attention";
  }

  return "neutral";
}

function MyCoursesPage(): JSX.Element {
  const t = useT();

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


  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="bg-card/80 p-8 border border-hairline/40 relative w-full overflow-hidden">
           <Skeleton className="h-8 w-48 mb-4 bg-chip-active" />
           <Skeleton className="h-4 w-full max-w-sm bg-chip-active" />
        </div>
        <div className="grid gap-6 xl:grid-cols-2">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="bg-card/80 border border-hairline/40 overflow-hidden">
              <Skeleton className="aspect-16/7 w-full bg-chip-active" />
              <div className="p-8 space-y-4">
                <div className="flex gap-2">
                  <Skeleton className="h-6 w-20 rounded-full bg-chip-active" />
                  <Skeleton className="h-6 w-24 rounded-full bg-chip-active" />
                </div>
                <Skeleton className="h-8 w-3/4 bg-chip-active" />
                <Skeleton className="h-4 w-full bg-chip-active" />
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  if (session?.session.role !== "STUDENT") {
    return (
      <div className="bg-card/80 p-8 border border-hairline/40 relative w-full overflow-hidden">
        <div className="mb-4 text-center">
          <h3 className="font-body text-2xl font-medium tracking-tight text-ink">{t("mine.studentOnly")}</h3>
          <p className="mt-2 text-sm text-muted font-light leading-relaxed">{t("mine.studentOnlyLead")}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {certificatePreview && session ? (
        <Suspense
          fallback={
            <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4">
              <div className="h-[70vh] w-full max-w-4xl bg-chip-active" />
            </div>
          }
        >
          <CertificatePreviewDialog
            courseTitle={certificatePreview.courseTitle}
            enrollmentId={certificatePreview.enrollmentId}
            issuedAt={certificatePreview.issuedAt}
            studentName={certificatePreview.studentName}
            title={certificatePreview.title}
            onClose={() => setCertificatePreview(null)}
          />
        </Suspense>
      ) : null}

      <div className="bg-card/80 p-8 sm:p-10 border border-hairline/40 relative w-full overflow-hidden group">
        <div className="mb-0">
          <h3 className="font-body text-3xl font-medium tracking-tight text-ink">{t("mine.title")}</h3>
          <p className="mt-2 text-sm text-muted font-light max-w-2xl leading-relaxed">{t("mine.lead")}</p>
        </div>
      </div>

      {enrollments.length === 0 ? (
        <div className="bg-card/80 p-10 border border-hairline/40 relative w-full overflow-hidden text-center">
            <p className="text-lg leading-7 text-muted font-light mb-6">{t("mine.empty")}</p>
            <div className="flex justify-center">
              <Button asChild className="h-12 px-8 font-body font-semibold">
                <Link to="/courses">{t("mine.browse")}</Link>
              </Button>
            </div>
        </div>
      ) : (
        <div className="grid gap-6 xl:grid-cols-2">
          {enrollments.map((enrollment) => (
            <div key={enrollment.id} className="bg-card/80 border border-hairline/40 relative overflow-hidden group flex flex-col h-full hover:border-ink/30 transition-all">
               <div className="absolute -top-12 -right-12 w-32 h-32 bg-ink/5 rounded-full blur-xl pointer-events-none group-hover:bg-ink/10 transition-all z-[-1]"></div>
              {enrollment.course.coverImageUrl ? (
                <ResponsiveImage
                  alt={enrollment.course.title}
                  className="aspect-16/7 w-full object-cover border-b border-hairline/20"
                  sizes="(min-width: 1280px) 45vw, 100vw"
                  src={enrollment.course.coverImageUrl}
                />
              ) : (
                <div className="aspect-16/7 bg-[radial-gradient(circle_at_top_left,rgba(96,99,238,0.12),transparent_65%),linear-gradient(135deg,rgba(27,27,31,0.02),rgba(96,99,238,0.05))] border-b border-hairline/20" />
              )}
              <div className="flex-1 space-y-6 p-8">
                <div className="flex flex-wrap gap-2">
                  <Badge tone="neutral" className="rounded-full px-3">{enrollment.category.name}</Badge>
                  <Badge tone={paymentTone(enrollment.latestPaymentStatus)} className="rounded-full px-3">
                    {enrollment.latestPaymentStatus ?? "FREE"}
                  </Badge>
                  <Badge tone={enrollment.accessGranted ? "neutral" : "attention"} className="rounded-full px-3">
                    {enrollment.accessGranted ? "Access ready" : "Payment pending"}
                  </Badge>
                </div>

                <div className="space-y-3">
                  <h2 className="text-2xl font-body font-medium text-ink leading-tight transition-colors group-hover:text-ink">
                    {enrollment.course.title}
                  </h2>
                  <p className="text-xs text-muted font-light uppercase tracking-widest">
                    Enrolled on {new Date(enrollment.enrolledAt).toLocaleDateString("en-GB", { day: 'numeric', month: 'long', year: 'numeric' })}
                  </p>
                </div>

                <div className="space-y-3 bg-panel-warm/40 border border-hairline/10 p-4">
                  <div className="flex items-center justify-between text-[0.7rem] font-bold uppercase tracking-widest text-ink/54">
                    <span>{t("mine.progress")}</span>
                    <span>{enrollment.progressPercentage}%</span>
                  </div>
                  <ProgressTrack
                    completed={enrollment.progressPercentage}
                    label={`${enrollment.course.title} progress`}
                    total={100}
                  />
                </div>

                <div className="flex flex-wrap gap-3 pt-2">
                  {enrollment.accessGranted ? (
                    <Button asChild className="h-11 px-5 font-body font-semibold transition-all ] ]">
                      <Link
                        to="/dashboard/learn/$courseId"
                        params={{ courseId: enrollment.course.id }}
                      >{t("mine.resume")}</Link>
                    </Button>
                  ) : (
                    <Button asChild className="h-11 px-5 font-body font-semibold transition-all ] ]">
                      <Link to="/courses/$slug" params={{ slug: enrollment.course.slug }}>{t("mine.finishPayment")}</Link>
                    </Button>
                  )}
                  <Button asChild variant="outline" className="h-11 px-5 font-body font-semibold border-hairline/30 hover:bg-chip-active transition-all">
                    <Link to="/dashboard/payments">{t("mine.paymentHistory")}</Link>
                  </Button>
                  {enrollment.status === "COMPLETED" && session ? (
                    <>
                      <Button
                        type="button"
                        variant="outline"
                        className="h-11 px-5 font-body font-semibold border-hairline/30 hover:bg-chip-active transition-all"
                        onClick={() =>
                          setCertificatePreview({
                            courseTitle: enrollment.course.title,
                            enrollmentId: enrollment.id,
                            issuedAt: new Date(enrollment.completedAt ?? Date.now()),
                            studentName: certificateDisplayName(session.user.name, session.user.email),
                            title: `Certificate · ${enrollment.course.title}`
                          })
                        }
                      >{t("mine.viewCertificate")}</Button>
                      <Button
                        type="button"
                        variant="accent"
                        className="h-11 px-5 font-body font-semibold transition-all hover:bg-accent/10"
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
                                studentName={certificateDisplayName(session.user.name, session.user.email)}
                              />
                            ).toBlob();
                            downloadBlob(blob, `certificate-${enrollment.id}.pdf`);
                          })()
                        }
                      >{t("mine.downloadCertificate")}</Button>
                    </>
                  ) : null}
                  {enrollment.latestPaymentStatus === "SUCCESS" ? (
                    <Button
                      type="button"
                      variant="outline"
                      className="h-11 px-5 font-body font-semibold border-hairline/30 hover:bg-chip-active transition-all"
                      onClick={() =>
                        void (async () => {
                          const blob = await fetchEnrollmentReceiptPdf(enrollment.id);
                          downloadBlob(blob, `receipt-${enrollment.id}.pdf`);
                        })()
                      }
                    >{t("mine.downloadReceipt")}</Button>
                  ) : null}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
