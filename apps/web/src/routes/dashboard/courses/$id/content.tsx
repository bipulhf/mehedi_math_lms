import { useQueries, useQueryClient } from "@tanstack/react-query";
import { Link, createFileRoute } from "@tanstack/react-router";
import { 
  ArrowLeft, 
  Layers, 
  ChevronRight, 
  Settings2, 
  BookMarked,
  LayoutGrid
} from "lucide-react";
import type { JSX } from "react";

import {
  CourseContentBuilder,
  CourseContentBuilderSkeleton
} from "@/components/courses/course-content-builder";
import { CourseNoticeManager } from "@/components/courses/course-notice-manager";
import { CourseBuilderSteps } from "@/components/courses/course-builder-steps";
import { RouteErrorView } from "@/components/common/route-error";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import type { CourseDetail } from "@/lib/api/courses";
import { getCourse } from "@/lib/api/courses";
import type { ContentChapter } from "@/lib/api/content";
import { getCourseContent } from "@/lib/api/content";
import { queryKeys } from "@/lib/query/keys";
import { useT } from "@/lib/i18n/locale-context";

export const Route = createFileRoute("/dashboard/courses/$id/content")({
  component: CourseContentPage,
  errorComponent: RouteErrorView
} as never);

function CourseContentPage(): JSX.Element {
  const t = useT();

  const { id } = Route.useParams();
  const queryClient = useQueryClient();
  const [courseQuery, contentQuery] = useQueries({
    queries: [
      { queryFn: async () => getCourse(id), queryKey: queryKeys.courses.detail(id) },
      { queryFn: async () => getCourseContent(id), queryKey: queryKeys.content.course(id) }
    ]
  });
  const course: CourseDetail | null = courseQuery?.data ?? null;
  const content: readonly ContentChapter[] = contentQuery?.data ?? [];
  const isLoading = Boolean(courseQuery?.isPending) || Boolean(contentQuery?.isPending);

  const loadData = async (): Promise<void> => {
    await queryClient.invalidateQueries({ queryKey: queryKeys.content.course(id) });
  };

  if (isLoading || !course) {
    return <CourseContentBuilderSkeleton />;
  }

  return (
    <div className="space-y-8">
      <CourseBuilderSteps courseId={id} current="content" />
      {/* Premium Sub-Header */}
      <div className="bg-card/80 p-8 border border-hairline/40 relative w-full overflow-hidden group">
        
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-8">
          <div className="space-y-3">
             <div className="flex flex-wrap items-center gap-3 text-ink/40 text-[0.65rem] font-bold uppercase tracking-widest mb-2">
                <Link to="/dashboard/courses" className="hover:text-ink transition-colors">{t("cbuild.curriculum")}</Link>
                <ChevronRight className="size-3" />
                <Link to="/dashboard/courses/$id/edit" params={{ id: course.id }} className="hover:text-ink transition-colors">{course.title}</Link>
                <ChevronRight className="size-3" />
                <span className="text-ink font-medium">{t("cbuild.contentTitle")}</span>
             </div>

             <div className="flex items-center gap-4">
                <div className="size-12 bg-ink/10 flex items-center justify-center text-ink border border-ink/20">
                   <Layers className="size-7" />
                </div>
                <div>
                   <h3 className="font-body text-3xl font-medium tracking-tight text-ink">{t("cbuild.contentTitle")}</h3>
                   <div className="flex items-center gap-3 mt-1">
                      <Badge tone="neutral" className="rounded-full px-3 py-0.5 text-[0.6rem] bg-violet-500/10 font-medium border-violet-500/20">{course.slug}</Badge>
                      <span className="text-[0.7rem] font-bold text-ink/40 flex items-center gap-1">
                         <BookMarked className="size-3" /> {content.length} Chapters
                      </span>
                   </div>
                </div>
             </div>
          </div>

          <div className="flex flex-wrap gap-3">
             <Button asChild variant="outline" className="h-12 border-hairline/30 px-6 font-bold text-[0.7rem] uppercase tracking-widest transition-all hover:bg-panel-warm">
                <Link to="/dashboard/courses/$id/tests" params={{ id: course.id }} className="flex items-center gap-2">
                   <Settings2 className="size-4" />{t("cbuild.assessments")}</Link>
             </Button>
             <Button asChild className="h-12 px-8 font-body font-medium bg-ink hover:bg-primary-hover transition-all ] ]">
                <Link to="/courses/$slug" params={{ slug: course.slug }} className="flex items-center gap-2">
                   <LayoutGrid className="size-4" />{t("cbuild.preview")}</Link>
             </Button>
          </div>
        </div>
      </div>

      <CourseContentBuilder content={content} course={course} onRefresh={loadData} />
      
      <div className="max-w-4xl mx-auto">
         <CourseNoticeManager courseId={course.id} />
      </div>

      <footer className="py-12 border-t border-hairline/10 text-center">
         <Button asChild variant="ghost" className="text-ink/40 hover:text-ink transition-colors font-bold text-[0.7rem] uppercase tracking-[0.2em]">
            <Link to="/dashboard/courses" className="flex items-center gap-3">
               <ArrowLeft className="size-4" />{t("cbuild.back")}</Link>
         </Button>
      </footer>
    </div>
  );
}
