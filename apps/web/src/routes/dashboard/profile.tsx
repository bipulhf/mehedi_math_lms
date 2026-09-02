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
import { seo } from "@/lib/seo";
import { useT } from "@/lib/i18n/locale-context";

export const Route = createFileRoute("/dashboard/profile")({
  head: () =>
    seo({
      description: "Your account details, password, and role-specific information.",
      path: "/dashboard/profile",
      title: "Profile"
    }),
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

  const { data: hasPassword = false } = useQuery({
    queryFn: async (): Promise<boolean> => {
      const response = await authClient.listAccounts();

      return (response.data ?? []).some((account) => account.providerId === "credential");
    },
    queryKey: queryKeys.auth.accounts()
  });

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
    <div className="space-y-4">
      <RoleProfileForm
        description={t("prof.lead")}
        initialProfile={profile ?? fetchedProfile ?? null}
        isSubmitting={isSubmitting}
        onSubmitBasic={handleBasicSubmit}
        onSubmitStudent={handleStudentSubmit}
        onSubmitTeacher={handleTeacherSubmit}
        role={session.session.role as UserRole}
        title={t("prof.title")}
      />

      {profile?.user.role === "TEACHER" ? (
        <div className="w-full border border-hairline bg-card p-6 sm:p-8">
          <div className="border-b border-hairline pb-5">
            <h2 className="text-xl font-medium text-ink">{t("prof.teacherCard")}</h2>
            <p className="mt-2 max-w-2xl text-base font-light leading-relaxed text-muted">
              {t("prof.teacherCardLead")}
            </p>
          </div>
          {/* The public page is addressed by slug, not id — `/teachers/<uuid>`
              is a 404. The slug is generated when the profile is saved, so a
              teacher who has never saved one has no page to preview yet. */}
          {teacherPageSlug ? (
            <Button
              className="mt-5 h-11"
              onClick={() =>
                void router.navigate({
                  params: { slug: teacherPageSlug },
                  to: "/teachers/$slug"
                })
              }
              type="button"
              variant="outline"
            >
              {t("prof.previewTeacher")}
            </Button>
          ) : (
            <p className="mt-5 text-base font-light leading-relaxed text-muted">{t("prof.noSlug")}</p>
          )}
        </div>
      ) : null}

      {/* Somebody who arrived through Google or a phone code has no password
          to change. Better Auth answers `changePassword` with an error for
          them, and a form whose only outcome is that error is worse than no
          form -- so ask which credentials the account actually carries. */}
      {hasPassword ? (
        <div className="w-full border border-hairline bg-card p-6 sm:p-8">
          <div className="border-b border-hairline pb-5">
            <h2 className="text-xl font-medium text-ink">{t("prof.changePassword")}</h2>
            <p className="mt-2 max-w-2xl text-base font-light leading-relaxed text-muted">
              {t("prof.changePasswordLead")}
            </p>
          </div>

          <form className="mt-6 space-y-6" onSubmit={handlePasswordChange}>
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

            <div className="flex flex-col gap-3 border-t border-hairline pt-6 sm:flex-row sm:items-center sm:justify-between">
              <p className="text-sm font-light text-muted-light">{t("prof.passwordNote")}</p>
              <Button className="h-11 w-full sm:w-auto" disabled={isPasswordSubmitting} type="submit">
                {isPasswordSubmitting ? t("prof.updatingPassword") : t("prof.updatePassword")}
              </Button>
            </div>
          </form>
        </div>
      ) : null}
    </div>
  );
}
