import { useQuery } from "@tanstack/react-query";
import { createFileRoute, useRouter } from "@tanstack/react-router";
import type { JSX } from "react";
import { useEffect } from "react";
import { toast } from "sonner";

import { ProfilePageSkeleton } from "@/components/profile/profile-editor";
import { RouteErrorView } from "@/components/common/route-error";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useAuthSession } from "@/hooks/use-auth-session";
import type { OwnProfileData } from "@/lib/api/profiles";
import { getAdminStudentProfile } from "@/lib/api/profiles";
import { queryKeys } from "@/lib/query/keys";
import { useT } from "@/lib/i18n/locale-context";

export const Route = createFileRoute("/dashboard/students/$id")({
  component: AdminStudentProfilePage,
  errorComponent: RouteErrorView
});

function AdminStudentProfilePage(): JSX.Element {
  const t = useT();

  const { id } = Route.useParams();
  const router = useRouter();
  const { isPending: isSessionPending, session } = useAuthSession();
  const isAdmin = !isSessionPending && session?.session.role === "ADMIN";
  const { data: profile = null, isPending: isLoading } = useQuery<OwnProfileData>({
    enabled: isAdmin,
    queryFn: async () => getAdminStudentProfile(id),
    queryKey: queryKeys.profiles.student(id)
  });

  useEffect(() => {
    if (isSessionPending || !session || session.session.role === "ADMIN") {
      return;
    }

    toast.error(t("astudent.adminOnly"));
    void router.navigate({ to: "/dashboard" });
  }, [isSessionPending, router, session]);

  if (isSessionPending || isLoading || !profile) {
    return <ProfilePageSkeleton />;
  }

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle>{profile.user.name}</CardTitle>
          <CardDescription>{t("astudent.lead")}</CardDescription>
        </CardHeader>
        <CardContent className="grid gap-4 md:grid-cols-2">
          <div className="rounded-[calc(var(--radius)-0.125rem)] bg-panel-warm p-4 text-sm leading-7 text-ink/70">
            <p className="font-semibold text-ink">{t("astudent.contact")}</p>
            <p>Email: {profile.user.email}</p>
            <p>Phone: {profile.studentProfile?.phone ?? "Not added"}</p>
            <p>Guardian: {profile.studentProfile?.guardianName ?? "Not added"}</p>
            <p>Guardian phone: {profile.studentProfile?.guardianPhone ?? "Not added"}</p>
          </div>
          <div className="rounded-[calc(var(--radius)-0.125rem)] bg-panel-warm p-4 text-sm leading-7 text-ink/70">
            <p className="font-semibold text-ink">{t("astudent.academic")}</p>
            <p>Institution: {profile.studentProfile?.institution ?? "Not added"}</p>
            <p>Class or grade: {profile.studentProfile?.classOrGrade ?? "Not added"}</p>
            <p>Date of birth: {profile.studentProfile?.dateOfBirth?.slice(0, 10) ?? "Not added"}</p>
            <p>Status: {profile.user.isActive ? "Active" : "Inactive"}</p>
          </div>
          <div className="rounded-[calc(var(--radius)-0.125rem)] bg-panel-warm p-4 text-sm leading-7 text-ink/70 md:col-span-2">
            <p className="font-semibold text-ink">{t("profile.address")}</p>
            <p>{profile.studentProfile?.address ?? "Not added"}</p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
