import { useQueries } from "@tanstack/react-query";
import { createFileRoute, useRouter } from "@tanstack/react-router";
import { GraduationCap, ChevronLeft } from "lucide-react";
import type { JSX } from "react";
import { useRef, useState } from "react";
import { toast } from "sonner";

import {
  CourseEditor,
  CourseEditorSkeleton,
  type AutosaveStatus,
  type CourseEditorValues
} from "@/components/courses/course-editor";
import { RouteErrorView } from "@/components/common/route-error";
import { Button } from "@/components/ui/button";
import type { CategoryNode } from "@/lib/api/categories";
import { listCategories } from "@/lib/api/categories";
import type { CourseTeacherOption, CreateCourseInput, UpdateCourseInput } from "@/lib/api/courses";
import {
  createCourse,
  listTeacherDirectory,
  replaceCourseTeachers,
  updateCourse
} from "@/lib/api/courses";
import { queryKeys } from "@/lib/query/keys";
import { useT } from "@/lib/i18n/locale-context";

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

/** The course row can only be created once the server's create validator is
    satisfied; until then the editor just holds local state. */
function createPayload(values: CourseEditorValues): CreateCourseInput | null {
  const hasBasics =
    values.title.trim().length >= 3 &&
    values.description.trim().length >= 24 &&
    !!values.categoryId &&
    !Number.isNaN(values.price) &&
    values.price >= 0;
  if (!hasBasics) {
    return null;
  }

  return {
    categoryId: values.categoryId,
    coverImageUrl: values.coverImageUrl,
    description: values.description,
    isExamOnly: values.isExamOnly,
    price: values.price,
    title: values.title
  };
}

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
  const t = useT();

  const router = useRouter();
  const [isSaving, setIsSaving] = useState(false);
  const [autosaveStatus, setAutosaveStatus] = useState<AutosaveStatus>("idle");
  const courseIdRef = useRef<string | null>(null);
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

  const handleAutosave = async (values: CourseEditorValues): Promise<void> => {
    if (!courseIdRef.current) {
      const payload = createPayload(values);
      if (!payload) {
        setAutosaveStatus("blocked");
        return;
      }
      setAutosaveStatus("saving");
      try {
        const course = await createCourse(payload);
        courseIdRef.current = course.id;
        if (values.teacherIds.length > 0) {
          await replaceCourseTeachers(course.id, values.teacherIds);
        }
        setAutosaveStatus("saved");
      } catch {
        setAutosaveStatus("blocked");
      }
      return;
    }

    setAutosaveStatus("saving");
    try {
      const patch = buildUpdatePatch(values);
      if (Object.keys(patch).length > 0) {
        await updateCourse(courseIdRef.current, patch);
      }
      if (values.teacherIds.length > 0) {
        await replaceCourseTeachers(courseIdRef.current, values.teacherIds);
      }
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
      let courseId = courseIdRef.current;

      if (courseId) {
        const patch = buildUpdatePatch(values);
        await updateCourse(courseId, patch);
        await replaceCourseTeachers(courseId, values.teacherIds);
      } else {
        const course = await createCourse({
          categoryId: values.categoryId,
          coverImageUrl: values.coverImageUrl,
          description: values.description,
          isExamOnly: values.isExamOnly,
          price: values.price,
          title: values.title
        });
        courseId = course.id;
        courseIdRef.current = course.id;
        await replaceCourseTeachers(course.id, values.teacherIds);
      }

      toast.success(t("newcourse.createdDraft"));

      if (action === "continue") {
        await router.navigate({
          params: { id: courseId },
          search: { stage: "chapters" },
          to: "/dashboard/courses/$id/content"
        });
      } else {
        await router.navigate({
          params: { id: courseId },
          to: "/dashboard/courses/$id/edit"
        });
      }
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
      <div className="bg-card/80 p-8 sm:p-10 border border-hairline/40 relative w-full overflow-hidden group">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-6">
          <div className="space-y-3">
            <div className="flex items-center gap-3 mb-2">
              <div className="size-10 bg-ink/10 flex items-center justify-center text-ink border border-ink/10">
                <GraduationCap className="size-6" />
              </div>
              <h3 className="font-body text-3xl font-medium tracking-tight text-ink">
                {t("newcourse.title")}
              </h3>
            </div>
            <p className="text-base text-muted font-light leading-relaxed">{t("newcourse.lead")}</p>
          </div>

          <Button
            variant="outline"
            className="h-11 border-hairline/30 hover:bg-chip-active transition-all"
            onClick={() => router.navigate({ to: "/dashboard/courses" })}
          >
            <ChevronLeft className="size-4 mr-2" />
            {t("cbuild.back")}
          </Button>
        </div>
      </div>

      <CourseEditor
        categories={categories}
        initialValues={initialValues}
        isSaving={isSaving}
        autosaveStatus={autosaveStatus}
        teachers={teachers}
        onAutosave={handleAutosave}
        onCommit={handleCommit}
      />
    </div>
  );
}
