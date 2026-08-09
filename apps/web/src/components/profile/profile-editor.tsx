import {
  basicProfileInputSchema,
  studentProfileInputSchema,
  teacherProfileInputSchema,
  type UserRole
} from "@mma/shared";
import type { JSX } from "react";
import { useState } from "react";
import type { FieldErrors } from "react-hook-form";

import { ProfilePhotoUploadField } from "@/components/profile/profile-photo-upload-field";
import type {
  BasicProfileInput,
  OwnProfileData,
  StudentProfileInput,
  TeacherProfileInput
} from "@/lib/api/profiles";
import { useZodForm } from "@/lib/forms/use-zod-form";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { RichTextEditor } from "@/components/ui/rich-text-editor";
import { Skeleton } from "@/components/ui/skeleton";
import { useFormat, useT } from "@/lib/i18n/locale-context";
import { Controller } from "react-hook-form";
import { cn } from "@/lib/utils";

interface StudentProfileFormProps {
  description: string;
  initialProfile: OwnProfileData | null;
  isSubmitting: boolean;
  onSubmit: (values: StudentProfileInput) => Promise<void>;
  title: string;
}

interface TeacherProfileFormProps {
  description: string;
  initialProfile: OwnProfileData | null;
  isSubmitting: boolean;
  onSubmit: (values: TeacherProfileInput) => Promise<void>;
  title: string;
}

interface BasicProfileFormProps {
  description: string;
  initialProfile: OwnProfileData | null;
  isSubmitting: boolean;
  onSubmit: (values: BasicProfileInput) => Promise<void>;
  title: string;
}

interface RoleProfileFormProps {
  description: string;
  initialProfile: OwnProfileData | null;
  isSubmitting: boolean;
  onSubmitBasic: (values: BasicProfileInput) => Promise<void>;
  onSubmitStudent: (values: StudentProfileInput) => Promise<void>;
  onSubmitTeacher: (values: TeacherProfileInput) => Promise<void>;
  role: UserRole;
  title: string;
}

const studentSteps = [
  {
    description: "Identity and profile presentation",
    fields: ["name", "phone", "profilePhoto"] as const,
    label: "Identity"
  },
  {
    description: "Personal and guardian details",
    fields: ["dateOfBirth", "guardianName", "guardianPhone"] as const,
    label: "Family"
  },
  {
    description: "Academic context and address",
    fields: ["institution", "classOrGrade", "address"] as const,
    label: "Academics"
  }
] as const;

const teacherSteps = [
  {
    description: "Public-facing teacher identity",
    fields: ["name", "phone", "profilePhoto"] as const,
    label: "Identity"
  },
  {
    description: "Biography and academic credibility",
    fields: ["bio", "qualifications", "specializations"] as const,
    label: "Expertise"
  },
  {
    description: "Links and public touchpoints",
    fields: ["socialLinks"] as const,
    label: "Links"
  }
] as const;

function StepRail({
  activeStep,
  steps
}: {
  activeStep: number;
  steps: readonly { description: string; label: string }[];
}): JSX.Element {
  const t = useT();
  const format = useFormat();

  return (
    <ol className="grid gap-3 sm:grid-cols-3">
      {steps.map((step, index) => (
        <li
          aria-current={index === activeStep ? "step" : undefined}
          className={cn(
            "border p-4 transition-colors",
            index === activeStep
              ? "border-line-strong"
              : "border-hairline bg-panel-warm"
          )}
          key={step.label}
        >
          <div className="flex items-center gap-3">
            {/* The circled step number of DESIGN.md §7: 1.5px ring, accent
                numeral, no fill and no shadow. */}
            <span
              className={cn(
                "label-mono flex size-8 shrink-0 items-center justify-center rounded-full border-[1.5px] border-hairline text-xs",
                index === activeStep ? "text-accent" : "text-muted-light"
              )}
            >
              {format.number(index + 1)}
            </span>
            <span className="label-mono text-[11px] uppercase text-muted-light">
              {t("prof.step", { number: format.number(index + 1) })}
            </span>
          </div>
          <p className="mt-3 text-base font-medium text-ink">{step.label}</p>
          <p className="mt-1 text-sm font-light leading-relaxed text-muted">{step.description}</p>
        </li>
      ))}
    </ol>
  );
}

