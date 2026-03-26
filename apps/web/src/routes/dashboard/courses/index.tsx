import { Link, createFileRoute } from "@tanstack/react-router";
import { Plus, Filter, LayoutGrid, Archive, Send, BookOpen } from "lucide-react";
import type { JSX } from "react";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { CourseCard } from "@/components/courses/course-card";
import { RouteErrorView } from "@/components/common/route-error";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import type { CourseSummary } from "@/lib/api/courses";
import { archiveCourse, listCourses, submitCourse } from "@/lib/api/courses";

export const Route = createFileRoute("/dashboard/courses/" as never)({
  component: DashboardCoursesPage,
  errorComponent: RouteErrorView
} as never);

function CourseListSkeleton(): JSX.Element {
  return (
    <div className="space-y-8">
      <div className="bg-surface-container-lowest/80 backdrop-blur-3xl rounded-4xl p-8 border border-outline-variant/40 shadow-xl">
        <div className="flex flex-col sm:flex-row justify-between items-center gap-6">
          <Skeleton className="h-10 w-48 bg-surface-container-highest rounded-xl" />
          <div className="flex gap-4 w-full sm:w-auto">
            <Skeleton className="h-12 w-full sm:w-40 bg-surface-container-highest rounded-2xl" />
            <Skeleton className="h-12 w-full sm:w-40 bg-primary/20 rounded-2xl" />
          </div>
        </div>
      </div>
      <div className="grid gap-6 lg:grid-cols-2">
        {Array.from({ length: 4 }).map((_, i) => (
          <Skeleton
            key={i}
            className="h-96 w-full bg-surface-container-low/50 rounded-4xl border border-outline-variant/10 shadow-sm"
          />
        ))}
      </div>
    </div>
  );
}

function DashboardCoursesPage(): JSX.Element {
  const [courses, setCourses] = useState<readonly CourseSummary[]>([]);
  const [status, setStatus] = useState("");
  const [isLoading, setIsLoading] = useState(true);

  const loadCourses = async (): Promise<void> => {
    setIsLoading(true);

    try {
      const response = await listCourses({
        limit: 12,
        mine: true,
        page: 1,
        status: status ? (status as CourseSummary["status"]) : undefined
      });
      setCourses(response.data);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    void loadCourses();
  }, [status]);

  const handleSubmit = async (courseId: string): Promise<void> => {
    await submitCourse(courseId);
    toast.success("Course submitted for review");
    await loadCourses();
  };

  const handleArchive = async (courseId: string): Promise<void> => {
    if (!window.confirm("Archive this course?")) {
      return;
    }

    await archiveCourse(courseId);
    toast.success("Course archived");
    await loadCourses();
  };

  if (isLoading) return <CourseListSkeleton />;

  return (
    <div className="space-y-8 animate-in fade-in duration-700">
      {/* Premium Header */}
      <div className="bg-surface-container-lowest/80 backdrop-blur-3xl rounded-4xl p-8 sm:p-10 border border-outline-variant/40 shadow-xl relative w-full overflow-hidden group">
        <div className="absolute -top-12 -right-12 w-48 h-48 bg-primary/5 rounded-full blur-2xl pointer-events-none group-hover:bg-primary/10 transition-all duration-1000 z-[-1]" />

        <div className="flex flex-col xl:flex-row xl:items-center justify-between gap-8">
          <div className="flex items-center gap-3 mb-2">
            <div className="size-10 rounded-2xl bg-primary/10 flex items-center justify-center text-primary shadow-inner border border-primary/10">
              <LayoutGrid className="size-5" />
            </div>
            <h3 className="font-headline text-2xl font-extrabold tracking-tight text-on-surface">
              Courses
            </h3>
          </div>

          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-4">
            <div className="min-w-48 space-y-2">
              <Label
                htmlFor="status-filter"
                className="text-[0.65rem] font-bold uppercase tracking-widest text-on-surface/40 ml-1"
              >
                Status Filter
              </Label>
              <div className="relative group">
                <Filter className="absolute left-4 top-1/2 -translate-y-1/2 size-4 text-on-surface/30 group-focus-within:text-primary transition-colors" />
                <Select
                  id="status-filter"
                  className="h-12 pl-11 rounded-2xl bg-surface-container-low/50 border-outline-variant/30 font-body transition-all hover:bg-surface-container-low"
                  value={status}
                  onChange={(event) => setStatus(event.target.value)}
                >
                  <option value="">All Academic States</option>
                  <option value="DRAFT">Enactive Drafts</option>
                  <option value="PENDING">Under Review</option>
                  <option value="PUBLISHED">Publicly Live</option>
                  <option value="ARCHIVED">Cold Storage</option>
                </Select>
              </div>
            </div>
            <div className="sm:pt-6">
              <Button asChild>
                <Link to="/dashboard/courses/new" className="flex items-center gap-2">
                  <Plus className="size-4" />
                  Add Course
                </Link>
              </Button>
            </div>
          </div>
        </div>
      </div>

      {courses.length === 0 ? (
        <div className="rounded-4xl bg-surface-container-lowest/40 border border-dashed border-outline-variant/20 py-24 text-center group transition-all hover:bg-surface-container-lowest/60">
          <div className="size-24 bg-surface-container-low rounded-full flex items-center justify-center mx-auto mb-6 shadow-inner border border-outline-variant/10 group-hover:scale-105 transition-transform duration-500">
            <BookOpen className="size-10 text-primary/20 group-hover:text-primary transition-colors" />
          </div>
          <p className="font-headline text-2xl font-extrabold text-on-surface mb-2 tracking-tight">
            Empty Curriculum
          </p>
          <p className="text-sm text-on-surface-variant max-w-xs mx-auto font-light leading-relaxed italic">
            No courses in this category. Propose your first draft and start your instructional
            journey.
          </p>
        </div>
      ) : (
        <div className="grid gap-8 lg:grid-cols-2">
          {courses.map((course) => (
            <div
              key={course.id}
              className="group/card flex flex-col rounded-4xl border border-outline-variant/40 bg-surface-container-lowest/80 backdrop-blur-3xl overflow-hidden shadow-sm transition-all duration-300 hover:shadow-2xl hover:border-primary/20 relative"
            >
              <div className="absolute top-0 right-0 w-32 h-32 bg-primary/2 rounded-full -mr-16 -mt-16 blur-2xl group-hover/card:bg-primary/5 transition-colors"></div>

              <CourseCard
                course={course}
                managementHref={{ params: { id: course.id }, to: "/dashboard/courses/$id/edit" }}
              />

              <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-4 border-t border-outline-variant/10 bg-primary/2 p-4 relative z-10">
                <div className="flex gap-2">
                  {course.status !== "PENDING" &&
                    course.status !== "PUBLISHED" &&
                    course.status !== "ARCHIVED" && (
                      <Button
                        size="sm"
                        onClick={() => void handleSubmit(course.id)}
                        className="h-10 rounded-xl px-5 font-bold text-[0.65rem] uppercase tracking-widest bg-primary hover:bg-primary-hover shadow-md transition-all hover:scale-[1.05]"
                      >
                        <Send className="size-3.5 mr-2" />
                        Submit Proposals
                      </Button>
                    )}
                  {course.status !== "ARCHIVED" && (
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => void handleArchive(course.id)}
                      className="h-10 rounded-xl px-5 font-bold text-[0.65rem] uppercase tracking-widest border-outline-variant/40 hover:bg-red-50 hover:text-red-500 hover:border-red-200 transition-all font-body"
                    >
                      <Archive className="size-3.5 mr-2" />
                      Archive
                    </Button>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
