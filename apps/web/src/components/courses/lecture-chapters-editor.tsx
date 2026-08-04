import { Plus, X } from "lucide-react";
import type { JSX } from "react";
import { useState } from "react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useT } from "@/lib/i18n/locale-context";

/**
 * A video chapter as edited in the authoring form. `key` is client-only --
 * chapters have no stable id worth keeping (the save endpoint always
 * replaces the whole set for a lecture, see ContentService.setLectureVideoChapters),
 * but React still needs something stable to key each row on so an in-progress
 * edit in one row doesn't get silently reused by another after add/remove.
 */
export interface DraftVideoChapter {
  key: string;
  timeSeconds: number;
  title: string;
}

function formatMmSs(totalSeconds: number): string {
  const wholeSeconds = Math.max(0, Math.floor(totalSeconds));
  const minutes = Math.floor(wholeSeconds / 60);
  const seconds = wholeSeconds % 60;

  return `${minutes}:${String(seconds).padStart(2, "0")}`;
}

/** Accepts m:ss, mm:ss or hh:mm:ss. Returns null for anything it can't parse. */
function parseMmSs(value: string): number | null {
  const parts = value.trim().split(":");

  if (parts.length < 1 || parts.length > 3 || parts.some((part) => part.trim() === "")) {
    return null;
  }

  const numbers = parts.map(Number);

  if (numbers.some((part) => !Number.isFinite(part) || part < 0)) {
    return null;
  }

  const [first, second, third] = numbers;

  if (numbers.length === 1) {
    return Math.floor(first!);
  }

  if (numbers.length === 2) {
    return second! < 60 ? Math.floor(first! * 60 + second!) : null;
  }

  return second! < 60 && third! < 60 ? Math.floor(first! * 3600 + second! * 60 + third!) : null;
}

function ChapterRow({
  chapter,
  onChange,
  onRemove
}: {
  chapter: DraftVideoChapter;
  onChange: (next: DraftVideoChapter) => void;
  onRemove: () => void;
}): JSX.Element {
  const t = useT();
  // Kept separate from the committed timeSeconds so a mid-edit, not-yet-valid
  // string (like "2:") doesn't get overwritten by a reformatted value on
  // every keystroke -- it only resyncs to the canonical mm:ss on blur.
  const [timeText, setTimeText] = useState(() => formatMmSs(chapter.timeSeconds));

  return (
    <div className="flex items-center gap-2">
      <Input
        aria-label={t("author.videoChapterTimeLabel")}
        className="label-mono w-20 shrink-0 text-center"
        onBlur={() => setTimeText(formatMmSs(chapter.timeSeconds))}
        onChange={(event) => {
          const text = event.target.value;
          setTimeText(text);
          const seconds = parseMmSs(text);

          if (seconds !== null) {
            onChange({ ...chapter, timeSeconds: seconds });
          }
        }}
        placeholder="0:00"
        value={timeText}
      />
      <Input
        aria-label={t("author.videoChapterTitleLabel")}
        className="flex-1"
        onChange={(event) => onChange({ ...chapter, title: event.target.value })}
        placeholder={t("author.videoChapterTitlePlaceholder")}
        value={chapter.title}
      />
      <button
        aria-label={t("author.removeVideoChapter")}
        className="flex size-9 shrink-0 items-center justify-center text-muted transition-colors hover:text-error"
        onClick={onRemove}
        type="button"
      >
        <X className="size-4" />
      </button>
    </div>
  );
}

export function LectureChaptersEditor({
  chapters,
  currentTimeSeconds,
  onChange
}: {
  chapters: readonly DraftVideoChapter[];
  /** Read at click time, not stored -- the live position of the preview player above. */
  currentTimeSeconds: () => number;
  onChange: (next: readonly DraftVideoChapter[]) => void;
}): JSX.Element {
  const t = useT();

  const updateAt = (key: string, next: DraftVideoChapter): void => {
    onChange(chapters.map((chapter) => (chapter.key === key ? next : chapter)));
  };

  const removeAt = (key: string): void => {
    onChange(chapters.filter((chapter) => chapter.key !== key));
  };

  const addChapter = (): void => {
    onChange([
      ...chapters,
      { key: crypto.randomUUID(), timeSeconds: Math.floor(currentTimeSeconds()), title: "" }
    ]);
  };

  return (
    <div className="space-y-3 border-t border-hairline pt-5">
      <div className="flex items-center justify-between gap-3">
        <div>
          <Label>{t("author.videoChaptersTitle")}</Label>
          <p className="mt-0.5 text-sm font-light text-muted">{t("author.videoChaptersHint")}</p>
        </div>
        <Button onClick={addChapter} size="sm" type="button" variant="outline">
          <Plus className="size-4" />
          {t("author.addVideoChapter")}
        </Button>
      </div>

      {chapters.length > 0 ? (
        <div className="space-y-2">
          {chapters.map((chapter) => (
            <ChapterRow
              chapter={chapter}
              key={chapter.key}
              onChange={(next) => updateAt(chapter.key, next)}
              onRemove={() => removeAt(chapter.key)}
            />
          ))}
        </div>
      ) : null}
    </div>
  );
}
