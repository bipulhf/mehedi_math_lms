import { createFileRoute, useRouter } from "@tanstack/react-router";
import type { JSX } from "react";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import type { UserRole } from "@mma/shared";
import { z } from "zod";

import { ProfilePageSkeleton, RoleProfileForm } from "@/components/profile/profile-editor";

import { RouteErrorView } from "@/components/common/route-error";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { PasswordInput } from "@/components/ui/password-input";
import { useZodForm } from "@/lib/forms/use-zod-form";
import { useAuthSession } from "@/hooks/use-auth-session";
import { authClient } from "@/lib/auth";
import type {
  BasicProfileInput,
  OwnProfileData,
  StudentProfileInput,
  TeacherProfileInput
} from "@/lib/api/profiles";
import {
  getOwnProfile,
  updateBasicProfile,
  updateStudentProfile,
  updateTeacherProfile
} from "@/lib/api/profiles";

export const Route = createFileRoute("/dashboard/profile")({
  component: DashboardProfilePage,
  errorComponent: RouteErrorView
});

const changePasswordSchema = z
  .object({
    confirmNewPassword: z.string().min(8, "Confirm password must be at least 8 characters"),
    currentPassword: z.string().min(8, "Current password must be at least 8 characters"),
    newPassword: z.string().min(8, "New password must be at least 8 characters")
  })
  .refine((values) => values.newPassword === values.confirmNewPassword, {
    message: "New password and confirm password must match",
    path: ["confirmNewPassword"]
  })
  .refine((values) => values.currentPassword !== values.newPassword, {
    message: "New password must be different from current password",
    path: ["newPassword"]
  });

