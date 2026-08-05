import { useQuery } from "@tanstack/react-query";
import { Pin } from "lucide-react";
import type { JSX } from "react";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { type CourseNotice, listCourseNotices } from "@/lib/api/course-notices";
import { queryKeys } from "@/lib/query/keys";
import { useT } from "@/lib/i18n/locale-context";

export function CourseNoticesPanel({ courseId }: { courseId: string }): JSX.Element {
  const t = useT();

  const { data, isPending } = useQuery<readonly CourseNotice[]>({
    queryFn: async () => listCourseNotices(courseId),
    queryKey: queryKeys.notices.course(courseId)
  });
  // A failed load shows the empty state, not the skeleton forever. The ky
  // interceptor has already said why.
  const notices: readonly CourseNotice[] | null = isPending ? null : (data ?? []);

  if (notices === null) {
    return (
      <Card className="border-hairline/60 bg-panel-warm/70">
        <CardHeader>
          <Skeleton className="h-7 w-48" />
          <Skeleton className="h-4 w-full max-w-72" />
        </CardHeader>
        <CardContent className="space-y-3">
          <Skeleton className="h-24 w-full" />
          <Skeleton className="h-24 w-full" />
        </CardContent>
      </Card>
    );
  }

  if (notices.length === 0) {
    return (
      <Card className="border-hairline/60 bg-panel-warm/70">
        <CardHeader>
          <CardTitle className="font-display">{t("notices.title")}</CardTitle>
          <CardDescription>{t("notices.lead")}</CardDescription>
        </CardHeader>
        <CardContent className="text-sm leading-7 text-ink/68">{t("notices.empty")}</CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      <Card className="border-hairline/60 bg-panel-warm/70">
        <CardHeader>
          <CardTitle className="font-display">{t("notices.title")}</CardTitle>
          <CardDescription>{t("notices.pinnedLead")}</CardDescription>
        </CardHeader>
      </Card>
      <div className="grid gap-3">
        {notices.map((notice) => (
          <Card
            key={notice.id}
            className={`border-hairline bg-card ${
              notice.isPinned ? "ring-1 ring-accent/35" : ""
            }`}
          >
            <CardHeader className="space-y-1">
              <div className="flex flex-wrap items-center gap-2">
                {notice.isPinned ? (
                  <span className="inline-flex items-center gap-1 rounded-full bg-accent/15 px-2 py-0.5 text-xs font-medium text-ink">
                    <Pin className="size-3" />{t("notices.pinned")}</span>
                ) : null}
                <span className="text-xs text-ink/55">
                  {notice.author.name} · {new Date(notice.createdAt).toLocaleString()}
                </span>
              </div>
              <CardTitle className="text-lg font-semibold">{notice.title}</CardTitle>
            </CardHeader>
            <CardContent className="text-sm leading-7 text-ink/80 whitespace-pre-wrap">
              {notice.content}
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
