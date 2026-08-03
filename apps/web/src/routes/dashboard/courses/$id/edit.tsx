import { useQueries, useQueryClient } from "@tanstack/react-query";
import { createFileRoute, useRouter } from "@tanstack/react-router";
import type { JSX } from "react";
import { useState } from "react";
import { toast } from "sonner";

import {
  CourseEditor,
  CourseEditorSkeleton,
  type AutosaveStatus,
  type CourseEditorValues
} from "@/components/courses/course-editor";
import { CourseBuilderSteps } from "@/components/courses/course-builder-steps";
import { RouteErrorView } from "@/components/common/route-error";
import type { CategoryNode } from "@/lib/api/categories";
import { listCategories } from "@/lib/api/categories";
import type { CourseDetail, CourseTeacherOption, UpdateCourseInput } from "@/lib/api/courses";
import {
  getCourse,
  listTeacherDirectory,
  replaceCourseTeachers,
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

/** Send only the fields that already pass their own rule, so a mid-typing
    autosave never silently contradicts the server's validator. */
function buildUpdatePatch(values: CourseEditorValues): UpdateCourseInput {
  const patch: UpdateCourseInput = {};
  if (values.title.trim().length >= 3) patch.title = values.title.trim();
  if (values.description.trim().length >= 24) patch.description = values.description.trim();
  if (values.categoryId) patch.categoryId = values.categoryId;
  if (!Number.isNaN(values.price) && values.price >= 0) patch.price = values.price;
  patch.isExamOnly = values.isExamOnly;
  if (values.coverImageUrl !== undefined) patch.coverImageUrl = values.coverImageUrl;
  return patch;
}

function EditCoursePage(): JSX.Element {
  const t = useT();

  const { id } = Route.useParams();
  const router = useRouter();
  const queryClient = useQueryClient();
  const [isSaving, setIsSaving] = useState(false);
  const [autosaveStatus, setAutosaveStatus] = useState<AutosaveStatus>("idle");
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

  const handleAutosave = async (values: CourseEditorValues): Promise<void> => {
    setAutosaveStatus("saving");
    try {
      const patch = buildUpdatePatch(values);
      if (Object.keys(patch).length > 0) {
        await updateCourse(id, patch);
      }
      await replaceCourseTeachers(id, values.teacherIds);
      setAutosaveStatus("saved");
    } catch {
      setAutosaveStatus("blocked");
    }
  };

  const handleCommit = async (
    values: CourseEditorValues,
    action: "continue" | "save"
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

      toast.success(t("cbuild.updated"));

      await loadData();

      if (action === "continue") {
        await router.navigate({
          params: { id },
          search: { stage: "chapters" },
          to: "/dashboard/courses/$id/content"
        });
      }
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
      <CourseEditor
        categories={categories}
        initialValues={mapInitialValues(course)}
        isSaving={isSaving}
        autosaveStatus={autosaveStatus}
        teachers={teachers}
        onAutosave={handleAutosave}
        onCommit={handleCommit}
      />
    </div>
  );
}
