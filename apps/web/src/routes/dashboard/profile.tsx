import { useQuery } from "@tanstack/react-query";
import { createFileRoute, useRouter } from "@tanstack/react-router";
import type { JSX } from "react";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import type { UserRole } from "@genex/shared";
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
import { queryKeys } from "@/lib/query/keys";
import { useT } from "@/lib/i18n/locale-context";

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
  const t = useT();

  const router = useRouter();
  const { isPending: isSessionPending, refetch: refetchSession, session } = useAuthSession();
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

  const { data: fetchedProfile, isPending } = useQuery<OwnProfileData>({
    enabled: !isSessionPending && Boolean(session),
    queryFn: async () => getOwnProfile(),
    queryKey: queryKeys.profiles.me()
  });

  // The forms write back through setProfile after each save, so the fetched
  // record seeds local state rather than being rendered directly.
  useEffect(() => {
    if (fetchedProfile) {
      setProfile(fetchedProfile);
    }
  }, [fetchedProfile]);

  const handleStudentSubmit = async (values: StudentProfileInput): Promise<void> => {
    setIsSubmitting(true);

    try {
      const nextProfile = await updateStudentProfile(values);
      setProfile(nextProfile);
      await refetchSession();

      // Each step of the form saves. Only the last one is worth a toast.
      if (values.isComplete !== false) {
        toast.success(t("prof.studentUpdated"));
      }
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

      // Each step of the form saves. Only the last one is worth a toast.
      if (values.isComplete !== false) {
        toast.success(t("prof.studentUpdated"));
      }
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

      // Each step of the form saves. Only the last one is worth a toast.
      if (values.isComplete !== false) {
        toast.success(t("prof.studentUpdated"));
      }
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
      toast.success(t("prof.passwordUpdated"));
    } finally {
      setIsPasswordSubmitting(false);
    }
  });

  if (isSessionPending || isPending || !session) {
    return <ProfilePageSkeleton />;
  }

  // Null until the profile has been saved once, which is when the slug is
  // generated — and the slug, not the id, is what addresses the public page.
  const teacherPageSlug = profile?.user.slug ?? null;

  return (
    <div className="space-y-6">
      <RoleProfileForm
        description="Keep your profile current so enrollment, teacher visibility, and course interactions stay accurate across the academy."
        initialProfile={profile ?? fetchedProfile ?? null}
        isSubmitting={isSubmitting}
        onSubmitBasic={handleBasicSubmit}
        onSubmitStudent={handleStudentSubmit}
        onSubmitTeacher={handleTeacherSubmit}
        role={session.session.role as UserRole}
        title={t("prof.title")}
      />

      {profile?.user.role === "TEACHER" ? (
        <div className="bg-card/80 p-8 sm:p-12 border border-hairline/40 relative w-full overflow-hidden group">
          <div className="mb-8 text-center sm:text-left">
            <h3 className="font-body text-2xl font-medium tracking-tight text-ink">{t("prof.teacherCard")}</h3>
            <p className="mt-2 text-sm text-muted font-light max-w-2xl leading-relaxed">
              The public teacher page uses your bio, qualifications, specializations, and published
              courses.
            </p>
          </div>
          {/* The public page is addressed by slug, not id — `/teachers/<uuid>`
              is a 404. The slug is generated when the profile is saved, so a
              teacher who has never saved one has no page to preview yet. */}
          {teacherPageSlug ? (
            <button
              className="inline-flex h-12 items-center justify-center bg-chip-active px-8 font-body font-semibold text-sm text-ink transition-all hover:bg-chip-active"
              type="button"
              onClick={() =>
                void router.navigate({
                  to: "/teachers/$slug",
                  params: { slug: teacherPageSlug }
                })
              }
            >{t("prof.previewTeacher")}</button>
          ) : (
            <p className="text-sm leading-6 text-ink/62">{t("prof.noSlug")}</p>
          )}
        </div>
      ) : null}

      <div className="bg-card/80 p-8 sm:p-12 border border-hairline/40 relative w-full overflow-hidden group">
        <div className="mb-8 text-center sm:text-left">
          <h3 className="font-body text-2xl font-medium tracking-tight text-ink">{t("prof.changePassword")}</h3>
          <p className="mt-2 text-sm text-muted font-light max-w-2xl leading-relaxed">{t("prof.changePasswordLead")}</p>
        </div>

        <form className="space-y-6" onSubmit={handlePasswordChange}>
          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2 md:col-span-2">
              <Label htmlFor="current-password">{t("prof.currentPassword")}</Label>
              <PasswordInput
                id="current-password"
                autoComplete="current-password"
                error={passwordErrors.currentPassword?.message}
                {...registerPassword("currentPassword")}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="new-password">{t("prof.newPassword")}</Label>
              <PasswordInput
                id="new-password"
                autoComplete="new-password"
                error={passwordErrors.newPassword?.message}
                {...registerPassword("newPassword")}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="confirm-new-password">{t("prof.confirmNewPassword")}</Label>
              <PasswordInput
                id="confirm-new-password"
                autoComplete="new-password"
                error={passwordErrors.confirmNewPassword?.message}
                {...registerPassword("confirmNewPassword")}
              />
            </div>
          </div>

          <div className="pt-6 border-t border-hairline/20 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <p className="text-xs text-ink/50 font-light">{t("prof.passwordNote")}</p>
            <Button
              className="h-12 w-full sm:w-auto font-body font-semibold px-10 bg-ink text-white hover:bg-ink transition-all"
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
