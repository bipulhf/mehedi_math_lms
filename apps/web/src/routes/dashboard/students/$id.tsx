import { useQuery } from "@tanstack/react-query";
import { createFileRoute, useRouter } from "@tanstack/react-router";
import { User, Mail, Phone, GraduationCap, Calendar, MapPin, ShieldCheck, CheckCircle2, AlertCircle } from "lucide-react";
import type { JSX } from "react";
import { useEffect } from "react";
import { toast } from "sonner";

import { ProfilePageSkeleton } from "@/components/profile/profile-editor";
import { RouteErrorView } from "@/components/common/route-error";
import { Badge } from "@/components/ui/badge";
import { BackButton } from "@/components/ui/back-button";
import { useAuthSession } from "@/hooks/use-auth-session";
import type { OwnProfileData } from "@/lib/api/profiles";
import { getAdminStudentProfile } from "@/lib/api/profiles";
import { queryKeys } from "@/lib/query/keys";
import { seo } from "@/lib/seo";
import { useT } from "@/lib/i18n/locale-context";
import { RichTextContent } from "@/components/ui/rich-text-content";

export const Route = createFileRoute("/dashboard/students/$id")({
  head: () =>
    seo({
      description: "A student's enrolment history and contact details.",
      path: "/dashboard/students",
      title: "Student Profile"
    }),
  component: AdminStudentProfilePage,
  errorComponent: RouteErrorView
});

function AdminStudentProfilePage(): JSX.Element {
  const t = useT();

  const { id } = Route.useParams();
  const router = useRouter();
  const { isPending: isSessionPending, session } = useAuthSession();
  const canView = !isSessionPending && (session?.session.role === "ADMIN" || session?.session.role === "TEACHER");

  const { data: profile = null, isPending: isLoading } = useQuery<OwnProfileData>({
    enabled: canView,
    queryFn: async () => getAdminStudentProfile(id),
    queryKey: queryKeys.profiles.student(id)
  });

  useEffect(() => {
    if (isSessionPending || !session || session.session.role === "ADMIN" || session.session.role === "TEACHER") {
      return;
    }

    toast.error(t("astudent.adminOnly"));
    void router.navigate({ to: "/dashboard" });
  }, [isSessionPending, router, session, t]);

  if (isSessionPending || isLoading || !profile) {
    return <ProfilePageSkeleton />;
  }

  return (
    <div className="space-y-6">
      {/* Header Bar */}
      <div className="border border-hairline bg-card p-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="mb-2 flex items-center gap-3">
             <BackButton to="/dashboard/students" />
            <h1 className="text-xl font-medium text-ink">{profile.user.name}</h1>
            <Badge tone="quiet" className="px-2.5 py-0.5 text-xs font-semibold">
              {profile.user.role}
            </Badge>
          </div>
          <p className="text-xs font-light text-muted">{profile.user.email}</p>
        </div>

        <div className="flex items-center gap-2">
          <div className="flex items-center gap-2 px-3 py-1.5 rounded-full border border-hairline bg-panel-warm/40 text-xs">
            {profile.user.isActive ? (
              <>
                <div className="size-2 rounded-full bg-success" />
                <span className="font-medium text-success">Active</span>
              </>
            ) : (
              <>
                <div className="size-2 rounded-full bg-error" />
                <span className="font-medium text-error">Inactive</span>
              </>
            )}
          </div>
        </div>
      </div>

      {/* Details Grid */}
      <div className="grid gap-6 md:grid-cols-2">
        {/* Contact Info */}
        <div className="border border-hairline bg-card p-6 space-y-4">
          <div className="flex items-center gap-2 border-b border-hairline pb-3">
            <User className="size-4 text-accent" />
            <h2 className="text-sm font-semibold uppercase tracking-wider text-ink">
              {t("astudent.contact")}
            </h2>
          </div>
          <div className="space-y-3 text-sm">
            <div className="flex items-center justify-between">
              <span className="text-muted flex items-center gap-2">
                <Mail className="size-3.5" /> Email
              </span>
              <span className="font-medium text-ink">{profile.user.email}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-muted flex items-center gap-2">
                <Phone className="size-3.5" /> Phone
              </span>
              <span className="font-medium text-ink">
                {profile.studentProfile?.phone || "Not added"}
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-muted">Guardian Name</span>
              <span className="font-medium text-ink">
                {profile.studentProfile?.guardianName || "Not added"}
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-muted">Guardian Phone</span>
              <span className="font-medium text-ink">
                {profile.studentProfile?.guardianPhone || "Not added"}
              </span>
            </div>
          </div>
        </div>

        {/* Academic Info */}
        <div className="border border-hairline bg-card p-6 space-y-4">
          <div className="flex items-center gap-2 border-b border-hairline pb-3">
            <GraduationCap className="size-4 text-accent" />
            <h2 className="text-sm font-semibold uppercase tracking-wider text-ink">
              {t("astudent.academic")}
            </h2>
          </div>
          <div className="space-y-3 text-sm">
            <div className="flex items-center justify-between">
              <span className="text-muted">Institution</span>
              <span className="font-medium text-ink">
                {profile.studentProfile?.institution || "Not added"}
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-muted">Class or Grade</span>
              <span className="font-medium text-ink">
                {profile.studentProfile?.classOrGrade || "Not added"}
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-muted flex items-center gap-2">
                <Calendar className="size-3.5" /> Date of Birth
              </span>
              <span className="font-medium text-ink">
                {profile.studentProfile?.dateOfBirth
                  ? new Date(profile.studentProfile.dateOfBirth).toLocaleDateString()
                  : "Not added"}
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-muted flex items-center gap-2">
                <ShieldCheck className="size-3.5" /> Profile Status
              </span>
              <div className="flex items-center gap-1.5">
                {profile.user.profileCompleted ? (
                  <>
                    <CheckCircle2 className="size-3.5 text-success" />
                    <span className="text-xs font-semibold text-success">Complete</span>
                  </>
                ) : (
                  <>
                    <AlertCircle className="size-3.5 text-warning" />
                    <span className="text-xs font-semibold text-warning">Incomplete</span>
                  </>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Address */}
        <div className="border border-hairline bg-card p-6 space-y-4 md:col-span-2">
          <div className="flex items-center gap-2 border-b border-hairline pb-3">
            <MapPin className="size-4 text-accent" />
            <h2 className="text-sm font-semibold uppercase tracking-wider text-ink">
              {t("profile.address")}
            </h2>
          </div>
          {profile.studentProfile?.address ? (
            <RichTextContent
              className="text-sm leading-relaxed text-ink"
              html={profile.studentProfile.address}
            />
          ) : (
            <p className="text-sm leading-relaxed text-muted">{t("profile.noAddress")}</p>
          )}
        </div>
      </div>
    </div>
  );
}
