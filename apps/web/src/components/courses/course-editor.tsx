import type { JSX } from "react";
import { useEffect, useMemo, useRef, useState } from "react";
import { toast } from "sonner";
import { ArrowRight, Check, Search } from "lucide-react";
import type { Translator } from "@genex/i18n";

import { CategorySelector } from "@/components/categories/category-selector";
import { ImageCropUploader } from "@/components/uploads/image-crop-uploader";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { ResponsiveImage } from "@/components/ui/responsive-image";
import { RichTextEditor } from "@/components/ui/rich-text-editor";
import { Skeleton } from "@/components/ui/skeleton";
import type { CategoryNode } from "@/lib/api/categories";
import type { CourseTeacherOption, CreateCourseInput } from "@/lib/api/courses";
import { uploadCourseCover } from "@/lib/api/uploads";
import { cn } from "@/lib/utils";
import { useT } from "@/lib/i18n/locale-context";

export interface CourseEditorValues extends CreateCourseInput {
  teacherIds: readonly string[];
}

export type AutosaveStatus = "idle" | "saving" | "saved" | "blocked";

interface CourseEditorProps {
  categories: readonly CategoryNode[];
  initialValues: CourseEditorValues;
  isSaving: boolean;
  /** True while a background autosave round trip is in flight. */
  autosaveStatus: AutosaveStatus;
  onAutosave: (values: CourseEditorValues) => Promise<void>;
  onCommit: (values: CourseEditorValues, action: "save" | "continue") => Promise<void>;
  teachers: readonly CourseTeacherOption[];
}

interface CourseEditorErrors {
  categoryId?: string | undefined;
  description?: string | undefined;
  price?: string | undefined;
  title?: string | undefined;
}

function validate(values: CourseEditorValues, t: Translator): CourseEditorErrors {
  const errors: CourseEditorErrors = {};
  if (values.title.trim().length < 3) errors.title = t("author.errorTitle");
  if (values.description.trim().length < 24) errors.description = t("author.errorDescription");
  if (!values.categoryId) errors.categoryId = t("author.errorCategory");
  if (Number.isNaN(values.price) || values.price < 0) errors.price = t("author.errorPrice");
  return errors;
}

function Required(): JSX.Element {
  return <span className="text-error"> *</span>;
}

const maxTeachers = 10;

