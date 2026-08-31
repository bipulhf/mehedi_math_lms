import { useQuery } from "@tanstack/react-query";
import { FileText } from "lucide-react";
import type { JSX } from "react";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { RichTextContent } from "@/components/ui/rich-text-content";
import { Skeleton } from "@/components/ui/skeleton";
import { type CourseRoutine, getCourseRoutine } from "@/lib/api/course-routines";
import { useT } from "@/lib/i18n/locale-context";
import { queryKeys } from "@/lib/query/keys";

/** The routine as a student reads it: whichever halves the teacher published. */
export function CourseRoutinePanel({ courseId }: { courseId: string }): JSX.Element {
  const t = useT();

  const { data, isPending } = useQuery<CourseRoutine | null>({
    queryFn: async () => getCourseRoutine(courseId),
    queryKey: queryKeys.routines.course(courseId)
  });

  if (isPending) {
    return (
      <Card className="border-hairline/60 bg-panel-warm/70">
        <CardHeader>
          <Skeleton className="h-7 w-48" />
          <Skeleton className="h-4 w-full max-w-72" />
        </CardHeader>
        <CardContent className="space-y-3">
          <Skeleton className="h-24 w-full" />
        </CardContent>
      </Card>
    );
  }

  // A failed load reads as "nothing published yet" rather than a stuck
  // skeleton — the ky interceptor has already said why.
  const routine = data ?? null;

  if (!routine) {
    return (
      <Card className="border-hairline/60 bg-panel-warm/70">
        <CardHeader>
          <CardTitle className="font-display">{t("routine.title")}</CardTitle>
          <CardDescription>{t("routine.lead")}</CardDescription>
        </CardHeader>
        <CardContent className="text-sm leading-7 text-ink/68">{t("routine.empty")}</CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      <Card className="border-hairline/60 bg-panel-warm/70">
        <CardHeader>
          <CardTitle className="font-display">{t("routine.title")}</CardTitle>
          <CardDescription>{t("routine.lead")}</CardDescription>
        </CardHeader>
      </Card>

      {routine.content ? (
        <Card className="border-hairline bg-card">
          <CardContent className="pt-6">
            <RichTextContent
              className="text-sm leading-7 text-ink/80"
              html={routine.content}
            />
          </CardContent>
        </Card>
      ) : null}

      {routine.attachmentUrl ? (
        <a
          className="flex items-center gap-3 border border-hairline bg-card px-5 py-4 text-sm text-ink transition-colors hover:bg-row-hover"
          href={routine.attachmentUrl}
          rel="noreferrer"
          target="_blank"
        >
          <FileText aria-hidden="true" className="size-4 shrink-0 text-accent" />
          <span className="truncate">
            {routine.attachmentName ?? t("routine.openAttachment")}
          </span>
        </a>
      ) : null}
    </div>
  );
}
