import { Link, createFileRoute, notFound } from "@tanstack/react-router";
import { Star, PlayCircle, Award, History, ShieldCheck, ChevronDown, Users } from "lucide-react";
import type { JSX } from "react";
import { useEffect, useState, useMemo } from "react";
import { toast } from "sonner";
import { FadeIn } from "@/components/common/fade-in";
import { RouteErrorView } from "@/components/common/route-error";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { useAuthSession } from "@/hooks/use-auth-session";
import type { CourseDetail } from "@/lib/api/courses";
import type { StudentEnrollment } from "@/lib/api/enrollments";
import { createEnrollment, getMyCourseEnrollment } from "@/lib/api/enrollments";
import { breadcrumbJsonLd, courseJsonLd, seo } from "@/lib/seo";
import { SsrNotFoundError, ssrApiGet } from "@/lib/ssr-api";
import type { CourseReviewPublic } from "@/lib/api/reviews";
import { getCourseReviewSummary, listCourseReviews } from "@/lib/api/reviews";
import { siteConfig } from "@/lib/site";
import { LandingLayout } from "@/features/landing/components/landing-layout";
import type { ContentChapter } from "@/lib/api/content";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/courses/$slug")({
  loader: async ({ params }) => {
    try {
      const course = await ssrApiGet<CourseDetail>(
        `/courses/by-slug/${encodeURIComponent(params.slug)}`
      );

      let reviewSummary: { average: number; count: number } | null = null;
      let content: readonly ContentChapter[] = [];

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
        promises.push(
          ssrApiGet<readonly ContentChapter[]>(`/courses/${course.id}/content`)
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
    const data = loaderData;
    if (!data)
      return seo({ description: siteConfig.description, path: "/courses", title: "Course" });

    const { course, reviewSummary } = data;
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
  errorComponent: RouteErrorView
});

function RatingSummary({ rating, count }: { rating: number; count: number }): JSX.Element {
  return (
    <div className="flex items-center gap-2">
      <div className="flex text-amber-400">
        {[1, 2, 3, 4, 5].map((s) => (
          <Star
            key={s}
            className={cn("size-4", s <= Math.round(rating) ? "fill-current" : "opacity-20")}
          />
        ))}
      </div>
      <span className="text-on-background font-bold">{rating.toFixed(1)}</span>
      <span className="text-on-surface-variant text-sm">({count.toLocaleString()} reviews)</span>
    </div>
  );
}

function CourseDetailPage(): JSX.Element {
  const { course, content, reviewSummary: loaderReviewSummary } = Route.useLoaderData();
  const { isPending: isSessionPending, session } = useAuthSession();
  const [enrollment, setEnrollment] = useState<StudentEnrollment | null>(null);
  const [isSubmittingEnrollment, setIsSubmittingEnrollment] = useState(false);
  const [reviewSummary, setReviewSummary] = useState(loaderReviewSummary);
  const [reviews, setReviews] = useState<readonly CourseReviewPublic[]>([]);
  const [expandedChapters, setExpandedChapters] = useState<Record<string, boolean>>({
    [content[0]?.id ?? ""]: true
  });

  useEffect(() => {
    if (isSessionPending || session?.session.role !== "STUDENT") {
      setEnrollment(null);
      return;
    }
    void (async () => {
      const currentEnrollment = await getMyCourseEnrollment(course.id);
      setEnrollment(currentEnrollment);
    })();
  }, [course.id, isSessionPending, session]);

  useEffect(() => {
    if (course.status !== "PUBLISHED") return;
    void (async () => {
      try {
        const [summary, page] = await Promise.all([
          getCourseReviewSummary(course.id),
          listCourseReviews(course.id, { limit: 20, page: 1 })
        ]);
        setReviewSummary(summary);
        setReviews(page.data);
      } catch {
        setReviewSummary(loaderReviewSummary);
      }
    })();
  }, [course.id, course.status, loaderReviewSummary]);

  const handleEnroll = async (): Promise<void> => {
    setIsSubmittingEnrollment(true);
    try {
      const response = await createEnrollment({
        callbackOrigin: window.location.origin,
        courseId: course.id
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

  const totalLessons = useMemo(
    () => content.reduce((acc: number, ch: ContentChapter) => acc + ch.lectures.length, 0),
    [content]
  );

  return (
    <LandingLayout showGrid={false}>
      {/* Hero Section */}
      <section className="relative bg-surface overflow-hidden border-b border-outline-variant/50">
        <div className="max-w-7xl mx-auto px-8 py-20 lg:py-32 grid lg:grid-cols-12 gap-12 items-center">
          <div className="lg:col-span-7 space-y-8">
            <FadeIn>
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-surface-container-high text-secondary text-[0.65rem] font-black tracking-widest uppercase font-label">
                <span className="w-2 h-2 rounded-full bg-secondary animate-pulse"></span>
                {course.category.name}
              </div>
            </FadeIn>
            <FadeIn delayClassName="animation-delay-100">
              <h1 className="text-5xl lg:text-7xl font-headline font-extrabold tracking-tighter leading-[1.1] text-on-background">
                {course.title.split(" ").slice(0, -2).join(" ")}{" "}
                <span className="text-transparent bg-clip-text bg-linear-to-r from-secondary to-on-primary-container">
                  {course.title.split(" ").slice(-2).join(" ")}
                </span>
              </h1>
            </FadeIn>
            <FadeIn delayClassName="animation-delay-200">
              <p className="text-xl text-on-surface-variant leading-relaxed max-w-2xl font-light italic">
                {course.description}
              </p>
            </FadeIn>
            <FadeIn delayClassName="animation-delay-300">
              <div className="flex flex-wrap items-center gap-8 pt-4">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 rounded-full overflow-hidden bg-surface-container-high border border-outline-variant/20">
                    {course.teachers[0]?.profilePhoto ? (
                      <img
                        src={course.teachers[0].profilePhoto}
                        className="w-full h-full object-cover"
                        alt="Instructor"
                      />
                    ) : (
                      <div className="w-full h-full bg-secondary/10 flex items-center justify-center text-secondary">
                        <Users className="size-5" />
                      </div>
                    )}
                  </div>
                  <div>
                    <p className="text-[0.6rem] font-black font-label text-on-surface-variant tracking-wider uppercase">
                      Lead Instructor
                    </p>
                    <p className="text-base font-bold text-on-background">
                      {course.teachers[0]?.name || "Expert Faculty"}
                    </p>
                  </div>
                </div>
                <div className="h-10 w-px bg-outline-variant/30 hidden sm:block"></div>
                <RatingSummary
                  rating={reviewSummary?.average || 0}
                  count={reviewSummary?.count || 0}
                />
              </div>
            </FadeIn>
          </div>
          <div className="lg:col-span-5 relative">
            <FadeIn delayClassName="animation-delay-400">
              <div className="relative rounded-4xl overflow-hidden aspect-video shadow-2xl group border-4 border-white">
                {course.coverImageUrl ? (
                  <img
                    src={course.coverImageUrl}
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700"
                    alt="Course Preview"
                  />
                ) : (
                  <div className="w-full h-full bg-surface-container-low flex items-center justify-center">
                    <PlayCircle className="size-16 text-secondary/20" />
                  </div>
                )}
              </div>
            </FadeIn>
          </div>
        </div>
      </section>

      {/* Main Content Area */}
      <section className="max-w-7xl mx-auto px-8 py-16 grid lg:grid-cols-12 gap-12">
        <div className="lg:col-span-8 space-y-24">
          {/* Curriculum */}
          <div id="curriculum">
            <div className="flex justify-between items-end mb-10">
              <h2 className="text-3xl font-headline font-black tracking-tight text-on-background uppercase">
                Curriculum Hub
              </h2>
              <span className="text-[0.65rem] font-black font-label text-on-surface-variant uppercase tracking-widest">
                {content.length} Sections • {totalLessons} Deliverables
              </span>
            </div>

            <div className="space-y-4">
              {content.map((chapter: ContentChapter, idx: number) => (
                <div
                  key={chapter.id}
                  className={cn(
                    "bg-surface-container-lowest overflow-hidden transition-all border border-outline-variant/20 rounded-3xl shadow-sm",
                    expandedChapters[chapter.id] && "ring-2 ring-secondary/10"
                  )}
                >
                  <div
                    className="px-8 py-6 flex items-center justify-between cursor-pointer hover:bg-surface-container-low transition-colors"
                    onClick={() =>
                      setExpandedChapters((cv) => ({ ...cv, [chapter.id]: !cv[chapter.id] }))
                    }
                  >
                    <div className="flex items-center gap-6">
                      <span className="text-secondary font-headline font-black opacity-30 text-3xl italic">
                        {(idx + 1).toString().padStart(2, "0")}
                      </span>
                      <div>
                        <h3 className="font-bold text-on-background text-lg">{chapter.title}</h3>
                        <p className="text-[0.65rem] text-on-surface-variant font-black uppercase tracking-widest mt-1">
                          {chapter.lectures.length} Lectures • Detailed Session
                        </p>
                      </div>
                    </div>
                    <ChevronDown
                      className={cn(
                        "size-6 text-outline transition-transform duration-300",
                        expandedChapters[chapter.id] && "rotate-180"
                      )}
                    />
                  </div>

                  {expandedChapters[chapter.id] && (
                    <div className="px-8 pb-8 space-y-2 animate-in slide-in-from-top-2 duration-300">
                      {chapter.lectures.map((lecture) => (
                        <div
                          key={lecture.id}
                          className="flex items-center justify-between py-3 px-4 rounded-2xl group cursor-pointer hover:bg-surface-container-low transition-all"
                        >
                          <div className="flex items-center gap-4">
                            <PlayCircle className="size-5 text-on-surface-variant group-hover:text-secondary transition-colors" />
                            <span className="text-on-surface group-hover:text-on-background font-medium text-sm">
                              {lecture.title}
                            </span>
                          </div>
                          {lecture.isPreview && (
                            <Badge className="bg-secondary text-white text-[0.6rem] font-black uppercase px-2 shadow-sm">
                              Preview
                            </Badge>
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>

          {/* Instructor Profile */}
          <div className="p-10 bg-surface-container-low/50 rounded-4xl relative overflow-hidden border border-outline-variant/10 shadow-inner">
            <div className="absolute top-0 right-0 w-64 h-64 bg-secondary/5 rounded-full blur-3xl -mr-32 -mt-32"></div>
            <div className="relative z-10 flex flex-col md:flex-row gap-10 items-center md:items-start text-center md:text-left">
              <div className="w-12 h-20 md:w-20 md:h-20 rounded-3xl overflow-hidden shrink-0 rotate-2 shadow-2xl border-4 border-white transition-transform hover:rotate-0 duration-500">
                {course.teachers[0]?.profilePhoto ? (
                  <img
                    src={course.teachers[0].profilePhoto}
                    className="w-full h-full object-cover"
                    alt="Instructor Profile"
                  />
                ) : (
                  <div className="w-full h-full bg-white flex items-center justify-center text-secondary">
                    <Users className="size-12 opacity-10" />
                  </div>
                )}
              </div>
              <div className="space-y-6 flex-1">
                <div>
                  <h2 className="text-2xl font-headline font-black text-on-background tracking-tighter italic">
                    {course.teachers[0]?.name}
                  </h2>
                  <p className="text-on-surface-variant leading-relaxed text-sm font-medium italic">
                    {course.teachers[0]?.bio || ""}
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Sticky Enrollment Card */}
        <div className="lg:col-span-4">
          <div className="sticky top-32 space-y-6">
            <div className="bg-white rounded-4xl shadow-[0_20px_50px_-15px_rgba(19,27,46,0.1)] overflow-hidden border border-outline-variant/10">
              <div className="p-8 space-y-8">
                <div className="flex items-baseline gap-2">
                  <span className="text-4xl font-headline font-black text-on-background tracking-tighter">
                    ৳{Number(course.price).toLocaleString()}
                  </span>
                  {Number(course.price) > 0 && (
                    <>
                      <span className="text-on-surface-variant line-through text-lg opacity-30 font-light italic">
                        ৳{(Number(course.price) * 2.5).toLocaleString()}
                      </span>
                      <Badge className="ml-auto bg-red-100 text-red-600 text-[0.6rem] font-black border-none px-2 rounded-lg">
                        65% OFF
                      </Badge>
                    </>
                  )}
                </div>

                <div className="space-y-3">
                  {isSessionPending ? (
                    <Skeleton className="h-14 w-full rounded-2xl bg-surface-container-low" />
                  ) : !session ? (
                    <>
                      <Button
                        asChild
                        className="w-full h-14 rounded-2xl bg-secondary text-white font-headline font-black text-lg shadow-lg shadow-secondary/20 hover:scale-[1.02] transition-transform"
                      >
                        <Link to="/auth/sign-up" search={{ courseSlug: course.slug }}>
                          Enroll Now
                        </Link>
                      </Button>
                      <Button
                        variant="outline"
                        asChild
                        className="w-full h-14 rounded-2xl border-outline-variant/20 font-bold text-sm"
                      >
                        <Link to="/login">Sign in for Access</Link>
                      </Button>
                    </>
                  ) : session.session.role !== "STUDENT" ? (
                    <Button className="w-full h-14 rounded-2xl" disabled>
                      Staff Profile Active
                    </Button>
                  ) : enrollment?.accessGranted ? (
                    <Button
                      asChild
                      className="w-full h-14 rounded-2xl bg-secondary text-white font-headline font-black text-lg shadow-lg"
                    >
                      <Link to="/dashboard/learn/$courseId" params={{ courseId: course.id }}>
                        Open Course Player
                      </Link>
                    </Button>
                  ) : (
                    <Button
                      className="w-full h-14 rounded-2xl bg-secondary text-white font-headline font-black text-lg shadow-lg"
                      disabled={isSubmittingEnrollment}
                      onClick={() => void handleEnroll()}
                    >
                      {isSubmittingEnrollment ? "Authorizing..." : "Initialize Enrollment"}
                    </Button>
                  )}
                </div>
                <div className="space-y-4 pt-8 border-t border-outline-variant/10">
                  <p className="font-black text-[0.7rem] text-on-background uppercase tracking-widest">
                    Includes:
                  </p>
                  <ul className="space-y-4">
                    {(
                      [
                        [Award, "Certificate of Completion"],
                        [History, "Full lifetime access"]
                      ] as const
                    ).map(([IconComponent, text], i) => (
                      <li
                        key={i}
                        className="flex items-center gap-3 text-sm text-on-surface-variant font-medium group"
                      >
                        <div className="size-8 rounded-xl bg-surface-container-low flex items-center justify-center text-secondary group-hover:bg-secondary group-hover:text-white transition-colors duration-300">
                          <IconComponent className="size-4" />
                        </div>
                        {text}
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            </div>

            <div className="p-6 bg-surface-container-low/50 rounded-4xl border border-outline-variant/10 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <ShieldCheck className="size-5 text-secondary" />
                <span className="text-[0.65rem] font-black uppercase tracking-widest text-on-surface-variant">
                  SSL Commerz Secure
                </span>
              </div>
              <div className="flex gap-2">
                <div className="w-8 h-5 bg-on-surface-variant/5 rounded-md border border-outline-variant/10"></div>
                <div className="w-8 h-5 bg-on-surface-variant/5 rounded-md border border-outline-variant/10"></div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Reviews Section */}
      {reviews.length > 0 && (
        <section className="bg-surface-container-low/30 py-32 border-y border-outline-variant/10">
          <div className="max-w-7xl mx-auto px-8">
            <div className="flex flex-col md:flex-row justify-between items-end mb-20 gap-8 text-center md:text-left">
              <div>
                <h2 className="text-4xl font-headline font-black text-on-background tracking-tighter uppercase italic">
                  Institutional Feedback
                </h2>
                <p className="text-on-surface-variant text-sm mt-3 font-medium uppercase tracking-widest opacity-60">
                  Success narratives from our curriculum alumni.
                </p>
              </div>
              <div className="flex flex-col items-center md:items-end gap-2">
                <div className="flex items-center gap-4">
                  <span className="text-5xl font-black font-headline text-on-background tracking-tighter">
                    {reviewSummary?.average.toFixed(1) || "5.0"}
                  </span>
                  <div className="flex text-secondary mb-1">
                    {[1, 2, 3, 4, 5].map((s) => (
                      <Star key={s} className="size-6 fill-current" />
                    ))}
                  </div>
                </div>
                <p className="text-[0.6rem] font-black uppercase text-on-surface-variant tracking-[0.3em] opacity-40">
                  Cumulative Intelligence Rating
                </p>
              </div>
            </div>

            <div className="grid md:grid-cols-3 gap-8">
              {reviews.slice(0, 3).map((review) => (
                <div
                  key={review.id}
                  className="p-10 bg-white rounded-4xl border border-outline-variant/10 shadow-sm space-y-8 hover:shadow-2xl hover:shadow-primary/5 transition-all duration-500"
                >
                  <div className="flex gap-1 text-secondary">
                    {[1, 2, 3, 4, 5].map((s) => (
                      <Star
                        key={s}
                        className={cn(
                          "size-3.5",
                          s <= review.rating ? "fill-current" : "opacity-20"
                        )}
                      />
                    ))}
                  </div>
                  <p className="text-on-surface-variant italic leading-relaxed text-sm font-medium">
                    &ldquo;
                    {review.comment ||
                      "The instructional clarity and architectural rigor of this curriculum is unprecedented."}
                    &rdquo;
                  </p>
                  <div className="flex items-center gap-4 pt-4 border-t border-outline-variant/10">
                    <div className="size-10 rounded-full bg-secondary/10 flex items-center justify-center text-secondary font-black text-xs uppercase">
                      {review.authorName[0]}
                    </div>
                    <div>
                      <p className="text-sm font-black text-on-background italic">
                        {review.authorName}
                      </p>
                      <p className="text-[0.6rem] text-on-surface-variant font-black uppercase tracking-widest opacity-40">
                        Certified Learner
                      </p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>
      )}
    </LandingLayout>
  );
}
