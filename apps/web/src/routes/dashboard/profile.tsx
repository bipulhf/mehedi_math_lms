import { createFileRoute, useRouter } from "@tanstack/react-router";
import type { JSX } from "react";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import type { UserRole } from "@mma/shared";

import { ProfilePageSkeleton, RoleProfileForm } from "@/components/profile/profile-editor";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
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
    <div className="space-y-4">
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

      {profile?.user.role === "STUDENT" ? (
        <Card>
          <CardHeader>
            <CardTitle>Privacy scope</CardTitle>
            <CardDescription>
              Student profiles remain private to the student and administrators.
            </CardDescription>
          </CardHeader>
          <CardContent className="text-sm leading-7 text-on-surface/70">
            Your guardian, academic, and address information is stored for onboarding, enrollment operations,
            and academic support workflows.
          </CardContent>
        </Card>
      ) : null}

      {profile?.user.role === "TEACHER" ? (
        <Card>
          <CardHeader>
            <CardTitle>Public teacher card</CardTitle>
            <CardDescription>
              The public teacher page uses your bio, qualifications, specializations, and published courses.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <button
              className="text-sm font-semibold text-secondary-container"
              type="button"
              onClick={() => void router.navigate({ to: "/teachers/$id", params: { id: profile.user.id } })}
            >
              Preview public teacher profile
            </button>
          </CardContent>
        </Card>
      ) : null}
    </div>
  );
}