function StudentStepFields({
  control,
  errors,
  onPhotoChange,
  photoValue,
  register,
  step
}: {
  control: ReturnType<typeof useZodForm<StudentProfileInput>>["control"];
  errors: FieldErrors<StudentProfileInput>;
  onPhotoChange: (value: string) => void;
  photoValue: string;
  register: ReturnType<typeof useZodForm<StudentProfileInput>>["register"];
  step: number;
}): JSX.Element {
  const t = useT();

  if (step === 0) {
    return (
      <div className="grid gap-4 md:grid-cols-2">
        <div className="space-y-2 md:col-span-2">
          <Label htmlFor="student-name">{t("profile.fullName")}</Label>
          <Input id="student-name" error={errors.name?.message} {...register("name")} />
        </div>
        <div className="space-y-2">
          <Label htmlFor="student-phone">{t("profile.phone")}</Label>
          <Input id="student-phone" error={errors.phone?.message} {...register("phone")} />
        </div>
        <div className="space-y-2">
          <ProfilePhotoUploadField
            id="student-photo"
            label={t("profile.photo")}
            error={errors.profilePhoto?.message}
            value={photoValue}
            onValueChange={onPhotoChange}
          />
        </div>
      </div>
    );
  }

  if (step === 1) {
    return (
      <div className="grid gap-4 md:grid-cols-2">
        <div className="space-y-2">
          <Label htmlFor="student-dob">{t("profile.dob")}</Label>
          <Input
            id="student-dob"
            type="date"
            max={new Date(new Date().setFullYear(new Date().getFullYear() - 10)).toISOString().split("T")[0]}
            error={errors.dateOfBirth?.message}
            {...register("dateOfBirth")}
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="student-guardian-name">{t("profile.guardianName")}</Label>
          <Input
            id="student-guardian-name"
            error={errors.guardianName?.message}
            {...register("guardianName")}
          />
        </div>
        <div className="space-y-2 md:col-span-2">
          <Label htmlFor="student-guardian-phone">{t("profile.guardianPhone")}</Label>
          <Input
            id="student-guardian-phone"
            error={errors.guardianPhone?.message}
            {...register("guardianPhone")}
          />
        </div>
      </div>
    );
  }

  return (
    <div className="grid gap-4 md:grid-cols-2">
      <div className="space-y-2">
        <Label htmlFor="student-institution">{t("profile.institution")}</Label>
        <Input id="student-institution" error={errors.institution?.message} {...register("institution")} />
      </div>
      <div className="space-y-2">
        <Label htmlFor="student-grade">{t("profile.classOrGrade")}</Label>
        <Input id="student-grade" error={errors.classOrGrade?.message} {...register("classOrGrade")} />
      </div>
      <div className="space-y-2 md:col-span-2">
        <Label htmlFor="student-address">{t("profile.address")}</Label>
        <Controller
          control={control}
          name="address"
          render={({ field }) => (
            <RichTextEditor
              id="student-address"
              error={errors.address?.message}
              value={field.value ?? ""}
              onChange={field.onChange}
            />
          )}
        />
      </div>
    </div>
  );
}