export function CourseEditor({
  categories,
  initialValues,
  isSaving,
  autosaveStatus,
  onAutosave,
  onCommit,
  teachers
}: CourseEditorProps): JSX.Element {
  const t = useT();

  const [values, setValues] = useState<CourseEditorValues>(initialValues);
  const [touched, setTouched] = useState<Record<string, boolean>>({});
  const [teacherSearch, setTeacherSearch] = useState("");
  const hydrated = useRef(false);
  const onAutosaveRef = useRef(onAutosave);
  const autosaveTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    onAutosaveRef.current = onAutosave;
  }, [onAutosave]);

  useEffect(() => {
    if (!hydrated.current) {
      hydrated.current = true;
      return;
    }

    autosaveTimeoutRef.current = setTimeout(() => {
      void onAutosaveRef.current(values);
    }, 1500);

    return () => {
      if (autosaveTimeoutRef.current) {
        clearTimeout(autosaveTimeoutRef.current);
        autosaveTimeoutRef.current = null;
      }
    };
    // Autosave intentionally runs on any edit, including the two that
    // rerender without changing required fields.
  }, [values]);

  const errors = useMemo(() => validate(values, t), [t, values]);

  const filteredTeachers = useMemo(
    () =>
      teacherSearch.trim()
        ? teachers.filter(
            (teacher) =>
              teacher.name.toLowerCase().includes(teacherSearch.toLowerCase()) ||
              teacher.email.toLowerCase().includes(teacherSearch.toLowerCase())
          )
        : teachers,
    [teachers, teacherSearch]
  );

  const markTouched = (field: keyof CourseEditorErrors): void => {
    setTouched((current) => ({ ...current, [field]: true }));
  };

  const toggleTeacher = (teacherId: string): void => {
    setValues((currentValues) => {
      if (currentValues.teacherIds.includes(teacherId)) {
        return {
          ...currentValues,
          teacherIds: currentValues.teacherIds.filter((id) => id !== teacherId)
        };
      }
      if (currentValues.teacherIds.length >= maxTeachers) {
        toast.error(t("author.instructorLimit", { count: String(maxTeachers) }));
        return currentValues;
      }
      return { ...currentValues, teacherIds: [...currentValues.teacherIds, teacherId] };
    });
  };

  const handleCommit = (action: "save" | "continue"): void => {
    if (autosaveTimeoutRef.current) {
      clearTimeout(autosaveTimeoutRef.current);
      autosaveTimeoutRef.current = null;
    }

    const nextErrors = validate(values, t);
    setTouched({ description: true, price: true, title: true, categoryId: true });
    if (Object.keys(nextErrors).length > 0) {
      toast.error(t("editor.hasErrors"));
      return;
    }
    void onCommit(values, action);
  };

  const autosaveHint: Record<AutosaveStatus, string> = {
    idle: "",
    saving: t("author.autosaveSaving"),
    saved: t("author.autosaveSaved"),
    blocked: t("author.autosaveBlocked")
  };

  return (
    <div className="flex min-h-160 flex-col overflow-hidden border border-hairline bg-card">
      <div className="space-y-10 p-6 sm:p-10">
        <section className="space-y-5">
          <div className="border-b border-hairline pb-3">
            <h3 className="font-body text-xl font-medium text-ink">{t("author.basicTitle")}</h3>
            <p className="mt-1 text-base font-light leading-relaxed text-muted">
              {t("author.basicLead")}
            </p>
          </div>

          <div className="grid gap-5 md:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="course-title" className="label-mono text-xs text-muted">
                {t("editor.title")}
                <Required />
              </Label>
              <Input
                id="course-title"
                error={touched.title ? errors.title : undefined}
                placeholder={t("author.courseNamePlaceholder")}
                value={values.title}
                onBlur={() => markTouched("title")}
                onChange={(e) => setValues((cv) => ({ ...cv, title: e.target.value }))}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="course-category" className="label-mono text-xs text-muted">
                {t("editor.category")}
                <Required />
              </Label>
              <CategorySelector
                categories={categories}
                error={touched.categoryId ? errors.categoryId : undefined}
                id="course-category"
                includeRootOption={false}
                value={values.categoryId ?? ""}
                onChange={(v) => setValues((cv) => ({ ...cv, categoryId: v }))}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="course-price" className="label-mono text-xs text-muted">
                {t("editor.price")}
              </Label>
              <Input
                id="course-price"
                error={touched.price ? errors.price : undefined}
                min={0}
                step="100"
                type="number"
                placeholder={t("author.coursePricePlaceholder")}
                value={values.price}
                onBlur={() => markTouched("price")}
                onChange={(e) => setValues((cv) => ({ ...cv, price: Number(e.target.value) }))}
              />
            </div>

            <div className="flex items-end">
              <label className="flex w-full cursor-pointer items-start gap-4 border border-hairline bg-panel-warm/40 p-5">
                <input
                  type="checkbox"
                  checked={values.isExamOnly}
                  className="mt-1 size-5 accent-ink"
                  onChange={(e) => setValues((cv) => ({ ...cv, isExamOnly: e.target.checked }))}
                />
                <div className="flex flex-col gap-1">
                  <span className="text-sm font-medium text-ink">{t("editor.examOnly")}</span>
                  <span className="text-sm font-light leading-relaxed text-muted">
                    {t("author.examOnlyLead")}
                  </span>
                </div>
              </label>
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="course-description" className="label-mono text-xs text-muted">
              {t("editor.description")}
              <Required />
            </Label>
            <RichTextEditor
              id="course-description"
              error={touched.description ? errors.description : undefined}
              placeholder={t("author.courseDescriptionPlaceholder")}
              value={values.description}
              onChange={(value) => setValues((cv) => ({ ...cv, description: value }))}
            />
          </div>
        </section>

        <section className="space-y-5">
          <div className="border-b border-hairline pb-3">
            <h3 className="font-body text-xl font-medium text-ink">
              {t("author.courseCoverTitle")}
            </h3>
            <p className="mt-1 text-base font-light leading-relaxed text-muted">
              {t("author.courseCoverLead")}
            </p>
          </div>

          <div className="grid gap-6 md:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
            <div className="border border-hairline bg-panel-warm/40 p-6">
              <ImageCropUploader
                aspect={16 / 9}
                buttonLabel={values.coverImageUrl ? t("common.modify") : t("upload.chooseImage")}
                description={t("author.courseCoverLead")}
                label={t("editor.cover")}
                previewAlt={t("author.courseCoverTitle")}
                successMessage={t("author.courseCoverUpdated")}
                value={values.coverImageUrl ?? ""}
                onUploadFile={uploadCourseCover}
                onValueChange={(url) =>
                  setValues((cv) => ({ ...cv, coverImageUrl: url || undefined }))
                }
              />
              {values.coverImageUrl ? (
                <Button
                  variant="ghost"
                  size="sm"
                  className="mt-4 text-error"
                  onClick={() => setValues((cv) => ({ ...cv, coverImageUrl: undefined }))}
                >
                  {t("editor.discard")}
                </Button>
              ) : null}
            </div>

            <div className="aspect-video overflow-hidden border border-hairline bg-placeholder-fill">
              {values.coverImageUrl ? (
                <ResponsiveImage
                  sizes="(min-width: 1024px) 50vw, 100vw"
                  src={values.coverImageUrl}
                  className="h-full w-full object-cover"
                  alt={t("author.courseCoverTitle")}
                />
              ) : (
                <div className="flex h-full items-center justify-center">
                  <span className="font-display text-xl font-medium tracking-tighter text-muted-faint">
                    {t("editor.preview")}
                  </span>
                </div>
              )}
            </div>
          </div>
        </section>

        <section className="space-y-5">
          <div className="flex flex-wrap items-start justify-between gap-4 border-b border-hairline pb-3">
            <div>
              <h3 className="font-body text-xl font-medium text-ink">{t("editor.teachers")}</h3>
              <p className="mt-1 text-base font-light leading-relaxed text-muted">
                {t("author.instructorLead")}
              </p>
            </div>
            <span className="label-mono text-xs text-muted">
              {values.teacherIds.length}/{maxTeachers}
            </span>
          </div>

          <div className="max-w-sm">
            <Label htmlFor="teacher-search" className="label-mono text-xs text-muted">
              {t("author.instructorSearch")}
            </Label>
            <div className="relative">
              <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-faint" />
              <Input
                id="teacher-search"
                className="pl-10"
                placeholder={t("author.instructorSearch")}
                value={teacherSearch}
                onChange={(e) => setTeacherSearch(e.target.value)}
              />
            </div>
          </div>

          {filteredTeachers.length === 0 ? (
            <p className="border border-dashed border-dot-idle px-4 py-6 text-sm font-light text-muted">
              {t("author.noInstructor")}
            </p>
          ) : (
            <div className="grid gap-3 sm:grid-cols-2">
              {filteredTeachers.map((teacher) => {
                const isSelected = values.teacherIds.includes(teacher.id);
                return (
                  <button
                    key={teacher.id}
                    type="button"
                    onClick={() => toggleTeacher(teacher.id)}
                    className={cn(
                      "flex items-start gap-4 border p-5 text-left transition-colors",
                      isSelected
                        ? "border-line-strong bg-chip-active"
                        : "border-hairline bg-panel-warm/40 hover:border-line-strong"
                    )}
                  >
                    <div className="flex size-10 shrink-0 items-center justify-center border border-hairline bg-card font-bold text-ink">
                      {teacher.name.charAt(0)}
                    </div>
                    <div className="min-w-0 flex-1">
                      <span className="flex items-center gap-2 font-medium text-ink">
                        <span className="truncate">{teacher.name}</span>
                        {isSelected ? <Check className="size-4 shrink-0 text-ink" /> : null}
                      </span>
                      <span className="block truncate text-sm font-light text-muted">
                        {teacher.email}
                      </span>
                      {teacher.bio ? (
                        <span className="mt-2 line-clamp-2 block text-sm font-light leading-relaxed text-muted">
                          {teacher.bio}
                        </span>
                      ) : null}
                    </div>
                  </button>
                );
              })}
            </div>
          )}
        </section>
      </div>

      <footer className="sticky bottom-0 z-20 flex flex-wrap items-center justify-between gap-4 border-t border-hairline bg-panel-warm p-4 px-6 sm:px-10">
        <span className="label-mono hidden text-xs text-muted sm:block">
          {autosaveHint[autosaveStatus]}
        </span>

        <div className="flex items-center gap-3">
          <Button
            className="h-11"
            variant="ghost"
            onClick={() => handleCommit("save")}
            disabled={isSaving}
          >
            {t("author.saveBasic")}
          </Button>
          <Button className="h-11" onClick={() => handleCommit("continue")} disabled={isSaving}>
            {t("author.continueChapters")}
            <ArrowRight className="ml-2 size-4" />
          </Button>
        </div>
      </footer>
    </div>
  );
}

export function CourseEditorSkeleton(): JSX.Element {
  return (
    <div className="flex min-h-160 flex-col overflow-hidden border border-hairline bg-card">
      <div className="flex-1 space-y-8 p-10">
        <Skeleton className="h-10 w-64 bg-chip-active" />
        <Skeleton className="h-14 w-full bg-chip-active" />
        <Skeleton className="h-14 w-full bg-chip-active" />
      </div>
      <div className="flex items-center justify-between border-t border-hairline p-6">
        <Skeleton className="h-12 w-24 bg-chip-active" />
        <Skeleton className="h-12 w-32 bg-chip-active" />
      </div>
    </div>
  );
}
