import { Link, createFileRoute } from "@tanstack/react-router";
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
import { Card, CardContent } from "@/components/ui/card";
import type { CategoryNode } from "@/lib/api/categories";
import { listCategories } from "@/lib/api/categories";
import type { CourseDetail, CourseTeacherOption } from "@/lib/api/courses";
import {
  getCourse,
  listTeacherDirectory,
  replaceCourseTeachers,
  submitCourse,
  updateCourse
} from "@/lib/api/courses";

export const Route = createFileRoute("/dashboard/courses/$id/edit" as never)({
  component: EditCoursePage,
  errorComponent: RouteErrorView
} as never);

function mapInitialValues(course: CourseDetail): CourseEditorValues {
  return {
    categoryId: course.category.id,
    coverImageUrl: course.coverImageUrl ?? undefined,
    description: course.description,
    isExamOnly: course.isExamOnly,
    price: Number(course.price),
    teacherIds: course.teachers.map((teacher) => teacher.id),
    title: course.title
  };
}

function EditCoursePage(): JSX.Element {
  const { id } = Route.useParams();
  const [categories, setCategories] = useState<readonly CategoryNode[]>([]);
  const [course, setCourse] = useState<CourseDetail | null>(null);
  const [teachers, setTeachers] = useState<readonly CourseTeacherOption[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);

  const loadData = async (): Promise<void> => {
    setIsLoading(true);

    try {
      const [courseData, categoryData, teacherData] = await Promise.all([
        getCourse(id),
        listCategories(),
        listTeacherDirectory()
      ]);
      setCourse(courseData);
      setCategories(categoryData);
      setTeachers(teacherData);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    void loadData();
  }, [id]);

  const handleCommit = async (
    values: CourseEditorValues,
    action: "save" | "submit"
  ): Promise<void> => {
    setIsSaving(true);

    try {
      await updateCourse(id, {
        categoryId: values.categoryId,
        coverImageUrl: values.coverImageUrl,
        description: values.description,
        isExamOnly: values.isExamOnly,
        price: values.price,
        title: values.title
      });
      await replaceCourseTeachers(id, values.teacherIds);

      if (action === "submit") {
        await submitCourse(id);
        toast.success("Course updated and submitted");
      } else {
        toast.success("Course updated");
      }

      await loadData();
    } finally {
      setIsSaving(false);
    }
  };

  if (isLoading || !course) {
    return <CourseEditorSkeleton />;
  }

  return (
    <div className="space-y-4">
      <Card>
        <CardContent className="flex flex-wrap items-center justify-between gap-3 p-6">
          <div>
            <p className="font-semibold text-on-surface">Course content builder</p>
            <p className="text-sm leading-6 text-on-surface/70">
              Move into chapters, lectures, and materials once the course shell is ready.
            </p>
          </div>
          <Button asChild variant="outline">
            <Link to="/dashboard/courses/$id/content" params={{ id: course.id }}>
              Open content builder
            </Link>
          </Button>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="flex flex-wrap items-center justify-between gap-3 p-6">
          <div>
            <p className="font-semibold text-on-surface">Assessment builder</p>
            <p className="text-sm leading-6 text-on-surface/70">
              Create MCQ and written tests, manage questions, and open grading queues.
            </p>
          </div>
          <Button asChild variant="outline">
            <Link to="/dashboard/courses/$id/tests" params={{ id: course.id }}>
              Open assessment builder
            </Link>
          </Button>
        </CardContent>
      </Card>

      <CourseEditor
        categories={categories}
        description="Refine the offer, revise rejection feedback, and resubmit the draft when it is ready."
        initialValues={mapInitialValues(course)}
        isSaving={isSaving}
        teachers={teachers}
        title={`Edit ${course.title}`}
        onCommit={handleCommit}
      />
    </div>
  );
}
