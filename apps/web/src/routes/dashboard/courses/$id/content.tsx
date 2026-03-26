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
import { useEffect, useState } from "react";

import {
  CourseContentBuilder,
  CourseContentBuilderSkeleton
} from "@/components/courses/course-content-builder";
import { CourseNoticeManager } from "@/components/courses/course-notice-manager";
import { RouteErrorView } from "@/components/common/route-error";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import type { CourseDetail } from "@/lib/api/courses";
import { getCourse } from "@/lib/api/courses";
import type { ContentChapter } from "@/lib/api/content";
import { getCourseContent } from "@/lib/api/content";

export const Route = createFileRoute("/dashboard/courses/$id/content" as never)({
  component: CourseContentPage,
  errorComponent: RouteErrorView
} as never);

function CourseContentPage(): JSX.Element {
  const { id } = Route.useParams();
  const [course, setCourse] = useState<CourseDetail | null>(null);
  const [content, setContent] = useState<readonly ContentChapter[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const loadData = async (): Promise<void> => {
    setIsLoading(true);

    try {
      const [courseData, contentData] = await Promise.all([
        getCourse(id),
        getCourseContent(id)
      ]);
      setCourse(courseData);
      setContent(contentData);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    void loadData();
  }, [id]);

  if (isLoading || !course) {
    return <CourseContentBuilderSkeleton />;
  }

  return (
    <div className="space-y-8 animate-in fade-in duration-1000">
      {/* Premium Sub-Header */}
      <div className="bg-surface-container-lowest/80 backdrop-blur-3xl rounded-4xl p-8 border border-outline-variant/40 shadow-xl relative w-full overflow-hidden group">
        <div className="absolute -top-24 -right-24 size-64 bg-primary/5 rounded-full blur-3xl group-hover:bg-primary/10 transition-all duration-1000 z-[-1]" />
        
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-8">
          <div className="space-y-3">
             <div className="flex flex-wrap items-center gap-3 text-on-surface/40 text-[0.65rem] font-bold uppercase tracking-widest mb-2">
                <Link to="/dashboard/courses" className="hover:text-primary transition-colors">Curriculum</Link>
                <ChevronRight className="size-3" />
                <Link to="/dashboard/courses/$id/edit" params={{ id: course.id }} className="hover:text-primary transition-colors">{course.title}</Link>
                <ChevronRight className="size-3" />
                <span className="text-primary font-black">Content Architect</span>
             </div>

             <div className="flex items-center gap-4">
                <div className="size-12 rounded-2xl bg-primary/10 flex items-center justify-center text-primary shadow-inner border border-primary/20">
                   <Layers className="size-7" />
                </div>
                <div>
                   <h3 className="font-headline text-3xl font-extrabold tracking-tight text-on-surface">Curriculum Architect</h3>
                   <div className="flex items-center gap-3 mt-1">
                      <Badge tone="violet" className="rounded-full px-3 py-0.5 text-[0.6rem] bg-violet-500/10 font-black border-violet-500/20">{course.slug}</Badge>
                      <span className="text-[0.7rem] font-bold text-on-surface/40 flex items-center gap-1">
                         <BookMarked className="size-3" /> {content.length} Chapters
                      </span>
                   </div>
                </div>
             </div>
          </div>

          <div className="flex flex-wrap gap-3">
             <Button asChild variant="outline" className="h-12 rounded-2xl border-outline-variant/30 px-6 font-bold text-[0.7rem] uppercase tracking-widest transition-all hover:bg-surface-container-low">
                <Link to="/dashboard/courses/$id/tests" params={{ id: course.id }} className="flex items-center gap-2">
                   <Settings2 className="size-4" />
                   Assessments
                </Link>
             </Button>
             <Button asChild className="h-12 rounded-2xl px-8 font-headline font-extrabold bg-primary hover:bg-primary-hover shadow-lg transition-all hover:scale-[1.05] active:scale-[0.95]">
                <Link to="/courses/$slug" params={{ slug: course.slug }} className="flex items-center gap-2">
                   <LayoutGrid className="size-4" />
                   Preview
                </Link>
             </Button>
          </div>
        </div>
      </div>

      <CourseContentBuilder content={content} course={course} onRefresh={loadData} />
      
      <div className="max-w-4xl mx-auto">
         <CourseNoticeManager courseId={course.id} />
      </div>

      <footer className="py-12 border-t border-outline-variant/10 text-center">
         <Button asChild variant="ghost" className="text-on-surface/40 hover:text-primary transition-colors font-bold text-[0.7rem] uppercase tracking-[0.2em]">
            <Link to="/dashboard/courses" className="flex items-center gap-3">
               <ArrowLeft className="size-4" /> Back to Workshop
            </Link>
         </Button>
      </footer>
    </div>
  );
}
