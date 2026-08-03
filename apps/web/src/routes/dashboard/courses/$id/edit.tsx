import { useQueries, useQueryClient } from "@tanstack/react-query";
import { Link, createFileRoute } from "@tanstack/react-router";
import type { JSX } from "react";
import { useState } from "react";
import { toast } from "sonner";

import {
  CourseEditor,
  CourseEditorSkeleton,
  type CourseEditorValues
} from "@/components/courses/course-editor";
import { CourseBuilderSteps } from "@/components/courses/course-builder-steps";
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
import { queryKeys } from "@/lib/query/keys";
import { useT } from "@/lib/i18n/locale-context";

export const Route = createFileRoute("/dashboard/courses/$id/edit")({
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
  const t = useT();

  const { id } = Route.useParams();
  const queryClient = useQueryClient();
  const [isSaving, setIsSaving] = useState(false);
  const [courseQuery, categoriesQuery, teachersQuery] = useQueries({
    queries: [
      { queryFn: async () => getCourse(id), queryKey: queryKeys.courses.detail(id) },
      { queryFn: async () => listCategories(), queryKey: queryKeys.categories.list() },
      {
        queryFn: async () => listTeacherDirectory(),
        queryKey: queryKeys.courses.teacherDirectory("")
      }
    ]
  });
  const course: CourseDetail | null = courseQuery?.data ?? null;
  const categories: readonly CategoryNode[] = categoriesQuery?.data ?? [];
  const teachers: readonly CourseTeacherOption[] = teachersQuery?.data ?? [];
  const isLoading =
    Boolean(courseQuery?.isPending) ||
    Boolean(categoriesQuery?.isPending) ||
    Boolean(teachersQuery?.isPending);

  const loadData = async (): Promise<void> => {
    await queryClient.invalidateQueries({ queryKey: queryKeys.courses.detail(id) });
  };

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
        toast.success(t("cbuild.updatedSubmitted"));
      } else {
        toast.success(t("cbuild.updated"));
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
    <div className="space-y-8">
      <CourseBuilderSteps courseId={id} current="info" />
      <Card>
        <CardContent className="flex flex-wrap items-center justify-between gap-3 p-6">
          <div>
            <p className="font-semibold text-ink">{t("cbuild.contentTitle")}</p>
            <p className="text-sm leading-6 text-ink/70">{t("cbuild.contentLead")}</p>
          </div>
          <Button asChild variant="outline">
            <Link to="/dashboard/courses/$id/content" params={{ id: course.id }}>{t("cbuild.openContent")}</Link>
          </Button>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="flex flex-wrap items-center justify-between gap-3 p-6">
          <div>
            <p className="font-semibold text-ink">{t("cbuild.testsTitle")}</p>
            <p className="text-sm leading-6 text-ink/70">{t("cbuild.testsLead")}</p>
          </div>
          <Button asChild variant="outline">
            <Link to="/dashboard/courses/$id/tests" params={{ id: course.id }}>{t("cbuild.openTests")}</Link>
          </Button>
        </CardContent>
      </Card>

      <CourseEditor
        categories={categories}
        description={t("cbuild.editLead")}
        initialValues={mapInitialValues(course)}
        isSaving={isSaving}
        teachers={teachers}
        title={`Edit ${course.title}`}
        onCommit={handleCommit}
      />
    </div>
  );
}
