import { useQueries } from "@tanstack/react-query";
import { createFileRoute, useRouter } from "@tanstack/react-router";
import { GraduationCap, ChevronLeft } from "lucide-react";
import type { JSX } from "react";
import { useState } from "react";
import { toast } from "sonner";

import {
  CourseEditor,
  CourseEditorSkeleton,
  type CourseEditorValues
} from "@/components/courses/course-editor";
import { RouteErrorView } from "@/components/common/route-error";
import { Button } from "@/components/ui/button";
import type { CategoryNode } from "@/lib/api/categories";
import { listCategories } from "@/lib/api/categories";
import type { CourseTeacherOption } from "@/lib/api/courses";
import {
  createCourse,
  listTeacherDirectory,
  replaceCourseTeachers,
  submitCourse
} from "@/lib/api/courses";
import { queryKeys } from "@/lib/query/keys";

export const Route = createFileRoute("/dashboard/courses/new")({
  component: CreateCoursePage,
  errorComponent: RouteErrorView
} as never);

const initialValues: CourseEditorValues = {
  categoryId: "",
  coverImageUrl: undefined,
  description: "",
  isExamOnly: false,
  price: 0,
  teacherIds: [],
  title: ""
};

function CreateCoursePage(): JSX.Element {
  const router = useRouter();
  const [isSaving, setIsSaving] = useState(false);
  const [categoriesQuery, teachersQuery] = useQueries({
    queries: [
      { queryFn: async () => listCategories(), queryKey: queryKeys.categories.list() },
      {
        queryFn: async () => listTeacherDirectory(),
        queryKey: queryKeys.courses.teacherDirectory("")
      }
    ]
  });
  const categories: readonly CategoryNode[] = categoriesQuery?.data ?? [];
  const teachers: readonly CourseTeacherOption[] = teachersQuery?.data ?? [];
  const isLoading = Boolean(categoriesQuery?.isPending) || Boolean(teachersQuery?.isPending);

  const handleCommit = async (
    values: CourseEditorValues,
    action: "save" | "submit"
  ): Promise<void> => {
    setIsSaving(true);

    try {
      const course = await createCourse({
        categoryId: values.categoryId,
        coverImageUrl: values.coverImageUrl,
        description: values.description,
        isExamOnly: values.isExamOnly,
        price: values.price,
        title: values.title
      });

      await replaceCourseTeachers(course.id, values.teacherIds);

      if (action === "submit") {
        await submitCourse(course.id);
        toast.success("Course created and submitted for review");
      } else {
        toast.success("Course draft created");
      }

      await router.navigate({
        params: { id: course.id },
        to: "/dashboard/courses"
      });
    } finally {
      setIsSaving(false);
    }
  };

  if (isLoading) {
    return (
      <div className="space-y-8">
        <CourseEditorSkeleton />
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* Creation Header */}
      <div className="bg-surface-container-lowest/80 p-8 sm:p-10 border border-outline-variant/40 relative w-full overflow-hidden group">

        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-6">
          <div className="space-y-3">
            <div className="flex items-center gap-3 mb-2">
              <div className="size-10 bg-primary/10 flex items-center justify-center text-primary border border-primary/10">
                <GraduationCap className="size-6" />
              </div>
              <h3 className="font-body text-3xl font-medium tracking-tight text-on-surface">
                Course Proposal
              </h3>
            </div>
            <p className="text-sm text-on-surface-variant font-light max-w-2xl leading-relaxed">
              Transform your niche expertise into a structured academic experience. Follow our
              curation builder to create a submission-ready syllabus.
            </p>
          </div>

          <Button
            variant="outline"
            className="h-11 border-outline-variant/30 hover:bg-surface-container-high transition-all"
            onClick={() => router.navigate({ to: "/dashboard/courses" })}
          >
            <ChevronLeft className="size-4 mr-2" />
            Workshop Index
          </Button>
        </div>
      </div>

      <CourseEditor
        categories={categories}
        description="Construct your academic proposal across four distinct layers of curation."
        initialValues={initialValues}
        isSaving={isSaving}
        teachers={teachers}
        title="Curriculum Builder"
        onCommit={handleCommit}
      />
    </div>
  );
}
