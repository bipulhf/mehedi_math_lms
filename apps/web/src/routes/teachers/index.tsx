import { Link, createFileRoute } from "@tanstack/react-router";
import type { JSX } from "react";

import { PublicLayout, PublicSection } from "@/components/layout/public-layout";
import { RouteErrorView } from "@/components/common/route-error";
import { Avatar } from "@/components/ui/avatar";
import { EmptyState } from "@/components/ui/empty-state";
import { Skeleton } from "@/components/ui/skeleton";
import type { TeacherDirectoryEntry } from "@/lib/api/profiles";
import { useFormat, useT } from "@/lib/i18n/locale-context";
import { breadcrumbJsonLd, seo } from "@/lib/seo";
import { ssrApiGet } from "@/lib/ssr-api";
import { RichTextContent } from "@/components/ui/rich-text-content";
import { stripHtml } from "@/lib/html";

export const Route = createFileRoute("/teachers/")({
  loader: async () => ssrApiGet<readonly TeacherDirectoryEntry[]>("/profiles/teachers"),
  head: () =>
    seo({
      description:
        "Every teacher publishing on Genex — their subjects, course counts and student numbers.",
      jsonLd: [
        breadcrumbJsonLd([
          { name: "Home", path: "/" },
          { name: "Teachers", path: "/teachers" }
        ])
      ],
      path: "/teachers",
      title: "Teachers"
    }),
  component: TeacherDirectoryPage,
  errorComponent: RouteErrorView,
  pendingComponent: TeacherDirectorySkeleton
});

function TeacherDirectoryPage(): JSX.Element {
  const teachers: readonly TeacherDirectoryEntry[] = Route.useLoaderData();
  const t = useT();

  return (
    <PublicLayout eyebrow={t("nav.teachers")} subtitle={t("teachers.lead")} title={t("teachers.title")}>
      <PublicSection>
        {teachers.length === 0 ? (
          <EmptyState message={t("teachers.empty")} />
        ) : (
          <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {teachers.map((teacher) => (
              <TeacherCard key={teacher.id} teacher={teacher} />
            ))}
          </div>
        )}
      </PublicSection>
    </PublicLayout>
  );
}

function TeacherCard({ teacher }: { teacher: TeacherDirectoryEntry }): JSX.Element {
  const t = useT();
  const format = useFormat();

  return (
    <Link
      className="flex flex-col gap-4 border border-hairline bg-card p-6 transition-colors hover:border-line-strong"
      params={{ slug: teacher.slug }}
      to="/teachers/$slug"
    >
      <div className="flex items-center gap-4">
        <Avatar className="size-14" name={teacher.name} photo={teacher.profilePhoto} />
        <div className="min-w-0">
          <p className="truncate text-lg font-medium text-ink">{teacher.name}</p>
          {teacher.specializations === null ? null : (
            // One truncated line: stripped, because a paragraph inside it would
            // break the ellipsis this row depends on.
            <p className="truncate text-sm text-muted-light">
              {stripHtml(teacher.specializations)}
            </p>
          )}
        </div>
      </div>

      {teacher.bio === null ? null : (
        <RichTextContent
          className="line-clamp-3 text-base font-light leading-relaxed text-muted"
          html={teacher.bio}
        />
      )}

      <div className="mt-auto flex gap-4 border-t border-hairline-faint pt-4 text-sm text-muted-light">
        <span>
          {format.number(teacher.courseCount)} {t("common.courses")}
        </span>
        <span>
          {format.number(teacher.studentCount)} {t("common.students")}
        </span>
      </div>
    </Link>
  );
}

function TeacherDirectorySkeleton(): JSX.Element {
  return (
    <PublicLayout>
      <PublicSection>
        <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 6 }, (_, index) => (
            <Skeleton className="h-52 w-full" key={index} />
          ))}
        </div>
      </PublicSection>
    </PublicLayout>
  );
}
