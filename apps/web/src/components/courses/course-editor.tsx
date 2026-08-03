import type { JSX } from "react";
import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import {
  Info,
  Image as ImageIcon,
  Users,
  SearchCheck,
  ChevronRight,
  ChevronLeft,
  CheckCircle2,
  AlertCircle,
  X,
  Send,
  Layers3,
  ArrowRight
} from "lucide-react";

import { CategorySelector } from "@/components/categories/category-selector";
import { ImageCropUploader } from "@/components/uploads/image-crop-uploader";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { ResponsiveImage } from "@/components/ui/responsive-image";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import type { CategoryNode } from "@/lib/api/categories";
import type { CourseTeacherOption, CreateCourseInput } from "@/lib/api/courses";
import { uploadCourseCover } from "@/lib/api/uploads";
import { cn } from "@/lib/utils";
import { useT } from "@/lib/i18n/locale-context";

export interface CourseEditorValues extends CreateCourseInput {
  teacherIds: readonly string[];
}

type EditorAction = "save" | "submit";

interface CourseEditorProps {
  categories: readonly CategoryNode[];
  description: string;
  initialValues: CourseEditorValues;
  isSaving: boolean;
  onCommit: (values: CourseEditorValues, action: EditorAction) => Promise<void>;
  teachers: readonly CourseTeacherOption[];
  title: string;
}

interface CourseEditorErrors {
  categoryId?: string | undefined;
  description?: string | undefined;
  price?: string | undefined;
  teacherIds?: string | undefined;
  title?: string | undefined;
}

const editorSteps = [
  {
    description: "Definition of academic fundamentals",
    id: "basics",
    title: "Basic Details",
    icon: Info
  },
  {
    description: "Visual identity and indexing",
    id: "cover",
    title: "Cover Imagery",
    icon: ImageIcon
  },
  {
    description: "Instructor assignment",
    id: "teachers",
    title: "Instructor",
    icon: Users
  },
  {
    description: "Consolidated curatorial review",
    id: "review",
    title: "Full Audit",
    icon: SearchCheck
  }
] as const;

function flattenCategories(categories: readonly CategoryNode[]): readonly CategoryNode[] {
  return categories.flatMap((category) => [category, ...flattenCategories(category.children)]);
}

function validate(values: CourseEditorValues): CourseEditorErrors {
  const errors: CourseEditorErrors = {};
  if (values.title.trim().length < 3)
    errors.title = "At least 3 characters required for academic title";
  if (values.description.trim().length < 24)
    errors.description = "Provide a comprehensive description (24+ chars)";
  if (!values.categoryId) errors.categoryId = "A valid academic category must be selected";
  if (Number.isNaN(values.price) || values.price < 0)
    errors.price = "Tuition fee cannot be negative";
  if (values.teacherIds.length === 0)
    errors.teacherIds = "At least one lead instructor is required";
  return errors;
}

function Required() {
  return <span className="text-red-500 ml-1 font-medium">*</span>;
}

