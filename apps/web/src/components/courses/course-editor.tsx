import type { JSX } from "react";
import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";

import { CategorySelector } from "@/components/categories/category-selector";
import { FadeIn } from "@/components/common/fade-in";
import { ImageCropUploader } from "@/components/uploads/image-crop-uploader";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import type { CategoryNode } from "@/lib/api/categories";
import type { CourseTeacherOption, CreateCourseInput } from "@/lib/api/courses";
import { uploadCourseCover } from "@/lib/api/uploads";

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
    description: "Name the offer, connect it to a category, and decide how students enroll.",
    id: "basics",
    title: "Basic info"
  },
  {
    description: "Upload a clear cover image that will anchor the catalog card and public detail page.",
    id: "cover",
    title: "Cover photo"
  },
  {
    description: "Choose the teachers attached to the course. They will be shown in the public experience.",
    id: "teachers",
    title: "Teacher assignment"
  },
  {
    description: "Review the full setup, then save a draft or send it to the admin approval queue.",
    id: "review",
    title: "Review"
  }
] as const;

function flattenCategories(categories: readonly CategoryNode[]): readonly CategoryNode[] {
  return categories.flatMap((category) => [category, ...flattenCategories(category.children)]);
}

function validate(values: CourseEditorValues): CourseEditorErrors {
  const errors: CourseEditorErrors = {};

  if (values.title.trim().length < 3) {
    errors.title = "Title must be at least 3 characters";
  }

  if (values.description.trim().length < 24) {
    errors.description = "Description must be at least 24 characters";
  }

  if (!values.categoryId) {
    errors.categoryId = "Choose a category";
  }

  if (Number.isNaN(values.price) || values.price < 0) {
    errors.price = "Price must be zero or greater";
  }

  if (values.teacherIds.length === 0) {
    errors.teacherIds = "Assign at least one teacher before continuing";
  }

  return errors;
}

