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
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { Textarea } from "@/components/ui/textarea";

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
  return (
    <div className="grid gap-3 sm:grid-cols-3">
      {steps.map((step, index) => (
        <div
          key={step.label}
          className={[
            "rounded-[calc(var(--radius)-0.125rem)] border px-4 py-3 transition-all duration-150 ease-out",
            index === activeStep
              ? "border-secondary-container/25 bg-secondary-container/8"
              : "border-outline-variant bg-surface-container-low"
          ].join(" ")}
        >
          <p className="text-[0.7rem] font-semibold uppercase tracking-[0.08em] text-on-surface/50">
            Step {index + 1}
          </p>
          <p className="mt-1 font-semibold text-on-surface">{step.label}</p>
          <p className="mt-1 text-sm leading-6 text-on-surface/62">{step.description}</p>
        </div>
      ))}
    </div>
  );
}

function StudentStepFields({
  errors,
  onPhotoChange,
  photoValue,
  register,
  step
}: {
  errors: FieldErrors<StudentProfileInput>;
  onPhotoChange: (value: string) => void;
  photoValue: string;
  register: ReturnType<typeof useZodForm<StudentProfileInput>>["register"];
  step: number;
}): JSX.Element {
  if (step === 0) {
    return (
      <div className="grid gap-4 md:grid-cols-2">
        <div className="space-y-2 md:col-span-2">
          <Label htmlFor="student-name">Full name</Label>
          <Input id="student-name" error={errors.name?.message} {...register("name")} />
        </div>
        <div className="space-y-2">
          <Label htmlFor="student-phone">Phone</Label>
          <Input id="student-phone" error={errors.phone?.message} {...register("phone")} />
        </div>
        <div className="space-y-2">
          <ProfilePhotoUploadField
            id="student-photo"
            label="Profile photo"
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
          <Label htmlFor="student-dob">Date of birth</Label>
          <Input id="student-dob" type="date" error={errors.dateOfBirth?.message} {...register("dateOfBirth")} />
        </div>
        <div className="space-y-2">
          <Label htmlFor="student-guardian-name">Guardian name</Label>
          <Input
            id="student-guardian-name"
            error={errors.guardianName?.message}
            {...register("guardianName")}
          />
        </div>
        <div className="space-y-2 md:col-span-2">
          <Label htmlFor="student-guardian-phone">Guardian phone</Label>
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
        <Label htmlFor="student-institution">Institution</Label>
        <Input id="student-institution" error={errors.institution?.message} {...register("institution")} />
      </div>
      <div className="space-y-2">
        <Label htmlFor="student-grade">Class or grade</Label>
        <Input id="student-grade" error={errors.classOrGrade?.message} {...register("classOrGrade")} />
      </div>
      <div className="space-y-2 md:col-span-2">
        <Label htmlFor="student-address">Address</Label>
        <Textarea id="student-address" error={errors.address?.message} {...register("address")} />
      </div>
    </div>
  );
}

function TeacherStepFields({
  errors,
  onPhotoChange,
  photoValue,
  register,
  step
}: {
  errors: FieldErrors<TeacherProfileInput>;
  onPhotoChange: (value: string) => void;
  photoValue: string;
  register: ReturnType<typeof useZodForm<TeacherProfileInput>>["register"];
  step: number;
}): JSX.Element {
  if (step === 0) {
    return (
      <div className="grid gap-4 md:grid-cols-2">
        <div className="space-y-2 md:col-span-2">
          <Label htmlFor="teacher-name">Full name</Label>
          <Input id="teacher-name" error={errors.name?.message} {...register("name")} />
        </div>
        <div className="space-y-2">
          <Label htmlFor="teacher-phone">Phone</Label>
          <Input id="teacher-phone" error={errors.phone?.message} {...register("phone")} />
        </div>
        <div className="space-y-2">
          <ProfilePhotoUploadField
            id="teacher-photo"
            label="Profile photo"
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
          <Label htmlFor="teacher-bio">Bio</Label>
          <Textarea id="teacher-bio" error={errors.bio?.message} {...register("bio")} />
        </div>
        <div className="space-y-2">
          <Label htmlFor="teacher-qualifications">Qualifications</Label>
          <Textarea
            id="teacher-qualifications"
            error={errors.qualifications?.message}
            {...register("qualifications")}
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="teacher-specializations">Specializations</Label>
          <Textarea
            id="teacher-specializations"
            error={errors.specializations?.message}
            {...register("specializations")}
          />
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-2">
      <Label htmlFor="teacher-social-links">Social links</Label>
      <Textarea
        id="teacher-social-links"
        placeholder="Website, Facebook, LinkedIn, YouTube, or any public contact links"
        error={errors.socialLinks?.message}
        {...register("socialLinks")}
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
    formState: { errors },
    handleSubmit,
    register,
    setValue,
    watch,
    trigger
  } = form;
  const profilePhotoValue = watch("profilePhoto");

  const onNext = async (): Promise<void> => {
    const currentStep = studentSteps[step];

    if (!currentStep) {
      return;
    }

    const isValid = await trigger(currentStep.fields);

    if (isValid) {
      setStep((currentStep) => Math.min(currentStep + 1, studentSteps.length - 1));
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>{title}</CardTitle>
        <CardDescription>{description}</CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <StepRail activeStep={step} steps={studentSteps} />
        <form className="space-y-6" onSubmit={handleSubmit(onSubmit)}>
          <StudentStepFields
            errors={errors}
            onPhotoChange={(value) => setValue("profilePhoto", value, { shouldDirty: true, shouldValidate: true })}
            photoValue={profilePhotoValue ?? ""}
            register={register}
            step={step}
          />
          <div className="flex flex-col gap-3 sm:flex-row sm:justify-between">
            <Button type="button" variant="ghost" disabled={step === 0} onClick={() => setStep(step - 1)}>
              Previous
            </Button>
            <div className="flex gap-3">
              {step < studentSteps.length - 1 ? (
                <Button type="button" onClick={() => void onNext()}>
                  Continue
                </Button>
              ) : (
                <Button type="submit" disabled={isSubmitting}>
                  {isSubmitting ? <span className="h-4 w-16 rounded-full bg-white/25" aria-hidden="true" /> : null}
                  {isSubmitting ? "Saving profile" : "Save profile"}
                </Button>
              )}
            </div>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}

export function TeacherProfileForm({
  description,
  initialProfile,
  isSubmitting,
  onSubmit,
  title
}: TeacherProfileFormProps): JSX.Element {
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
    formState: { errors },
    handleSubmit,
    register,
    setValue,
    watch,
    trigger
  } = form;
  const profilePhotoValue = watch("profilePhoto");

  const onNext = async (): Promise<void> => {
    const currentStep = teacherSteps[step];

    if (!currentStep) {
      return;
    }

    const isValid = await trigger(currentStep.fields);

    if (isValid) {
      setStep((currentStep) => Math.min(currentStep + 1, teacherSteps.length - 1));
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>{title}</CardTitle>
        <CardDescription>{description}</CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <StepRail activeStep={step} steps={teacherSteps} />
        <form className="space-y-6" onSubmit={handleSubmit(onSubmit)}>
          <TeacherStepFields
            errors={errors}
            onPhotoChange={(value) => setValue("profilePhoto", value, { shouldDirty: true, shouldValidate: true })}
            photoValue={profilePhotoValue ?? ""}
            register={register}
            step={step}
          />
          <div className="flex flex-col gap-3 sm:flex-row sm:justify-between">
            <Button type="button" variant="ghost" disabled={step === 0} onClick={() => setStep(step - 1)}>
              Previous
            </Button>
            <div className="flex gap-3">
              {step < teacherSteps.length - 1 ? (
                <Button type="button" onClick={() => void onNext()}>
                  Continue
                </Button>
              ) : (
                <Button type="submit" disabled={isSubmitting}>
                  {isSubmitting ? <span className="h-4 w-16 rounded-full bg-white/25" aria-hidden="true" /> : null}
                  {isSubmitting ? "Saving profile" : "Save profile"}
                </Button>
              )}
            </div>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}

export function BasicProfileForm({
  description,
  initialProfile,
  isSubmitting,
  onSubmit,
  title
}: BasicProfileFormProps): JSX.Element {
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
    <Card>
      <CardHeader>
        <CardTitle>{title}</CardTitle>
        <CardDescription>{description}</CardDescription>
      </CardHeader>
      <CardContent>
        <form className="space-y-6" onSubmit={handleSubmit(onSubmit)}>
          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2 md:col-span-2">
              <Label htmlFor="basic-name">Display name</Label>
              <Input id="basic-name" error={errors.name?.message} {...register("name")} />
            </div>
            <div className="space-y-2 md:col-span-2">
              <ProfilePhotoUploadField
                id="basic-photo"
                label="Profile photo"
                error={errors.profilePhoto?.message}
                value={profilePhotoValue ?? ""}
                onValueChange={(value) =>
                  setValue("profilePhoto", value, { shouldDirty: true, shouldValidate: true })
                }
              />
            </div>
          </div>
          <Button type="submit" disabled={isSubmitting}>
            {isSubmitting ? <span className="h-4 w-16 rounded-full bg-white/25" aria-hidden="true" /> : null}
            {isSubmitting ? "Saving profile" : "Save profile"}
          </Button>
        </form>
      </CardContent>
    </Card>
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
    <div className="space-y-4">
      <Card>
        <CardHeader className="space-y-3">
          <Skeleton className="h-6 w-44" />
          <Skeleton className="h-4 w-full max-w-xl" />
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="grid gap-3 sm:grid-cols-3">
            <Skeleton className="h-24" />
            <Skeleton className="h-24" />
            <Skeleton className="h-24" />
          </div>
          <div className="grid gap-4 md:grid-cols-2">
            <Skeleton className="h-20 md:col-span-2" />
            <Skeleton className="h-20" />
            <Skeleton className="h-20" />
            <Skeleton className="h-36 md:col-span-2" />
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