function TeacherStepFields({
  control,
  errors,
  onPhotoChange,
  photoValue,
  register,
  step
}: {
  control: ReturnType<typeof useZodForm<TeacherProfileInput>>["control"];
  errors: FieldErrors<TeacherProfileInput>;
  onPhotoChange: (value: string) => void;
  photoValue: string;
  register: ReturnType<typeof useZodForm<TeacherProfileInput>>["register"];
  step: number;
}): JSX.Element {
  const t = useT();

  if (step === 0) {
    return (
      <div className="grid gap-4 md:grid-cols-2">
        <div className="space-y-2 md:col-span-2">
          <Label htmlFor="teacher-name">{t("profile.fullName")}</Label>
          <Input id="teacher-name" error={errors.name?.message} {...register("name")} />
        </div>
        <div className="space-y-2">
          <Label htmlFor="teacher-phone">{t("profile.phone")}</Label>
          <Input id="teacher-phone" error={errors.phone?.message} {...register("phone")} />
        </div>
        <div className="space-y-2">
          <ProfilePhotoUploadField
            id="teacher-photo"
            label={t("profile.photo")}
            error={errors.profilePhoto?.message}
            value={photoValue}
            onValueChange={onPhotoChange}
          />
        </div>
      </div>
    );
  }

  if (step === 1) {
    return (
      <div className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="teacher-bio">{t("profile.bio")}</Label>
          <Controller
            control={control}
            name="bio"
            render={({ field }) => (
              <RichTextEditor
                id="teacher-bio"
                error={errors.bio?.message}
                value={field.value ?? ""}
                onChange={field.onChange}
              />
            )}
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="teacher-qualifications">{t("profile.qualifications")}</Label>
          <Controller
            control={control}
            name="qualifications"
            render={({ field }) => (
              <RichTextEditor
                id="teacher-qualifications"
                error={errors.qualifications?.message}
                value={field.value ?? ""}
                onChange={field.onChange}
              />
            )}
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="teacher-specializations">{t("profile.specializations")}</Label>
          <Controller
            control={control}
            name="specializations"
            render={({ field }) => (
              <RichTextEditor
                id="teacher-specializations"
                error={errors.specializations?.message}
                value={field.value ?? ""}
                onChange={field.onChange}
              />
            )}
          />
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-2">
      <Label htmlFor="teacher-social-links">{t("profile.socialLinks")}</Label>
      <Controller
        control={control}
        name="socialLinks"
        render={({ field }) => (
          <RichTextEditor
            id="teacher-social-links"
            placeholder={t("profile.socialLinksHint")}
            error={errors.socialLinks?.message}
            value={field.value ?? ""}
            onChange={field.onChange}
          />
        )}
      />
    </div>
  );
}

export function StudentProfileForm({
  description,
  initialProfile,
  isSubmitting,
  onSubmit,
  title
}: StudentProfileFormProps): JSX.Element {
  const t = useT();

  const [step, setStep] = useState(0);
  const form = useZodForm<StudentProfileInput>({
    defaultValues: {
      address: initialProfile?.studentProfile?.address ?? "",
      classOrGrade: initialProfile?.studentProfile?.classOrGrade ?? "",
      dateOfBirth: initialProfile?.studentProfile?.dateOfBirth?.slice(0, 10) ?? "",
      guardianName: initialProfile?.studentProfile?.guardianName ?? "",
      guardianPhone: initialProfile?.studentProfile?.guardianPhone ?? "",
      institution: initialProfile?.studentProfile?.institution ?? "",
      name: initialProfile?.user.name ?? "",
      phone: initialProfile?.studentProfile?.phone ?? "",
      profilePhoto: initialProfile?.studentProfile?.profilePhoto ?? initialProfile?.user.image ?? ""
    },
    schema: studentProfileInputSchema
  });
  const {
    control,
    formState: { errors },
    getValues,
    handleSubmit,
    register,
    setValue,
    watch,
    trigger
  } = form;
  const profilePhotoValue = watch("profilePhoto");

  /**
   * Validates the step being left, saves it, then advances.
   *
   * Saving here rather than only at the end is the point: a wizard that keeps
   * everything in memory loses it all to a closed tab or a dead battery.
   * `isComplete: false` says "store this, but I am not finished" -- the flag
   * that stops the dashboard bouncing a half-filled profile back to the start.
   */
  const onNext = async (): Promise<void> => {
    const currentStep = studentSteps[step];

    if (!currentStep) {
      return;
    }

    const isValid = await trigger(currentStep.fields);

    if (!isValid) {
      return;
    }

    try {
      await onSubmit({ ...getValues(), isComplete: false });
    } catch {
      // The API client has already raised a toast. Staying on this step is the
      // right outcome -- advancing would imply the answers were kept.
      return;
    }

    setStep((current) => Math.min(current + 1, studentSteps.length - 1));
  };

  const handleStudentFormSubmit = handleSubmit(async (values) => {
    if (step < studentSteps.length - 1) {
      await onNext();
      return;
    }

    await onSubmit({ ...values, isComplete: true });
  });

  return (
    <div className="w-full border border-hairline bg-card p-6 sm:p-8">
      <div className="border-b border-hairline pb-5">
        <h1 className="text-2xl font-medium text-ink">{title}</h1>
        <p className="mt-2 max-w-2xl text-base font-light leading-relaxed text-muted">{description}</p>
      </div>
      <div className="space-y-6">
        <StepRail activeStep={step} steps={studentSteps} />
        <form className="space-y-8" onSubmit={handleStudentFormSubmit}>
          <StudentStepFields
            control={control}
            errors={errors}
            onPhotoChange={(value) => setValue("profilePhoto", value, { shouldDirty: true, shouldValidate: true })}
            photoValue={profilePhotoValue ?? ""}
            register={register}
            step={step}
          />
          <div className="flex flex-col gap-3 sm:flex-row sm:justify-between mt-8 border-t border-hairline pt-6">
            <Button className="h-11" disabled={step === 0} onClick={() => setStep(step - 1)} type="button" variant="outline">
              {t("common.previous")}
            </Button>
            {/* The keys are load-bearing. Without them React reuses one DOM
                node for both buttons and only swaps `type`, so the click that
                advances to the last step finds itself on a submit button by the
                time the browser runs its default action — and the form submits
                itself. Distinct keys make it a different node. */}
            <div className="flex gap-3 w-full sm:w-auto">
              {step < studentSteps.length - 1 ? (
                <Button key="next" className="h-11 w-full sm:w-auto" disabled={isSubmitting} onClick={() => void onNext()} type="button">
                  {isSubmitting ? t("prof.saving") : t("prof.continue")}
                </Button>
              ) : (
                <Button key="save" className="h-11 w-full sm:w-auto" disabled={isSubmitting} type="submit">
                  {isSubmitting ? t("prof.saving") : t("prof.saveProfile")}
                </Button>
              )}
            </div>
          </div>
        </form>
      </div>
    </div>
  );
}

export function TeacherProfileForm({
  description,
  initialProfile,
  isSubmitting,
  onSubmit,
  title
}: TeacherProfileFormProps): JSX.Element {
  const t = useT();

  const [step, setStep] = useState(0);
  const form = useZodForm<TeacherProfileInput>({
    defaultValues: {
      bio: initialProfile?.teacherProfile?.bio ?? "",
      name: initialProfile?.user.name ?? "",
      phone: initialProfile?.teacherProfile?.phone ?? "",
      profilePhoto: initialProfile?.teacherProfile?.profilePhoto ?? initialProfile?.user.image ?? "",
      qualifications: initialProfile?.teacherProfile?.qualifications ?? "",
      socialLinks: initialProfile?.teacherProfile?.socialLinks ?? "",
      specializations: initialProfile?.teacherProfile?.specializations ?? ""
    },
    schema: teacherProfileInputSchema
  });
  const {
    control,
    formState: { errors },
    getValues,
    handleSubmit,
    register,
    setValue,
    watch,
    trigger
  } = form;
  const profilePhotoValue = watch("profilePhoto");

  /**
   * Validates the step being left, saves it, then advances.
   *
   * Saving here rather than only at the end is the point: a wizard that keeps
   * everything in memory loses it all to a closed tab or a dead battery.
   * `isComplete: false` says "store this, but I am not finished" -- the flag
   * that stops the dashboard bouncing a half-filled profile back to the start.
   */
  const onNext = async (): Promise<void> => {
    const currentStep = teacherSteps[step];

    if (!currentStep) {
      return;
    }

    const isValid = await trigger(currentStep.fields);

    if (!isValid) {
      return;
    }

    try {
      await onSubmit({ ...getValues(), isComplete: false });
    } catch {
      // The API client has already raised a toast. Staying on this step is the
      // right outcome -- advancing would imply the answers were kept.
      return;
    }

    setStep((current) => Math.min(current + 1, teacherSteps.length - 1));
  };

  const handleTeacherFormSubmit = handleSubmit(async (values) => {
    if (step < teacherSteps.length - 1) {
      await onNext();
      return;
    }

    await onSubmit({ ...values, isComplete: true });
  });

  return (
    <div className="w-full border border-hairline bg-card p-6 sm:p-8">
      <div className="border-b border-hairline pb-5">
        <h1 className="text-2xl font-medium text-ink">{title}</h1>
        <p className="mt-2 max-w-2xl text-base font-light leading-relaxed text-muted">{description}</p>
      </div>
      <div className="space-y-6">
        <StepRail activeStep={step} steps={teacherSteps} />
        <form className="space-y-8" onSubmit={handleTeacherFormSubmit}>
          <TeacherStepFields
            control={control}
            errors={errors}
            onPhotoChange={(value) => setValue("profilePhoto", value, { shouldDirty: true, shouldValidate: true })}
            photoValue={profilePhotoValue ?? ""}
            register={register}
            step={step}
          />
          <div className="flex flex-col gap-3 sm:flex-row sm:justify-between mt-8 border-t border-hairline pt-6">
            <Button className="h-11" disabled={step === 0} onClick={() => setStep(step - 1)} type="button" variant="outline">
              {t("common.previous")}
            </Button>
            {/* See the note in StudentProfileForm: the keys stop React reusing
                one node for Continue and Save, which turned the click that
                reached the last step into a submit. */}
            <div className="flex gap-3 w-full sm:w-auto">
              {step < teacherSteps.length - 1 ? (
                <Button key="next" className="h-11 w-full sm:w-auto" disabled={isSubmitting} onClick={() => void onNext()} type="button">
                  {isSubmitting ? t("prof.saving") : t("prof.continue")}
                </Button>
              ) : (
                <Button key="save" className="h-11 w-full sm:w-auto" disabled={isSubmitting} type="submit">
                  {isSubmitting ? t("prof.saving") : t("prof.saveProfile")}
                </Button>
              )}
            </div>
          </div>
        </form>
      </div>
    </div>
  );
}

export function BasicProfileForm({
  description,
  initialProfile,
  isSubmitting,
  onSubmit,
  title
}: BasicProfileFormProps): JSX.Element {
  const t = useT();

  const form = useZodForm<BasicProfileInput>({
    defaultValues: {
      name: initialProfile?.user.name ?? "",
      profilePhoto: initialProfile?.user.image ?? ""
    },
    schema: basicProfileInputSchema
  });
  const {
    formState: { errors },
    handleSubmit,
    register,
    setValue,
    watch
  } = form;
  const profilePhotoValue = watch("profilePhoto");

  return (
    <div className="w-full border border-hairline bg-card p-6 sm:p-8">
      <div className="border-b border-hairline pb-5">
        <h1 className="text-2xl font-medium text-ink">{title}</h1>
        <p className="mt-2 max-w-2xl text-base font-light leading-relaxed text-muted">{description}</p>
      </div>
      <form className="space-y-8" onSubmit={handleSubmit(onSubmit)}>
        <div className="grid gap-6 md:grid-cols-2">
          <div className="space-y-2 md:col-span-2">
            <Label htmlFor="basic-name">{t("profile.displayName")}</Label>
            <Input id="basic-name" error={errors.name?.message} {...register("name")} />
          </div>
          <div className="space-y-2 md:col-span-2">
            <ProfilePhotoUploadField
              id="basic-photo"
              label={t("profile.photo")}
              error={errors.profilePhoto?.message}
              value={profilePhotoValue ?? ""}
              onValueChange={(value) =>
                setValue("profilePhoto", value, { shouldDirty: true, shouldValidate: true })
              }
            />
          </div>
        </div>
        <div className="mt-8 border-t border-hairline pt-6 flex justify-end">
          <Button className="h-11 w-full sm:w-auto" disabled={isSubmitting} type="submit">
            {isSubmitting ? t("prof.saving") : t("prof.saveProfile")}
          </Button>
        </div>
      </form>
    </div>
  );
}

export function RoleProfileForm({
  description,
  initialProfile,
  isSubmitting,
  onSubmitBasic,
  onSubmitStudent,
  onSubmitTeacher,
  role,
  title
}: RoleProfileFormProps): JSX.Element {
  if (role === "STUDENT") {
    return (
      <StudentProfileForm
        description={description}
        initialProfile={initialProfile}
        isSubmitting={isSubmitting}
        onSubmit={onSubmitStudent}
        title={title}
      />
    );
  }

  if (role === "TEACHER") {
    return (
      <TeacherProfileForm
        description={description}
        initialProfile={initialProfile}
        isSubmitting={isSubmitting}
        onSubmit={onSubmitTeacher}
        title={title}
      />
    );
  }

  return (
    <BasicProfileForm
      description={description}
      initialProfile={initialProfile}
      isSubmitting={isSubmitting}
      onSubmit={onSubmitBasic}
      title={title}
    />
  );
}

export function ProfilePageSkeleton(): JSX.Element {
  return (
    <div className="space-y-6">
      <div className="w-full border border-hairline bg-card p-6 sm:p-8">
        <div className="space-y-4 mb-10">
          <Skeleton className="h-8 w-full max-w-64" />
          <Skeleton className="h-5 w-full max-w-xl" />
        </div>
        <div className="space-y-8">
          <div className="grid gap-3 sm:grid-cols-3">
            <Skeleton className="h-32" />
            <Skeleton className="h-32" />
            <Skeleton className="h-32" />
          </div>
          <div className="grid gap-6 md:grid-cols-2">
            <Skeleton className="h-20 w-full md:col-span-2" />
            <Skeleton className="h-20 w-full" />
            <Skeleton className="h-20 w-full" />
            <Skeleton className="h-36 w-full md:col-span-2" />
          </div>
        </div>
      </div>

      <div className="w-full border border-hairline bg-card p-6 sm:p-8">
        <Skeleton className="h-8 w-48 mb-4" />
        <Skeleton className="h-5 w-full max-w-lg mb-8" />
        <div className="grid gap-6 md:grid-cols-2">
          <Skeleton className="h-20 md:col-span-2" />
          <Skeleton className="h-20 md:col-span-2" />
          <Skeleton className="h-12 w-full sm:w-48" />
        </div>
      </div>
    </div>
  );
}
