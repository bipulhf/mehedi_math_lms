import { Pin } from "lucide-react";
import type { JSX } from "react";
import { useEffect, useState } from "react";
import { toast } from "sonner";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { type CourseNotice, listCourseNotices } from "@/lib/api/course-notices";

export function CourseNoticesPanel({ courseId }: { courseId: string }): JSX.Element {
  const [notices, setNotices] = useState<readonly CourseNotice[] | null>(null);

  useEffect(() => {
    void (async () => {
      try {
        const items = await listCourseNotices(courseId);
        setNotices(items);
      } catch {
        toast.error("Could not load notices");
        setNotices([]);
      }
    })();
  }, [courseId]);

  if (notices === null) {
    return (
      <Card className="border-outline-variant/60 bg-surface-container-low/70 backdrop-blur-xl">
        <CardHeader>
          <Skeleton className="h-7 w-48" />
          <Skeleton className="h-4 w-72" />
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
      <Card className="border-outline-variant/60 bg-surface-container-low/70 backdrop-blur-xl">
        <CardHeader>
          <CardTitle className="font-display">Course notices</CardTitle>
          <CardDescription>
            Announcements from your instructors will appear here when posted.
          </CardDescription>
        </CardHeader>
        <CardContent className="text-sm leading-7 text-on-surface/68">
          No notices yet for this course.
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      <Card className="border-outline-variant/60 bg-surface-container-low/70 backdrop-blur-xl">
        <CardHeader>
          <CardTitle className="font-display">Course notices</CardTitle>
          <CardDescription>
            Pinned items stay at the top. Latest updates from your teaching team.
          </CardDescription>
        </CardHeader>
      </Card>
      <div className="grid gap-3">
        {notices.map((notice) => (
          <Card
            key={notice.id}
            className={`border-outline-variant/60 bg-surface-container-low/70 backdrop-blur-xl ${
              notice.isPinned ? "ring-1 ring-secondary-container/35" : ""
            }`}
          >
            <CardHeader className="space-y-1">
              <div className="flex flex-wrap items-center gap-2">
                {notice.isPinned ? (
                  <span className="inline-flex items-center gap-1 rounded-full bg-secondary-container/15 px-2 py-0.5 text-xs font-medium text-on-surface">
                    <Pin className="size-3" />
                    Pinned
                  </span>
                ) : null}
                <span className="text-xs text-on-surface/55">
                  {notice.author.name} · {new Date(notice.createdAt).toLocaleString()}
                </span>
              </div>
              <CardTitle className="text-lg font-semibold">{notice.title}</CardTitle>
            </CardHeader>
            <CardContent className="text-sm leading-7 text-on-surface/80 whitespace-pre-wrap">
              {notice.content}
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