export function CourseEditor({
  categories,
  description,
  initialValues,
  isSaving,
  onCommit,
  teachers,
  title
}: CourseEditorProps): JSX.Element {
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

  const handleToggleTeacher = (teacherId: string): void => {
    setValues((currentValues) => ({
      ...currentValues,
      teacherIds: currentValues.teacherIds.includes(teacherId)
        ? currentValues.teacherIds.filter((currentTeacherId) => currentTeacherId !== teacherId)
        : [...currentValues.teacherIds, teacherId]
    }));
  };

  const handleCommit = async (action: EditorAction): Promise<void> => {
    const nextErrors = validate(values);
    setErrors(nextErrors);

    if (Object.keys(nextErrors).length > 0) {
      toast.error("Complete the missing course fields before continuing");
      return;
    }

    await onCommit(values, action);
  };

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle>{title}</CardTitle>
          <CardDescription>{description}</CardDescription>
        </CardHeader>
        <CardContent className="space-y-5">
          <div className="grid gap-3 md:grid-cols-4">
            {editorSteps.map((step, index) => (
              <button
                key={step.id}
                className={`rounded-[calc(var(--radius)-0.125rem)] border px-4 py-3 text-left transition-all duration-150 ease-out ${
                  index === currentStep
                    ? "border-secondary-container bg-secondary-container/12 text-on-surface"
                    : "border-outline-variant bg-surface-container-lowest text-on-surface/62 hover:bg-surface-container-low"
                }`}
                type="button"
                onClick={() => setCurrentStep(index)}
              >
                <p className="text-xs uppercase tracking-[0.24em]">{step.title}</p>
                <p className="mt-2 text-sm leading-6">{step.description}</p>
              </button>
            ))}
          </div>

          {currentStep === 0 ? (
            <FadeIn className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2 md:col-span-2">
                <Label htmlFor="course-title">Course title</Label>
                <Input
                  id="course-title"
                  error={errors.title}
                  placeholder="Higher Math Final Sprint"
                  value={values.title}
                  onChange={(event) =>
                    setValues((currentValues) => ({
                      ...currentValues,
                      title: event.target.value
                    }))
                  }
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="course-category">Category</Label>
                <CategorySelector
                  categories={categories}
                  error={errors.categoryId}
                  id="course-category"
                  includeRootOption={false}
                  value={values.categoryId}
                  onChange={(value) =>
                    setValues((currentValues) => ({
                      ...currentValues,
                      categoryId: value
                    }))
                  }
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="course-price">Price</Label>
                <Input
                  id="course-price"
                  error={errors.price}
                  min={0}
                  step="0.01"
                  type="number"
                  value={values.price}
                  onChange={(event) =>
                    setValues((currentValues) => ({
                      ...currentValues,
                      price: Number(event.target.value)
                    }))
                  }
                />
              </div>
              <div className="space-y-2 md:col-span-2">
                <Label htmlFor="course-description">Description</Label>
                <Textarea
                  id="course-description"
                  error={errors.description}
                  placeholder="Describe outcomes, target students, syllabus rhythm, and how the exam-only flow works when enabled."
                  value={values.description}
                  onChange={(event) =>
                    setValues((currentValues) => ({
                      ...currentValues,
                      description: event.target.value
                    }))
                  }
                />
              </div>
              <label className="flex items-center gap-3 rounded-[calc(var(--radius)-0.125rem)] border border-outline-variant bg-surface-container-low px-4 py-3 text-sm text-on-surface md:col-span-2">
                <input
                  checked={values.isExamOnly}
                  className="h-4 w-4 accent-(--secondary-container)"
                  type="checkbox"
                  onChange={(event) =>
                    setValues((currentValues) => ({
                      ...currentValues,
                      isExamOnly: event.target.checked
                    }))
                  }
                />
                <span>Students enroll for assessments only and skip the regular lecture flow.</span>
              </label>
            </FadeIn>
          ) : null}

          {currentStep === 1 ? (
            <FadeIn className="grid gap-6 lg:grid-cols-[0.8fr_1.2fr]">
              <div className="space-y-3">
                <ImageCropUploader
                  aspect={16 / 9}
                  buttonLabel="Choose cover image"
                  description="Crop the cover before upload so course cards, catalog previews, and public detail pages stay consistent."
                  label="Cover image URL"
                  previewAlt="Course cover preview"
                  successMessage="Course cover uploaded"
                  value={values.coverImageUrl ?? ""}
                  onUploadFile={(file, onProgress) => uploadCourseCover(file, onProgress)}
                  onValueChange={(coverImageUrl) =>
                    setValues((currentValues) => ({
                      ...currentValues,
                      coverImageUrl: coverImageUrl || undefined
                    }))
                  }
                />
                <Button
                  type="button"
                  variant="outline"
                  disabled={!values.coverImageUrl}
                  onClick={() =>
                    setValues((currentValues) => ({
                      ...currentValues,
                      coverImageUrl: undefined
                    }))
                  }
                >
                  Remove cover
                </Button>
              </div>
              <div className="overflow-hidden rounded-[calc(var(--radius)-0.125rem)] border border-outline-variant bg-surface-container-low">
                {values.coverImageUrl ? (
                  <img
                    alt="Course cover preview"
                    className="aspect-video w-full object-cover"
                    src={values.coverImageUrl}
                  />
                ) : (
                  <div className="flex aspect-video items-center justify-center bg-[radial-gradient(circle_at_top_left,rgba(96,99,238,0.18),transparent_55%),linear-gradient(135deg,rgba(27,27,31,0.04),rgba(96,99,238,0.1))] p-8 text-center text-sm text-on-surface/62">
                    Cover preview appears here after upload.
                  </div>
                )}
              </div>
            </FadeIn>
          ) : null}

          {currentStep === 2 ? (
            <FadeIn className="space-y-4">
              <p className="text-sm leading-6 text-on-surface/70">
                Assigned teachers appear on the public course card and determine who can manage the course before it goes live.
              </p>
              {errors.teacherIds ? <p className="text-sm text-[#c4353b]">{errors.teacherIds}</p> : null}
              <div className="grid gap-3 md:grid-cols-2">
                {teachers.map((teacher) => {
                  const isSelected = values.teacherIds.includes(teacher.id);

                  return (
                    <button
                      key={teacher.id}
                      className={`rounded-[calc(var(--radius)-0.125rem)] border p-4 text-left transition-all duration-150 ease-out ${
                        isSelected
                          ? "border-secondary-container bg-secondary-container/10"
                          : "border-outline-variant bg-surface-container-lowest hover:bg-surface-container-low"
                      }`}
                      type="button"
                      onClick={() => handleToggleTeacher(teacher.id)}
                    >
                      <p className="font-semibold text-on-surface">{teacher.name}</p>
                      <p className="text-sm text-on-surface/62">{teacher.email}</p>
                      {teacher.bio ? <p className="mt-2 line-clamp-3 text-sm leading-6 text-on-surface/62">{teacher.bio}</p> : null}
                    </button>
                  );
                })}
              </div>
            </FadeIn>
          ) : null}

          {currentStep === 3 ? (
            <FadeIn className="grid gap-4 lg:grid-cols-[1.05fr_0.95fr]">
              <Card className="bg-surface-container-lowest">
                <CardHeader>
                  <CardTitle className="text-lg">Course snapshot</CardTitle>
                  <CardDescription>Confirm the exact information that will travel into the draft and review flow.</CardDescription>
                </CardHeader>
                <CardContent className="space-y-3 text-sm text-on-surface/70">
                  <div>
                    <p className="font-semibold text-on-surface">Title</p>
                    <p>{values.title || "Untitled course"}</p>
                  </div>
                  <div>
                    <p className="font-semibold text-on-surface">Category</p>
                    <p>{flattenCategories(categories).find((category) => category.id === values.categoryId)?.name ?? "Not selected"}</p>
                  </div>
                  <div>
                    <p className="font-semibold text-on-surface">Price</p>
                    <p>{values.price > 0 ? `BDT ${values.price.toFixed(2)}` : "Free"}</p>
                  </div>
                  <div>
                    <p className="font-semibold text-on-surface">Mode</p>
                    <p>{values.isExamOnly ? "Exam only" : "Regular course with lessons"}</p>
                  </div>
                  <div>
                    <p className="font-semibold text-on-surface">Teachers</p>
                    <p>{selectedTeachers.map((teacher) => teacher.name).join(", ") || "No teachers selected"}</p>
                  </div>
                </CardContent>
              </Card>
              <Card className="bg-surface-container-lowest">
                <CardHeader>
                  <CardTitle className="text-lg">Submission options</CardTitle>
                  <CardDescription>Save a draft if you still need edits, or push it to the admin queue when it is ready.</CardDescription>
                </CardHeader>
                <CardContent className="space-y-3">
                  <Button type="button" disabled={isSaving} onClick={() => void handleCommit("save")}>
                    {isSaving ? "Saving..." : "Save draft"}
                  </Button>
                  <Button type="button" variant="outline" disabled={isSaving} onClick={() => void handleCommit("submit")}>
                    {isSaving ? "Working..." : "Save and submit"}
                  </Button>
                </CardContent>
              </Card>
            </FadeIn>
          ) : null}

          <div className="flex items-center justify-between">
            <Button
              type="button"
              variant="outline"
              disabled={currentStep === 0}
              onClick={() => setCurrentStep((step) => Math.max(step - 1, 0))}
            >
              Previous step
            </Button>
            <Button
              type="button"
              disabled={currentStep === editorSteps.length - 1}
              onClick={() => setCurrentStep((step) => Math.min(step + 1, editorSteps.length - 1))}
            >
              Next step
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

export function CourseEditorSkeleton(): JSX.Element {
  return (
    <div className="space-y-4">
      <Card>
        <CardHeader className="space-y-3">
          <div className="h-8 w-48 animate-pulse rounded-full bg-surface-container-low" />
          <div className="h-4 w-2/3 animate-pulse rounded-full bg-surface-container-low" />
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="grid gap-3 md:grid-cols-4">
            {Array.from({ length: 4 }).map((_, index) => (
              <div key={index} className="h-28 animate-pulse rounded-[calc(var(--radius)-0.125rem)] bg-surface-container-low" />
            ))}
          </div>
          <div className="grid gap-4 md:grid-cols-2">
            <div className="h-16 animate-pulse rounded-[calc(var(--radius)-0.125rem)] bg-surface-container-low md:col-span-2" />
            <div className="h-16 animate-pulse rounded-[calc(var(--radius)-0.125rem)] bg-surface-container-low" />
            <div className="h-16 animate-pulse rounded-[calc(var(--radius)-0.125rem)] bg-surface-container-low" />
            <div className="h-36 animate-pulse rounded-[calc(var(--radius)-0.125rem)] bg-surface-container-low md:col-span-2" />
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
