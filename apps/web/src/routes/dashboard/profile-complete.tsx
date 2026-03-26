import { createFileRoute, useRouter } from "@tanstack/react-router";
import type { JSX } from "react";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import type { UserRole } from "@mma/shared";
import { z } from "zod";

import { ProfilePageSkeleton, RoleProfileForm } from "@/components/profile/profile-editor";
import { RouteErrorView } from "@/components/common/route-error";
import { useAuthSession } from "@/hooks/use-auth-session";
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

const searchSchema = z.object({
  courseSlug: z.string().trim().min(1).optional()
});

export const Route = createFileRoute("/dashboard/profile-complete")({
  validateSearch: (search) => searchSchema.parse(search),
  component: CompleteProfilePage,
  errorComponent: RouteErrorView
});

function CompleteProfilePage(): JSX.Element {
  const router = useRouter();
  const search = Route.useSearch();
  const { isPending: isSessionPending, refetch: refetchSession, session } = useAuthSession();
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [profile, setProfile] = useState<OwnProfileData | null>(null);

  const getPostCompletionHref = (): string => {
    return search.courseSlug ? `/courses/${search.courseSlug}` : "/dashboard/profile";
  };

  useEffect(() => {
    if (isSessionPending || !session) {
      return;
    }

    if (session.session.profileCompleted) {
      if (search.courseSlug) {
        void router.navigate({
          to: "/courses/$slug",
          params: { slug: search.courseSlug }
        });
        return;
      }

      void router.navigate({ to: "/dashboard/profile" });
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
  }, [isSessionPending, router, search.courseSlug, session]);

  const finishFlow = async (nextProfile: OwnProfileData, message: string): Promise<void> => {
    setProfile(nextProfile);
    await refetchSession();
    toast.success(message);
    window.location.assign(getPostCompletionHref());
  };

  const handleStudentSubmit = async (values: StudentProfileInput): Promise<void> => {
    setIsSubmitting(true);

    try {
      const nextProfile = await updateStudentProfile(values);
      await finishFlow(nextProfile, "Student profile completed");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleTeacherSubmit = async (values: TeacherProfileInput): Promise<void> => {
    setIsSubmitting(true);

    try {
      const nextProfile = await updateTeacherProfile(values);
      await finishFlow(nextProfile, "Teacher profile completed");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleBasicSubmit = async (values: BasicProfileInput): Promise<void> => {
    setIsSubmitting(true);

    try {
      const nextProfile = await updateBasicProfile(values);
      await finishFlow(nextProfile, "Profile completed");
    } finally {
      setIsSubmitting(false);
    }
  };

  if (isSessionPending || isLoading || !session) {
    return <ProfilePageSkeleton />;
  }

  return (
    <RoleProfileForm
      description="Finish this guided setup once so the dashboard can unlock the rest of your role-specific experience."
      initialProfile={profile}
      isSubmitting={isSubmitting}
      onSubmitBasic={handleBasicSubmit}
      onSubmitStudent={handleStudentSubmit}
      onSubmitTeacher={handleTeacherSubmit}
      role={session.session.role as UserRole}
      title="Complete your profile"
    />
  );
}
