import {
  basicProfileInputSchema,
  studentProfileInputSchema,
  teacherProfileInputSchema,
  type UserRole
} from "@mma/shared";
import type { JSX } from "react";
import { useState } from "react";
import type { FieldErrors } from "react-hook-form";
import { Loader2 } from "lucide-react";

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
    <div className="grid gap-3 sm:grid-cols-3 mb-8">
      {steps.map((step, index) => (
        <div
          key={step.label}
          className={[
            "rounded-2xl border px-5 py-5 transition-all duration-300 ease-out",
            index === activeStep
              ? "border-primary/30 bg-primary/5 shadow-inner scale-[1.02]"
              : "border-outline-variant/30 bg-surface-container-low opacity-60"
          ].join(" ")}
        >
          <div className="flex items-center gap-3">
            <div className={["flex size-6 items-center justify-center rounded-full text-[10px] font-bold shadow-sm transition-colors", index === activeStep ? "bg-primary text-white" : "bg-outline-variant/30 text-on-surface/50"].join(" ")}>
              {index + 1}
            </div>
            <p className="text-[0.7rem] font-bold uppercase tracking-widest text-on-surface/50">
              Step {index + 1}
            </p>
          </div>
          <p className="mt-4 font-headline text-lg font-semibold text-on-surface">{step.label}</p>
          <p className="mt-1 text-sm leading-6 text-on-surface-variant font-light">{step.description}</p>
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
          <Input
            id="student-dob"
            type="date"
            max={new Date(new Date().setFullYear(new Date().getFullYear() - 10)).toISOString().split("T")[0]}
            error={errors.dateOfBirth?.message}
            {...register("dateOfBirth")}
          />
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
    <div className="bg-surface-container-lowest/80 backdrop-blur-3xl rounded-4xl p-8 sm:p-12 border border-outline-variant/40 shadow-2xl relative w-full overflow-hidden group">
      <div className="absolute -top-12 -right-12 w-64 h-64 bg-primary/5 rounded-full blur-3xl pointer-events-none z-[-1] transition-all group-hover:bg-primary/10 duration-1000"></div>
      <div className="mb-10 text-center sm:text-left">
        <h2 className="font-headline text-3xl font-extrabold tracking-tight text-on-surface">{title}</h2>
        <p className="mt-2 text-sm text-on-surface-variant font-light max-w-2xl leading-relaxed">{description}</p>
      </div>
      <div className="space-y-6">
        <StepRail activeStep={step} steps={studentSteps} />
        <form className="space-y-8" onSubmit={handleSubmit(onSubmit)}>
          <StudentStepFields
            errors={errors}
            onPhotoChange={(value) => setValue("profilePhoto", value, { shouldDirty: true, shouldValidate: true })}
            photoValue={profilePhotoValue ?? ""}
            register={register}
            step={step}
          />
          <div className="flex flex-col gap-3 sm:flex-row sm:justify-between pt-8 mt-8 border-t border-outline-variant/20">
            <Button className="h-12 font-headline font-semibold px-8 hover:bg-surface-container-high transition-all" type="button" variant="outline" disabled={step === 0} onClick={() => setStep(step - 1)}>
              Previous
            </Button>
            <div className="flex gap-3 w-full sm:w-auto">
              {step < studentSteps.length - 1 ? (
                <Button className="h-12 w-full sm:w-auto font-headline font-semibold px-10 bg-primary text-white hover:bg-on-surface transition-all shadow-md" type="button" onClick={() => void onNext()}>
                  Continue
                </Button>
              ) : (
                <Button className="h-12 w-full sm:w-auto font-headline font-semibold px-10 bg-primary text-white hover:bg-on-surface transition-all shadow-md" type="submit" disabled={isSubmitting}>
                  {isSubmitting ? <Loader2 className="mr-2 size-4 animate-spin" /> : null}
                  {isSubmitting ? "Saving profile..." : "Save profile"}
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
    <div className="bg-surface-container-lowest/80 backdrop-blur-3xl rounded-4xl p-8 sm:p-12 border border-outline-variant/40 shadow-2xl relative w-full overflow-hidden group">
      <div className="absolute -top-12 -right-12 w-64 h-64 bg-secondary/5 rounded-full blur-3xl pointer-events-none z-[-1] transition-all group-hover:bg-secondary/10 duration-1000"></div>
      <div className="mb-10 text-center sm:text-left">
        <h2 className="font-headline text-3xl font-extrabold tracking-tight text-on-surface">{title}</h2>
        <p className="mt-2 text-sm text-on-surface-variant font-light max-w-2xl leading-relaxed">{description}</p>
      </div>
      <div className="space-y-6">
        <StepRail activeStep={step} steps={teacherSteps} />
        <form className="space-y-8" onSubmit={handleSubmit(onSubmit)}>
          <TeacherStepFields
            errors={errors}
            onPhotoChange={(value) => setValue("profilePhoto", value, { shouldDirty: true, shouldValidate: true })}
            photoValue={profilePhotoValue ?? ""}
            register={register}
            step={step}
          />
          <div className="flex flex-col gap-3 sm:flex-row sm:justify-between pt-8 mt-8 border-t border-outline-variant/20">
            <Button className="h-12 font-headline font-semibold px-8 hover:bg-surface-container-high transition-all" type="button" variant="outline" disabled={step === 0} onClick={() => setStep(step - 1)}>
              Previous
            </Button>
            <div className="flex gap-3 w-full sm:w-auto">
              {step < teacherSteps.length - 1 ? (
                <Button className="h-12 w-full sm:w-auto font-headline font-semibold px-10 bg-primary text-white hover:bg-on-surface transition-all shadow-md" type="button" onClick={() => void onNext()}>
                  Continue
                </Button>
              ) : (
                <Button className="h-12 w-full sm:w-auto font-headline font-semibold px-10 bg-primary text-white hover:bg-on-surface transition-all shadow-md" type="submit" disabled={isSubmitting}>
                  {isSubmitting ? <Loader2 className="mr-2 size-4 animate-spin" /> : null}
                  {isSubmitting ? "Saving profile..." : "Save profile"}
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
    <div className="bg-surface-container-lowest/80 backdrop-blur-3xl rounded-4xl p-8 sm:p-12 border border-outline-variant/40 shadow-2xl relative w-full overflow-hidden group max-w-2xl mx-auto">
      <div className="absolute -top-12 -right-12 w-64 h-64 bg-primary/5 rounded-full blur-3xl pointer-events-none z-[-1] transition-all group-hover:bg-primary/10 duration-1000"></div>
      <div className="mb-10 text-center sm:text-left">
        <h2 className="font-headline text-3xl font-extrabold tracking-tight text-on-surface">{title}</h2>
        <p className="mt-2 text-sm text-on-surface-variant font-light max-w-2xl leading-relaxed">{description}</p>
      </div>
      <form className="space-y-8" onSubmit={handleSubmit(onSubmit)}>
        <div className="grid gap-6 md:grid-cols-2">
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
        <div className="pt-8 mt-8 border-t border-outline-variant/20 flex justify-end">
          <Button className="h-12 w-full sm:w-auto font-headline font-semibold px-10 bg-primary text-white hover:bg-on-surface transition-all shadow-md" type="submit" disabled={isSubmitting}>
            {isSubmitting ? <Loader2 className="mr-2 size-4 animate-spin" /> : null}
            {isSubmitting ? "Saving profile..." : "Save profile"}
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
      <div className="bg-surface-container-lowest/80 backdrop-blur-3xl rounded-4xl p-8 sm:p-12 border border-outline-variant/40 shadow-2xl relative w-full overflow-hidden">
        <div className="space-y-4 mb-10">
          <Skeleton className="h-8 w-64 bg-surface-container-high" />
          <Skeleton className="h-5 w-full max-w-xl bg-surface-container-high" />
        </div>
        <div className="space-y-8">
          <div className="grid gap-3 sm:grid-cols-3">
            <Skeleton className="h-32 rounded-3xl bg-surface-container-high" />
            <Skeleton className="h-32 rounded-3xl bg-surface-container-high" />
            <Skeleton className="h-32 rounded-3xl bg-surface-container-high" />
          </div>
          <div className="grid gap-6 md:grid-cols-2">
            <Skeleton className="h-20 w-full rounded-2xl bg-surface-container-high md:col-span-2" />
            <Skeleton className="h-20 w-full rounded-2xl bg-surface-container-high" />
            <Skeleton className="h-20 w-full rounded-2xl bg-surface-container-high" />
            <Skeleton className="h-36 w-full rounded-2xl bg-surface-container-high md:col-span-2" />
          </div>
        </div>
      </div>

      <div className="bg-surface-container-lowest/80 backdrop-blur-3xl rounded-4xl p-8 sm:p-12 border border-outline-variant/40 shadow-xl relative w-full overflow-hidden opacity-50">
        <Skeleton className="h-8 w-48 bg-surface-container-high mb-4" />
        <Skeleton className="h-5 w-full max-w-lg bg-surface-container-high mb-8" />
        <Skeleton className="h-12 w-64 rounded-2xl bg-surface-container-high" />
      </div>
    </div>
  );
}