function DashboardProfilePage(): JSX.Element {
  const router = useRouter();
  const { isPending: isSessionPending, refetch: refetchSession, session } = useAuthSession();
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isPasswordSubmitting, setIsPasswordSubmitting] = useState(false);
  const [profile, setProfile] = useState<OwnProfileData | null>(null);
  const passwordForm = useZodForm<z.infer<typeof changePasswordSchema>>({
    defaultValues: {
      confirmNewPassword: "",
      currentPassword: "",
      newPassword: ""
    },
    schema: changePasswordSchema
  });
  const {
    formState: { errors: passwordErrors },
    handleSubmit: handlePasswordSubmit,
    register: registerPassword,
    reset: resetPasswordForm
  } = passwordForm;

  useEffect(() => {
    if (isSessionPending || !session) {
      return;
    }

    void (async () => {
      setIsLoading(true);

      try {
        const nextProfile = await getOwnProfile();
        setProfile(nextProfile);
      } finally {
        setIsLoading(false);
      }
    })();
  }, [isSessionPending, session]);

  const handleStudentSubmit = async (values: StudentProfileInput): Promise<void> => {
    setIsSubmitting(true);

    try {
      const nextProfile = await updateStudentProfile(values);
      setProfile(nextProfile);
      await refetchSession();
      toast.success("Student profile updated");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleTeacherSubmit = async (values: TeacherProfileInput): Promise<void> => {
    setIsSubmitting(true);

    try {
      const nextProfile = await updateTeacherProfile(values);
      setProfile(nextProfile);
      await refetchSession();
      toast.success("Teacher profile updated");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleBasicSubmit = async (values: BasicProfileInput): Promise<void> => {
    setIsSubmitting(true);

    try {
      const nextProfile = await updateBasicProfile(values);
      setProfile(nextProfile);
      await refetchSession();
      toast.success("Profile updated");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handlePasswordChange = handlePasswordSubmit(async (values) => {
    setIsPasswordSubmitting(true);
    try {
      const response = await authClient.changePassword({
        currentPassword: values.currentPassword,
        newPassword: values.newPassword,
        revokeOtherSessions: true
      });

      if (response.error) {
        toast.error(response.error.message ?? "Failed to change password");
        return;
      }

      resetPasswordForm();
      toast.success("Password updated successfully");
    } finally {
      setIsPasswordSubmitting(false);
    }
  });

  if (isSessionPending || isLoading || !session) {
    return <ProfilePageSkeleton />;
  }

  return (
    <div className="space-y-6">
      <RoleProfileForm
        description="Keep your profile current so enrollment, teacher visibility, and course interactions stay accurate across the academy."
        initialProfile={profile}
        isSubmitting={isSubmitting}
        onSubmitBasic={handleBasicSubmit}
        onSubmitStudent={handleStudentSubmit}
        onSubmitTeacher={handleTeacherSubmit}
        role={session.session.role as UserRole}
        title="Your profile"
      />

      {profile?.user.role === "TEACHER" ? (
        <div className="bg-surface-container-lowest/80 backdrop-blur-3xl rounded-4xl p-8 sm:p-12 border border-outline-variant/40 shadow-xl relative w-full overflow-hidden group">
          <div className="absolute -top-12 -right-12 w-48 h-48 bg-primary/5 rounded-full blur-2xl pointer-events-none transition-all duration-1000 group-hover:bg-primary/10 z-[-1]"></div>
          <div className="mb-8 text-center sm:text-left">
            <h3 className="font-headline text-2xl font-extrabold tracking-tight text-on-surface">
              Public teacher card
            </h3>
            <p className="mt-2 text-sm text-on-surface-variant font-light max-w-2xl leading-relaxed">
              The public teacher page uses your bio, qualifications, specializations, and published
              courses.
            </p>
          </div>
          <button
            className="inline-flex h-12 items-center justify-center rounded-2xl bg-surface-container-highest px-8 font-headline font-semibold text-sm text-on-surface transition-all duration-300 hover:bg-surface-container-high hover:shadow-sm"
            type="button"
            onClick={() =>
              void router.navigate({ to: "/teachers/$id", params: { id: profile.user.id } })
            }
          >
            Preview public teacher profile
          </button>
        </div>
      ) : null}

      <div className="bg-surface-container-lowest/80 backdrop-blur-3xl rounded-4xl p-8 sm:p-12 border border-outline-variant/40 shadow-xl relative w-full overflow-hidden group">
        <div className="absolute -top-12 -left-12 w-48 h-48 bg-secondary/5 rounded-full blur-2xl pointer-events-none transition-all duration-1000 group-hover:bg-secondary/10 z-[-1]"></div>
        <div className="mb-8 text-center sm:text-left">
          <h3 className="font-headline text-2xl font-extrabold tracking-tight text-on-surface">
            Change password
          </h3>
          <p className="mt-2 text-sm text-on-surface-variant font-light max-w-2xl leading-relaxed">
            Use your current password and set a stronger one to keep your account secure.
          </p>
        </div>

        <form className="space-y-6" onSubmit={handlePasswordChange}>
          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2 md:col-span-2">
              <Label htmlFor="current-password">Current password</Label>
              <PasswordInput
                id="current-password"
                autoComplete="current-password"
                error={passwordErrors.currentPassword?.message}
                {...registerPassword("currentPassword")}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="new-password">New password</Label>
              <PasswordInput
                id="new-password"
                autoComplete="new-password"
                error={passwordErrors.newPassword?.message}
                {...registerPassword("newPassword")}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="confirm-new-password">Confirm new password</Label>
              <PasswordInput
                id="confirm-new-password"
                autoComplete="new-password"
                error={passwordErrors.confirmNewPassword?.message}
                {...registerPassword("confirmNewPassword")}
              />
            </div>
          </div>

          <div className="pt-6 border-t border-outline-variant/20 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <p className="text-xs text-on-surface/50 font-light">
              This updates your credential login password. Other sessions will be signed out.
            </p>
            <Button
              className="h-12 w-full sm:w-auto font-headline font-semibold px-10 bg-primary text-white hover:bg-on-surface transition-all shadow-md"
              type="submit"
              disabled={isPasswordSubmitting}
            >
              {isPasswordSubmitting ? "Updating..." : "Update password"}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
