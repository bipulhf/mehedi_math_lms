import type { ChangeEvent, DragEvent, JSX } from "react";
import { useRef, useState } from "react";
import { toast } from "sonner";

import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { uploadLectureVideo } from "@/lib/api/uploads";
import { useT } from "@/lib/i18n/locale-context";

type VideoInputMode = "VIDEO_LINK" | "VIDEO_UPLOAD";

interface VideoUploaderValue {
  mode: VideoInputMode;
  videoUrl: string;
}

interface VideoUploaderProps {
  disabled?: boolean | undefined;
  label: string;
  onValueChange: (value: VideoUploaderValue) => void;
  value: VideoUploaderValue;
}

function normalizeVideoUrl(input: string): string {
  const value = input.trim();

  if (!value) {
    return "";
  }

  const youtubeMatch =
    value.match(/^https?:\/\/(?:www\.)?youtube\.com\/watch\?v=([\w-]{11})/i) ??
    value.match(/^https?:\/\/(?:www\.)?youtube\.com\/embed\/([\w-]{11})/i) ??
    value.match(/^https?:\/\/youtu\.be\/([\w-]{11})/i);

  if (youtubeMatch?.[1]) {
    return `https://www.youtube.com/watch?v=${youtubeMatch[1]}`;
  }

  const vimeoMatch =
    value.match(/^https?:\/\/(?:www\.)?vimeo\.com\/(\d+)/i) ??
    value.match(/^https?:\/\/player\.vimeo\.com\/video\/(\d+)/i);

  if (vimeoMatch?.[1]) {
    return `https://vimeo.com/${vimeoMatch[1]}`;
  }

  return value;
}

export function VideoUploader({
  disabled = false,
  label,
  onValueChange,
  value
}: VideoUploaderProps): JSX.Element {
  const t = useT();

  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [progress, setProgress] = useState(0);

  const uploadVideoFile = async (file: File): Promise<void> => {
    if (!file.type.startsWith("video/")) {
      toast.error(t("upload.chooseVideo"));
      return;
    }

    setIsUploading(true);
    setProgress(0);

    try {
      const uploadedUrl = await uploadLectureVideo(file, setProgress);
      onValueChange({
        mode: "VIDEO_UPLOAD",
        videoUrl: uploadedUrl
      });
      toast.success(t("upload.videoDone"));
    } catch (uploadError) {
      toast.error(uploadError instanceof Error ? uploadError.message : "Video upload failed");
    } finally {
      setIsUploading(false);
      setProgress(0);
    }
  };

  const handleInputChange = async (event: ChangeEvent<HTMLInputElement>): Promise<void> => {
    const file = event.target.files?.[0];

    if (!file) {
      return;
    }

    await uploadVideoFile(file);
    event.target.value = "";
  };

  const handleDrop = async (event: DragEvent<HTMLButtonElement>): Promise<void> => {
    event.preventDefault();
    setIsDragging(false);

    const file = event.dataTransfer.files?.[0];

    if (!file) {
      return;
    }

    await uploadVideoFile(file);
  };

  return (
    <div className="space-y-3">
      <div className="space-y-2">
        <Label>{label}</Label>
        <div className="inline-flex rounded-full border border-hairline bg-panel-warm p-1">
          <button
            className={`rounded-full px-4 py-2 text-sm transition-colors ${
              value.mode === "VIDEO_LINK"
                ? "bg-accent text-ink"
                : "text-ink/62 hover:text-ink"
            }`}
            disabled={disabled || isUploading}
            type="button"
            onClick={() =>
              onValueChange({
                mode: "VIDEO_LINK",
                videoUrl: value.mode === "VIDEO_UPLOAD" ? "" : value.videoUrl
              })
            }
          >{t("upload.linkLabel")}</button>
          <button
            className={`rounded-full px-4 py-2 text-sm transition-colors ${
              value.mode === "VIDEO_UPLOAD"
                ? "bg-accent text-ink"
                : "text-ink/62 hover:text-ink"
            }`}
            disabled={disabled || isUploading}
            type="button"
            onClick={() =>
              onValueChange({
                mode: "VIDEO_UPLOAD",
                videoUrl: value.mode === "VIDEO_LINK" ? "" : value.videoUrl
              })
            }
          >{t("upload.direct")}</button>
        </div>
      </div>
      {value.mode === "VIDEO_LINK" ? (
        <div className="space-y-2">
          <Input
            placeholder="https://youtube.com/watch?v=... or https://vimeo.com/..."
            value={value.videoUrl}
            onBlur={(event) =>
              onValueChange({
                mode: "VIDEO_LINK",
                videoUrl: normalizeVideoUrl(event.target.value)
              })
            }
            onChange={(event) =>
              onValueChange({
                mode: "VIDEO_LINK",
                videoUrl: event.target.value
              })
            }
          />
          <p className="text-sm leading-6 text-ink/62">{t("upload.linkHint")}</p>
        </div>
      ) : (
        <div className="space-y-3">
          <input
            ref={fileInputRef}
            accept="video/*"
            className="hidden"
            disabled={disabled || isUploading}
            type="file"
            onChange={(event) => void handleInputChange(event)}
          />
          <button
            className={`w-full rounded-[calc(var(--radius)-0.125rem)] border border-dashed px-4 py-5 text-left transition-colors ${
              isDragging
                ? "border-accent bg-accent/10"
                : "border-hairline bg-panel-warm hover:bg-panel-warm"
            } ${disabled || isUploading ? "cursor-not-allowed opacity-70" : "cursor-pointer"}`}
            disabled={disabled || isUploading}
            type="button"
            onClick={() => fileInputRef.current?.click()}
            onDragEnter={(event) => {
              event.preventDefault();
              setIsDragging(true);
            }}
            onDragLeave={(event) => {
              event.preventDefault();
              setIsDragging(false);
            }}
            onDragOver={(event) => {
              event.preventDefault();
              setIsDragging(true);
            }}
            onDrop={(event) => void handleDrop(event)}
          >
            <div className="flex flex-wrap items-center gap-3">
              <span className="inline-flex min-h-10 items-center rounded-(--radius) border border-hairline px-4 text-sm font-medium text-ink">
                {isUploading ? "Uploading..." : "Choose video"}
              </span>
              <p className="text-sm leading-6 text-ink/70">{t("upload.dragVideo")}</p>
            </div>
            {isUploading ? (
              <div className="mt-4 space-y-2">
                <div className="h-2 overflow-hidden rounded-full bg-chip-active">
                  <div
                    className="h-full rounded-full bg-accent transition-[width] ease-out"
                    style={{ width: `${progress}%` }}
                  />
                </div>
                <p className="text-xs uppercase tracking-[0.18em] text-ink/62">{progress}% uploaded</p>
              </div>
            ) : null}
          </button>
          {value.videoUrl ? (
            <div className="space-y-2">
              <Input
                value={value.videoUrl}
                onChange={(event) =>
                  onValueChange({
                    mode: "VIDEO_UPLOAD",
                    videoUrl: event.target.value
                  })
                }
              />
              <p className="text-sm leading-6 text-ink/62">{t("upload.uploadedHint")}</p>
            </div>
          ) : null}
        </div>
      )}
    </div>
  );
}
