import { createFileRoute, useRouter } from "@tanstack/react-router";
import type { JSX } from "react";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import type { UserRole } from "@mma/shared";

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

export const Route = createFileRoute("/dashboard/profile")({
  component: DashboardProfilePage,
  errorComponent: RouteErrorView
});

function DashboardProfilePage(): JSX.Element {
  const router = useRouter();
  const { isPending: isSessionPending, refetch: refetchSession, session } = useAuthSession();
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [profile, setProfile] = useState<OwnProfileData | null>(null);

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
            <h3 className="font-headline text-2xl font-extrabold tracking-tight text-on-surface">Public teacher card</h3>
            <p className="mt-2 text-sm text-on-surface-variant font-light max-w-2xl leading-relaxed">
              The public teacher page uses your bio, qualifications, specializations, and published courses.
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
    </div>
  );
}