export function CourseEditor({
  categories,
  initialValues,
  isSaving,
  onCommit,
  teachers
}: CourseEditorProps): JSX.Element {
  const t = useT();

  const [currentStep, setCurrentStep] = useState(0);
  const [errors, setErrors] = useState<CourseEditorErrors>({});
  const [values, setValues] = useState<CourseEditorValues>(initialValues);

  useEffect(() => {
    setValues(initialValues);
  }, [initialValues]);

  const selectedTeachers = useMemo(
    () => teachers.filter((teacher) => values.teacherIds.includes(teacher.id)),
    [teachers, values.teacherIds]
  );

  const canContinue = useMemo(() => {
    if (currentStep === 0) {
      return (
        values.title.trim().length >= 3 &&
        !!values.categoryId &&
        values.description.trim().length >= 24
      );
    }
    if (currentStep === 1) {
      return !!values.coverImageUrl;
    }
    if (currentStep === 2) {
      return values.teacherIds.length > 0;
    }
    return true;
  }, [currentStep, values]);

  const handleToggleTeacher = (teacherId: string): void => {
    setValues((currentValues) => ({
      ...currentValues,
      teacherIds: currentValues.teacherIds.includes(teacherId)
        ? currentValues.teacherIds.filter((id) => id !== teacherId)
        : [...currentValues.teacherIds, teacherId]
    }));
  };

  const handleNext = () => {
    if (!canContinue) return;
    setCurrentStep((s) => Math.min(s + 1, editorSteps.length - 1));
  };

  const handleCommit = async (action: EditorAction): Promise<void> => {
    const nextErrors = validate(values);
    setErrors(nextErrors);
    if (Object.keys(nextErrors).length > 0) {
      toast.error(t("editor.hasErrors"));
      return;
    }
    await onCommit(values, action);
  };

  return (
    <div className="bg-card/80 border border-hairline/40 overflow-hidden min-h-160 flex flex-col">
      {/* Horizontal Top Stepper */}
      <nav className="bg-panel-warm/30 border-b border-hairline/10 p-6 sm:p-8">
        <div className="max-w-4xl mx-auto">
          <div className="flex items-center justify-between mb-8 overflow-x-auto no-scrollbar pb-2 sm:pb-0">
            {editorSteps.map((step, index) => {
              const Icon = step.icon;
              const isActive = index === currentStep;
              const isCompleted = index < currentStep;

              return (
                <div
                  key={step.id}
                  className="flex items-center group/step shrink-0 last:flex-1 last:justify-end"
                >
                  <button
                    onClick={() => {
                      // Allow clicking back or jump to any step IF previous steps are valid (or just simpler: allow clicking back)
                      if (index < currentStep) setCurrentStep(index);
                    }}
                    className={cn(
                      "flex flex-col items-center gap-2 transition-all duration-300",
                      isActive ? "opacity-100" : isCompleted ? "opacity-80" : "opacity-40"
                    )}
                    disabled={index > currentStep}
                  >
                    <div
                      className={cn(
                        "size-10 sm:size-12 rounded-2xl flex items-center justify-center transition-all duration-500",
                        isActive
                          ? "bg-ink text-white shadow-lg scale-110"
                          : isCompleted
                            ? "bg-green-500/10 text-green-500"
                            : "bg-chip-active/50 text-ink/30"
                      )}
                    >
                      {isCompleted ? (
                        <CheckCircle2 className="size-5 sm:size-6" />
                      ) : (
                        <Icon className="size-5 sm:size-6" />
                      )}
                    </div>
                    <span
                      className={cn(
                        "text-[0.6rem] sm:text-[0.65rem] font-bold uppercase tracking-widest hidden sm:block",
                        isActive ? "text-ink" : "text-ink"
                      )}
                    >
                      {step.title}
                    </span>
                  </button>

                  {index < editorSteps.length - 1 && (
                    <div className="mx-4 sm:mx-8 w-8 sm:w-16 h-px bg-hairline/20 relative">
                      <div
                        className={cn(
                          "absolute inset-y-0 left-0 bg-ink transition-all duration-700",
                          isCompleted ? "w-full" : "w-0"
                        )}
                      />
                    </div>
                  )}
                </div>
              );
            })}
          </div>

          <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
            <div>
              <Badge
                tone="neutral"
                className="rounded-full px-4 py-1.5 text-[0.6rem] bg-violet-500/10 font-medium border-violet-500/20 uppercase tracking-widest"
              >
                LAYER 0{currentStep + 1}
              </Badge>
            </div>
            <div className="flex items-center gap-3">
              <div className="w-32 sm:w-48 h-1.5 rounded-full bg-chip-active overflow-hidden">
                <div
                  className="h-full bg-ink transition-all"
                  style={{ width: `${((currentStep + 1) / editorSteps.length) * 100}%` }}
                />
              </div>
              <span className="text-xs font-bold font-mono text-ink text-right min-w-[3ch]">
                {Math.round(((currentStep + 1) / editorSteps.length) * 100)}%
              </span>
            </div>
          </div>
        </div>
      </nav>

      {/* Content Area */}
      <div className="flex-1 flex flex-col">
        <div className="p-6 sm:p-12 flex-1 max-w-5xl mx-auto w-full">
          <div className="mb-10 text-center sm:text-left">
            <h4 className="text-2xl sm:text-3xl font-body font-medium text-ink tracking-tight mb-2 leading-tight">
              {editorSteps[currentStep]!.description}
            </h4>
            <p className="text-sm text-ink/40 font-medium italic">{t("editor.required")}<Required /> are required for curatorial clearance.
            </p>
          </div>

          <div className="mt-8">
            {currentStep === 0 && (
              <div>
                <div className="space-y-3 md:col-span-2">
                  <Label
                    htmlFor="course-title"
                    className="text-[0.65rem] font-bold uppercase tracking-widest ml-1 opacity-50"
                  >{t("editor.title")}<Required />
                  </Label>
                  <Input
                    id="course-title"
                    error={errors.title}
                    placeholder="e.g. Higher Math: The Final Sprint 2024"
                    className="h-14 bg-panel-warm/50 border-hairline/30 font-body text-base"
                    value={values.title}
                    onChange={(e) => setValues((cv) => ({ ...cv, title: e.target.value }))}
                  />
                </div>
                <div className="space-y-3">
                  <Label
                    htmlFor="course-category"
                    className="text-[0.65rem] font-bold uppercase tracking-widest ml-1 opacity-50"
                  >{t("editor.category")}<Required />
                  </Label>
                  <CategorySelector
                    categories={categories}
                    error={errors.categoryId}
                    id="course-category"
                    includeRootOption={false}
                    value={values.categoryId ?? ""}
                    onChange={(v) => setValues((cv) => ({ ...cv, categoryId: v }))}
                  />
                </div>
                <div className="space-y-3">
                  <Label
                    htmlFor="course-price"
                    className="text-[0.65rem] font-bold uppercase tracking-widest ml-1 opacity-50"
                  >{t("editor.price")}<Required />
                  </Label>
                  <Input
                    id="course-price"
                    error={errors.price}
                    min={0}
                    step="100"
                    type="number"
                    placeholder="0 for curated free courses"
                    className="h-14 bg-panel-warm/50 border-hairline/30 font-body text-base"
                    value={values.price}
                    onChange={(e) => setValues((cv) => ({ ...cv, price: Number(e.target.value) }))}
                  />
                </div>
                <div className="space-y-3 md:col-span-2">
                  <Label
                    htmlFor="course-description"
                    className="text-[0.65rem] font-bold uppercase tracking-widest ml-1 opacity-50"
                  >{t("editor.description")}<Required />
                  </Label>
                  <Textarea
                    id="course-description"
                    error={errors.description}
                    placeholder="Detail the syllabus, outcomes, and prerequisites for the approval committee... (min 24 chars)"
                    className="min-h-40 bg-panel-warm/50 border-hairline/30 font-body text-base leading-relaxed p-6"
                    value={values.description}
                    onChange={(e) => setValues((cv) => ({ ...cv, description: e.target.value }))}
                  />
                </div>

                <div className="md:col-span-2">
                  <label className="flex items-start gap-4 p-6 border border-hairline/20 bg-ink/5 hover:bg-ink/10 transition-all group">
                    <input
                      type="checkbox"
                      checked={values.isExamOnly}
                      onChange={(e) => setValues((cv) => ({ ...cv, isExamOnly: e.target.checked }))}
                      className="size-5 mt-1 accent-ink transition-all"
                    />
                    <div className="flex flex-col gap-1">
                      <span className="text-sm font-bold text-ink">{t("editor.examOnly")}</span>
                      <span className="text-xs text-ink/50 font-medium">
                        When active, students bypass regular lessons for direct specialized
                        examination.
                      </span>
                    </div>
                  </label>
                </div>
              </div>
            )}

            {currentStep === 1 && (
              <div>
                <div className="space-y-6">
                  <div className="bg-panel-warm/40 p-8 border border-hairline/20 relative overflow-hidden flex flex-col items-center text-center">
                    <div className="absolute top-0 right-0 w-24 h-24 bg-ink/5 rounded-full blur-xl z-[-1]" />
                    <div className="size-16 bg-ink/10 flex items-center justify-center text-ink mb-4">
                      <ImageIcon className="size-8" />
                    </div>

                    <ImageCropUploader
                      aspect={16 / 9}
                      buttonLabel={values.coverImageUrl ? "Modify Visual" : "Assign Coverage"}
                      description="1280x720 recommended."
                      label={t("editor.cover")}
                      previewAlt="Course cover"
                      successMessage="Coverage updated"
                      value={values.coverImageUrl ?? ""}
                      onUploadFile={uploadCourseCover}
                      onValueChange={(url) =>
                        setValues((cv) => ({ ...cv, coverImageUrl: url || undefined }))
                      }
                    />

                    {values.coverImageUrl && (
                      <Button
                        variant="ghost"
                        size="sm"
                        className="mt-4 text-red-500/60 hover:text-red-500"
                        onClick={() => setValues((cv) => ({ ...cv, coverImageUrl: undefined }))}
                      >
                        <X className="size-4 mr-2" />{t("editor.discard")}</Button>
                    )}
                  </div>
                </div>

                <div className="relative group">
                  <div
                    className={cn(
                      "aspect-video w-full border overflow-hidden bg-placeholder-fill transition-colors",
                      values.coverImageUrl
                        ? "border-hairline/40 "
                        : "border-hairline/10 border-dashed"
                    )}
                  >
                    {values.coverImageUrl ? (
                      <ResponsiveImage
                        sizes="(min-width: 1024px) 50vw, 100vw"
                        src={values.coverImageUrl}
                        className="h-full w-full object-cover"
                        alt="Preview"
                      />
                    ) : (
                      <div className="h-full w-full flex items-center justify-center bg-linear-to-br from-ink/5 to-accent/5 opacity-40">
                        <span className="font-display font-medium text-4xl sm:text-6xl tracking-tighter text-ink/10">{t("editor.preview")}</span>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            )}

            {currentStep === 2 && (
              <div>
                <div className="flex flex-col sm:flex-row justify-between items-end gap-6 border-b border-hairline/10 pb-6">
                  <div>
                    <p className="text-[0.65rem] font-bold uppercase tracking-widest text-ink mb-2">{t("editor.teachers")}<Required />
                    </p>
                    <h5 className="text-xl font-body font-medium text-ink leading-tight">{t("editor.assignTeacher")}</h5>
                  </div>
                  <Badge
                    tone="quiet"
                    className="px-4 py-2 font-bold text-[0.65rem] border border-hairline/20"
                  >
                    {values.teacherIds.length} Selected
                  </Badge>
                </div>

                <div className="grid gap-6 sm:grid-cols-2">
                  {teachers.map((teacher) => {
                    const isSelected = values.teacherIds.includes(teacher.id);
                    return (
                      <button
                        key={teacher.id}
                        onClick={() => handleToggleTeacher(teacher.id)}
                        className={cn(
                          "group p-6 border text-left transition-colors relative overflow-hidden",
                          isSelected
                            ? "bg-chip-active border-line-strong"
                            : "bg-panel-warm/20 border-hairline/10 hover:border-ink/20 hover:bg-panel-warm/30"
                        )}
                      >
                        {isSelected && (
                          <div className="absolute top-4 right-4 text-ink">
                            <CheckCircle2 className="size-5" />
                          </div>
                        )}
                        <div className="flex items-center gap-4 mb-4">
                          <div className="size-12 bg-panel-warm border border-hairline/20 flex items-center justify-center font-body font-bold text-ink shrink-0">
                            {teacher.name.charAt(0)}
                          </div>
                          <div className="flex flex-col min-w-0">
                            <span className="font-body font-bold text-ink leading-none mb-1 truncate">
                              {teacher.name}
                            </span>
                            <span className="text-xs text-ink/40 italic truncate">
                              {teacher.email}
                            </span>
                          </div>
                        </div>
                        {teacher.bio && (
                          <p className="text-xs leading-relaxed text-ink/60 line-clamp-2">
                            {teacher.bio}
                          </p>
                        )}
                      </button>
                    );
                  })}
                </div>
              </div>
            )}

            {currentStep === 3 && (
              <div>
                <div className="space-y-6">
                  <div className="bg-card border border-hairline/30 p-6 sm:p-8 relative overflow-hidden">
                    <p className="text-[0.6rem] font-bold uppercase tracking-widest text-ink mb-6">{t("editor.preview")}</p>

                    <div className="space-y-8">
                      <section>
                        <h6 className="text-[0.6rem] uppercase font-bold tracking-[0.2em] text-ink/40 mb-3">{t("editor.title")}</h6>
                        <p className="font-body text-xl sm:text-2xl font-medium text-ink leading-tight">
                          {values.title || "Untitled curriculum"}
                        </p>
                      </section>

                      <div className="grid grid-cols-2 gap-8">
                        <section>
                          <h6 className="text-[0.6rem] uppercase font-bold tracking-[0.2em] text-ink/40 mb-2">{t("editor.category")}</h6>
                          <div className="flex items-center gap-2">
                            <Layers3 className="size-3.5 text-ink/60" />
                            <span className="text-sm font-bold text-ink/80">
                              {flattenCategories(categories).find((c) => c.id === values.categoryId)
                                ?.name ?? "Unspecified"}
                            </span>
                          </div>
                        </section>
                        <section>
                          <h6 className="text-[0.6rem] uppercase font-bold tracking-[0.2em] text-ink/40 mb-2">{t("editor.price")}</h6>
                          <div className="flex items-center gap-2">
                            <Badge
                              tone="neutral"
                              className="rounded-full text-[0.65rem] px-3 font-medium"
                            >
                              {values.price > 0
                                ? `BDT ${values.price.toLocaleString()}`
                                : "Gratuitous"}
                            </Badge>
                          </div>
                        </section>
                      </div>

                      <section className="bg-panel-warm/30 p-5 border border-hairline/10">
                        <h6 className="text-[0.6rem] uppercase font-bold tracking-[0.2em] text-ink/40 mb-3">{t("editor.teachers")}</h6>
                        <div className="flex flex-wrap gap-2">
                          {selectedTeachers.length > 0 ? (
                            selectedTeachers.map((t) => (
                              <Badge
                                key={t.id}
                                tone="quiet"
                                className="px-2.5 py-1 text-[0.65rem] bg-white border border-hairline/30"
                              >
                                {t.name}
                              </Badge>
                            ))
                          ) : (
                            <span className="text-xs text-red-500 font-bold flex items-center gap-1.5">
                              <AlertCircle className="size-3.5" />{t("editor.noTeachers")}</span>
                          )}
                        </div>
                      </section>
                    </div>
                  </div>
                </div>

                <div className="space-y-6">
                  <div className="bg-ink p-6 sm:p-8 text-white relative overflow-hidden group">
                    <div className="relative z-10">
                      <h5 className="font-body text-xl sm:text-2xl font-medium mb-3 leading-tight">{t("editor.authorization")}</h5>
                      <p className="text-sm text-white/70 font-light leading-relaxed mb-8">
                        Save this curriculum as an internal draft for ongoing edits, or push it into
                        the operational review queue for validation.
                      </p>

                      <div className="flex flex-col gap-3">
                        <Button
                          className="h-14 bg-white text-ink hover:bg-white/90 font-body font-medium transition-all disabled:opacity-50"
                          onClick={() => handleCommit("submit")}
                          disabled={isSaving}
                        >
                          <Send className="size-5 mr-3" />{t("editor.submitForReview")}</Button>
                        <Button
                          variant="ghost"
                          className="h-14 text-white/80 hover:bg-white/10 hover:text-white font-bold transition-all border border-white/10"
                          onClick={() => handleCommit("save")}
                          disabled={isSaving}
                        >{t("editor.saveDraft")}</Button>
                      </div>
                    </div>
                  </div>

                  <div className="bg-card border border-dashed border-hairline/40 p-6">
                    <div className="flex items-center gap-3 text-ink/40 mb-2">
                      <Info className="size-4" />
                      <span className="text-[0.6rem] font-bold uppercase tracking-[0.2em]">{t("editor.note")}</span>
                    </div>
                    <p className="text-xs text-ink/50 font-medium italic leading-relaxed">
                      By submitting, you acknowledge that our board will review the curation index,
                      syllabus depth, and instructional readiness.
                    </p>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Navigation Bar */}
        <footer className="p-6 sm:p-8 sm:px-12 bg-panel-warm/30 border-t border-hairline/10 flex items-center justify-between sticky bottom-0 z-50">
          <Button
            variant="outline"
            disabled={currentStep === 0}
            onClick={() => setCurrentStep((s) => Math.max(s - 1, 0))}
            className="h-12 px-6 sm:px-8 font-bold text-ink/60 border-hairline/30 hover:bg-panel-warm transition-all"
          >
            <ChevronLeft className="size-5 mr-0 sm:mr-2" />
            <span className="hidden sm:inline">{t("common.previous")}</span>
          </Button>

          {currentStep < editorSteps.length - 1 ? (
            <Button
              onClick={handleNext}
              disabled={!canContinue}
              className={cn(
                "h-12 rounded-2xl px-8 sm:px-10 font-body font-extrabold shadow-lg transition-all",
                canContinue
                  ? "bg-ink hover:bg-ink-muted "
                  : "bg-chip-active text-ink/30 cursor-not-allowed border border-hairline/10"
              )}
            >{t("common.next")}<ChevronRight className="size-5 ml-2" />
            </Button>
          ) : (
            <div className="flex items-center gap-3 text-[0.65rem] font-bold uppercase tracking-widest text-ink py-2">{t("editor.auditing")}<ArrowRight className="size-4" />
            </div>
          )}
        </footer>
      </div>
    </div>
  );
}

export function CourseEditorSkeleton(): JSX.Element {
  return (
    <div className="bg-card border border-hairline/40 overflow-hidden min-h-160 flex flex-col">
      <div className="p-8 border-b border-hairline/10 flex justify-between">
        <Skeleton className="h-12 w-48 bg-chip-active" />
        <Skeleton className="h-12 w-48 bg-chip-active" />
      </div>
      <div className="p-12 space-y-10 flex-1">
        <div className="space-y-4 max-w-sm mx-auto sm:mx-0">
          <Skeleton className="h-5 w-32 bg-chip-active rounded-full" />
          <Skeleton className="h-10 w-full bg-chip-active" />
        </div>
        <div className="grid gap-8 md:grid-cols-2">
          <Skeleton className="h-14 w-full bg-chip-active md:col-span-2" />
          <Skeleton className="h-14 w-full bg-chip-active" />
          <Skeleton className="h-14 w-full bg-chip-active" />
          <Skeleton className="h-40 w-full bg-chip-active md:col-span-2" />
        </div>
      </div>
      <div className="p-8 border-t border-hairline/10 flex justify-between">
        <Skeleton className="h-12 w-32 bg-chip-active" />
        <Skeleton className="h-12 w-32 bg-chip-active" />
      </div>
    </div>
  );
}
