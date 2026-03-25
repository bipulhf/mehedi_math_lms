import { createFileRoute, useRouter } from "@tanstack/react-router";
import type { JSX } from "react";
import { useEffect, useState } from "react";
import { toast } from "sonner";

import {
  CourseEditor,
  CourseEditorSkeleton,
  type CourseEditorValues
} from "@/components/courses/course-editor";
import { RouteErrorView } from "@/components/common/route-error";
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
    return <CourseEditorSkeleton />;
  }

  return (
    <CourseEditor
      categories={categories}
      description="Move from raw concept to a review-ready draft with a guided four-step builder."
      initialValues={initialValues}
      isSaving={isSaving}
      teachers={teachers}
      title="Create course"
      onCommit={handleCommit}
    />
  );
}
