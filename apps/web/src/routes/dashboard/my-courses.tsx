import { Link, createFileRoute } from "@tanstack/react-router";
import type { JSX } from "react";
import { lazy, Suspense, useEffect, useState } from "react";

import { certificateDisplayName } from "@/components/certificates/certificate-display-name";
import { RouteErrorView } from "@/components/common/route-error";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { useAuthSession } from "@/hooks/use-auth-session";
import type { StudentEnrollment } from "@/lib/api/enrollments";
import { fetchEnrollmentReceiptPdf, listMyEnrollments } from "@/lib/api/enrollments";

const CertificatePreviewDialog = lazy(async () => {
  const mod = await import("@/components/certificates/certificate-preview-dialog");

  return { default: mod.CertificatePreviewDialog };
});

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
    return (
      <div className="space-y-6">
        <div className="bg-surface-container-lowest/80 backdrop-blur-3xl rounded-4xl p-8 border border-outline-variant/40 shadow-xl relative w-full overflow-hidden">
           <Skeleton className="h-8 w-48 mb-4 bg-surface-container-highest" />
           <Skeleton className="h-4 w-full max-w-sm bg-surface-container-highest" />
        </div>
        <div className="grid gap-6 xl:grid-cols-2">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="bg-surface-container-lowest/80 backdrop-blur-3xl rounded-4xl border border-outline-variant/40 shadow-xl overflow-hidden">
              <Skeleton className="aspect-16/7 w-full bg-surface-container-highest" />
              <div className="p-8 space-y-4">
                <div className="flex gap-2">
                  <Skeleton className="h-6 w-20 rounded-full bg-surface-container-highest" />
                  <Skeleton className="h-6 w-24 rounded-full bg-surface-container-highest" />
                </div>
                <Skeleton className="h-8 w-3/4 bg-surface-container-highest" />
                <Skeleton className="h-4 w-full bg-surface-container-highest shadow-inner" />
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  if (session?.session.role !== "STUDENT") {
    return (
      <div className="bg-surface-container-lowest/80 backdrop-blur-3xl rounded-4xl p-8 border border-outline-variant/40 shadow-xl relative w-full overflow-hidden">
        <div className="absolute -top-12 -right-12 w-48 h-48 bg-primary/5 rounded-full blur-2xl pointer-events-none transition-colors z-[-1]"></div>
        <div className="mb-4 text-center">
          <h3 className="font-headline text-2xl font-extrabold tracking-tight text-on-surface">Student access only</h3>
          <p className="mt-2 text-sm text-on-surface-variant font-light leading-relaxed">This workspace is reserved for student enrollment and learning activity.</p>
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
              <div className="h-[70vh] w-full max-w-4xl animate-pulse rounded-4xl bg-surface-container-highest" />
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

      <div className="bg-surface-container-lowest/80 backdrop-blur-3xl rounded-4xl p-8 sm:p-10 border border-outline-variant/40 shadow-xl relative w-full overflow-hidden group">
        <div className="absolute -top-12 -right-12 w-48 h-48 bg-primary/5 rounded-full blur-2xl pointer-events-none transition-all duration-1000 group-hover:bg-primary/10 z-[-1]"></div>
        <div className="mb-0">
          <h3 className="font-headline text-3xl font-extrabold tracking-tight text-on-surface">My courses</h3>
          <p className="mt-2 text-sm text-on-surface-variant font-light max-w-2xl leading-relaxed">
            Track active enrollments, payment state, and your current learning progress from one list.
          </p>
        </div>
      </div>

      {enrollments.length === 0 ? (
        <div className="bg-surface-container-lowest/80 backdrop-blur-3xl rounded-4xl p-10 border border-outline-variant/40 shadow-xl relative w-full overflow-hidden text-center">
            <p className="text-lg leading-7 text-on-surface-variant font-light mb-6">
              You have not enrolled in any course yet. Explore the academy catalog to get started.
            </p>
            <div className="flex justify-center">
              <Button asChild className="h-12 rounded-2xl px-8 font-headline font-semibold">
                <Link to="/courses">Browse courses</Link>
              </Button>
            </div>
        </div>
      ) : (
        <div className="grid gap-6 xl:grid-cols-2">
          {enrollments.map((enrollment) => (
            <div key={enrollment.id} className="bg-surface-container-lowest/80 backdrop-blur-3xl rounded-4xl border border-outline-variant/40 shadow-xl relative overflow-hidden group flex flex-col h-full hover:border-primary/30 transition-all duration-500">
               <div className="absolute -top-12 -right-12 w-32 h-32 bg-primary/5 rounded-full blur-xl pointer-events-none group-hover:bg-primary/10 transition-all duration-700 z-[-1]"></div>
              {enrollment.course.coverImageUrl ? (
                <img
                  alt={enrollment.course.title}
                  className="aspect-16/7 w-full object-cover border-b border-outline-variant/20"
                  src={enrollment.course.coverImageUrl}
                />
              ) : (
                <div className="aspect-16/7 bg-[radial-gradient(circle_at_top_left,rgba(96,99,238,0.12),transparent_65%),linear-gradient(135deg,rgba(27,27,31,0.02),rgba(96,99,238,0.05))] border-b border-outline-variant/20" />
              )}
              <div className="flex-1 space-y-6 p-8">
                <div className="flex flex-wrap gap-2">
                  <Badge tone="blue" className="rounded-full px-3">{enrollment.category.name}</Badge>
                  <Badge tone={paymentTone(enrollment.latestPaymentStatus)} className="rounded-full px-3">
                    {enrollment.latestPaymentStatus ?? "FREE"}
                  </Badge>
                  <Badge tone={enrollment.accessGranted ? "green" : "amber"} className="rounded-full px-3">
                    {enrollment.accessGranted ? "Access ready" : "Payment pending"}
                  </Badge>
                </div>

                <div className="space-y-3">
                  <h2 className="text-2xl font-headline font-extrabold text-on-surface leading-tight transition-colors group-hover:text-primary">
                    {enrollment.course.title}
                  </h2>
                  <p className="text-xs text-on-surface-variant font-light uppercase tracking-widest">
                    Enrolled on {new Date(enrollment.enrolledAt).toLocaleDateString("en-GB", { day: 'numeric', month: 'long', year: 'numeric' })}
                  </p>
                </div>

                <div className="space-y-3 rounded-2xl bg-surface-container-low/40 border border-outline-variant/10 p-4 shadow-inner">
                  <div className="flex items-center justify-between text-[0.7rem] font-bold uppercase tracking-widest text-on-surface/54">
                    <span>Progress</span>
                    <span>{enrollment.progressPercentage}%</span>
                  </div>
                  <div className="h-2.5 overflow-hidden rounded-full bg-surface-container-low shadow-inner border border-outline-variant/5">
                    <div
                      className="h-full rounded-full bg-linear-to-r from-primary to-primary/60 transition-all duration-700 ease-out shadow-[0_0_12px_-2px_rgba(96,99,238,0.5)]"
                      style={{ width: `${enrollment.progressPercentage}%` }}
                    />
                  </div>
                </div>

                <div className="flex flex-wrap gap-3 pt-2">
                  {enrollment.accessGranted ? (
                    <Button asChild className="h-11 rounded-xl px-5 font-headline font-semibold shadow-md transition-all hover:scale-[1.02] active:scale-[0.98]">
                      <Link
                        to="/dashboard/learn/$courseId"
                        params={{ courseId: enrollment.course.id }}
                      >
                        Resume learning
                      </Link>
                    </Button>
                  ) : (
                    <Button asChild className="h-11 rounded-xl px-5 font-headline font-semibold shadow-md transition-all hover:scale-[1.02] active:scale-[0.98]">
                      <Link to="/courses/$slug" params={{ slug: enrollment.course.slug }}>
                        Finish payment
                      </Link>
                    </Button>
                  )}
                  <Button asChild variant="outline" className="h-11 rounded-xl px-5 font-headline font-semibold border-outline-variant/30 hover:bg-surface-container-high transition-all">
                    <Link to="/dashboard/payments">Payment history</Link>
                  </Button>
                  {enrollment.status === "COMPLETED" && session ? (
                    <>
                      <Button
                        type="button"
                        variant="outline"
                        className="h-11 rounded-xl px-5 font-headline font-semibold border-outline-variant/30 hover:bg-surface-container-high transition-all"
                        onClick={() =>
                          setCertificatePreview({
                            courseTitle: enrollment.course.title,
                            enrollmentId: enrollment.id,
                            issuedAt: new Date(enrollment.completedAt ?? Date.now()),
                            studentName: certificateDisplayName(session.user.name, session.user.email),
                            title: `Certificate · ${enrollment.course.title}`
                          })
                        }
                      >
                        View certificate
                      </Button>
                      <Button
                        type="button"
                        variant="secondary"
                        className="h-11 rounded-xl px-5 font-headline font-semibold transition-all hover:bg-secondary/10"
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
                      >
                        Download certificate
                      </Button>
                    </>
                  ) : null}
                  {enrollment.latestPaymentStatus === "SUCCESS" ? (
                    <Button
                      type="button"
                      variant="outline"
                      className="h-11 rounded-xl px-5 font-headline font-semibold border-outline-variant/30 hover:bg-surface-container-high transition-all"
                      onClick={() =>
                        void (async () => {
                          const blob = await fetchEnrollmentReceiptPdf(enrollment.id);
                          downloadBlob(blob, `receipt-${enrollment.id}.pdf`);
                        })()
                      }
                    >
                      Download receipt
                    </Button>
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
