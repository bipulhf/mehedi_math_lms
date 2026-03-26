import { createFileRoute, useRouter } from "@tanstack/react-router";
import { GraduationCap, ChevronLeft } from "lucide-react";
import type { JSX } from "react";
import { useEffect, useState } from "react";
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
import { createCourse, listTeacherDirectory, replaceCourseTeachers, submitCourse } from "@/lib/api/courses";

export const Route = createFileRoute("/dashboard/courses/new" as never)({
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
  const [categories, setCategories] = useState<readonly CategoryNode[]>([]);
  const [teachers, setTeachers] = useState<readonly CourseTeacherOption[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    void (async () => {
      setIsLoading(true);

      try {
        const [categoryData, teacherData] = await Promise.all([
          listCategories(),
          listTeacherDirectory()
        ]);
        setCategories(categoryData);
        setTeachers(teacherData);
      } finally {
        setIsLoading(false);
      }
    })();
  }, []);

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
        to: "/dashboard/courses/$id/edit"
      });
    } finally {
      setIsSaving(false);
    }
  };

  if (isLoading) {
    return (
       <div className="space-y-8 animate-in fade-in duration-700">
          <CourseEditorSkeleton />
       </div>
    );
  }

  return (
    <div className="space-y-8 animate-in fade-in duration-700">
      {/* Creation Header */}
      <div className="bg-surface-container-lowest/80 backdrop-blur-3xl rounded-4xl p-8 sm:p-10 border border-outline-variant/40 shadow-xl relative w-full overflow-hidden group">
        <div className="absolute -top-12 -right-12 w-48 h-48 bg-primary/5 rounded-full blur-2xl pointer-events-none group-hover:bg-primary/10 transition-all duration-1000 z-[-1]" />
        
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-6">
           <div className="space-y-3">
              <div className="flex items-center gap-3 mb-2">
                 <div className="size-10 rounded-2xl bg-primary/10 flex items-center justify-center text-primary shadow-inner border border-primary/10">
                    <GraduationCap className="size-6" />
                 </div>
                 <h3 className="font-headline text-3xl font-extrabold tracking-tight text-on-surface">Course Proposal</h3>
              </div>
              <p className="text-sm text-on-surface-variant font-light max-w-2xl leading-relaxed">
                Transform your niche expertise into a structured academic experience. Follow our curation builder to create a submission-ready syllabus.
              </p>
           </div>
           
           <Button variant="outline" className="h-11 rounded-2xl border-outline-variant/30 hover:bg-surface-container-high transition-all" onClick={() => router.navigate({ to: "/dashboard/courses" })}>
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
