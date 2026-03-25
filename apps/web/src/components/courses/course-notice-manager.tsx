import { createCourseNoticeSchema } from "@mma/shared";
import { Pin, Trash2 } from "lucide-react";
import type { FormEvent, JSX } from "react";
import { useEffect, useState } from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  type CourseNotice,
  createCourseNotice,
  deleteCourseNotice,
  listCourseNotices,
  updateCourseNotice
} from "@/lib/api/course-notices";

export function CourseNoticeManager({ courseId }: { courseId: string }): JSX.Element {
  const [notices, setNotices] = useState<readonly CourseNotice[]>([]);
  const [loading, setLoading] = useState(true);
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [isPinned, setIsPinned] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const load = async (): Promise<void> => {
    setLoading(true);
    try {
      const items = await listCourseNotices(courseId);
      setNotices(items);
    } catch {
      toast.error("Could not load notices");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void load();
  }, [courseId]);

  async function handleCreate(e: FormEvent): Promise<void> {
    e.preventDefault();
    const parsed = createCourseNoticeSchema.safeParse({
      content: content.trim(),
      isPinned,
      title: title.trim()
    });

    if (!parsed.success) {
      toast.error(parsed.error.issues[0]?.message ?? "Invalid form");

      return;
    }

    setSubmitting(true);
    try {
      await createCourseNotice(courseId, parsed.data);
      toast.success("Notice published");
      setTitle("");
      setContent("");
      setIsPinned(false);
      await load();
    } finally {
      setSubmitting(false);
    }
  }

  async function togglePin(notice: CourseNotice): Promise<void> {
    try {
      await updateCourseNotice(notice.id, { isPinned: !notice.isPinned });
      await load();
    } catch {
      toast.error("Could not update notice");
    }
  }

  async function handleDelete(notice: CourseNotice): Promise<void> {
    if (!window.confirm("Delete this notice?")) {
      return;
    }

    try {
      await deleteCourseNotice(notice.id);
      toast.success("Notice removed");
      await load();
    } catch {
      toast.error("Could not delete notice");
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Course noticeboard</CardTitle>
        <CardDescription>
          Post updates for enrolled students. They see these inside the learning player under Course notices.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <form onSubmit={(e) => void handleCreate(e)} className="space-y-3 rounded-[calc(var(--radius)-0.125rem)] border border-outline-variant/60 bg-surface-container-low/60 p-4">
          <div className="space-y-2">
            <Label htmlFor="notice-title">Title</Label>
            <Input
              id="notice-title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              required
              maxLength={255}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="notice-body">Message</Label>
            <textarea
              id="notice-body"
              value={content}
              onChange={(e) => setContent(e.target.value)}
              required
              rows={4}
              maxLength={8000}
              className="w-full rounded-[calc(var(--radius)-0.125rem)] bg-surface-container-low px-4 py-3 text-sm text-on-surface shadow-[inset_0_0_0_1px_rgba(118,119,125,0.14)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-secondary-container/20 resize-y min-h-[100px]"
            />
          </div>
          <label className="flex items-center gap-2 text-sm text-on-surface">
            <input
              type="checkbox"
              checked={isPinned}
              onChange={(e) => setIsPinned(e.target.checked)}
            />
            Pin to top (max 10 per course)
          </label>
          <Button type="submit" disabled={submitting}>
            {submitting ? "Publishing…" : "Publish notice"}
          </Button>
        </form>

        <div className="space-y-3">
          <p className="text-sm font-medium text-on-surface">Published notices</p>
          {loading ? (
            <p className="text-sm text-on-surface/60">Loading…</p>
          ) : notices.length === 0 ? (
            <p className="text-sm text-on-surface/60">No notices yet.</p>
          ) : (
            <ul className="space-y-2">
              {notices.map((notice) => (
                <li
                  key={notice.id}
                  className="flex flex-col gap-2 rounded-[calc(var(--radius)-0.125rem)] border border-outline-variant/50 bg-surface-container-low/40 px-4 py-3 sm:flex-row sm:items-center sm:justify-between"
                >
                  <div className="min-w-0">
                    <p className="font-medium text-on-surface truncate">{notice.title}</p>
                    <p className="text-xs text-on-surface/55">
                      {notice.author.name} · {new Date(notice.createdAt).toLocaleDateString()}
                      {notice.isPinned ? " · pinned" : ""}
                    </p>
                  </div>
                  <div className="flex shrink-0 gap-2">
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => void togglePin(notice)}
                    >
                      <Pin className="size-4" />
                      {notice.isPinned ? "Unpin" : "Pin"}
                    </Button>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      className="text-[#c4353b]"
                      onClick={() => void handleDelete(notice)}
                    >
                      <Trash2 className="size-4" />
                      Delete
                    </Button>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
