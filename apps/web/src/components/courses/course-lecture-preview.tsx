import { FileText, Video } from "lucide-react";
import type { JSX } from "react";
import { useEffect, useState } from "react";

import { useT } from "@/lib/i18n/locale-context";

interface PdfLecturePreviewProps {
  existingUrl: string;
  file: File | null;
}

interface VideoLecturePreviewProps {
  url: string;
}

function getEmbedVideoUrl(value: string): string | null {
  try {
    const url = new URL(value);
    const hostname = url.hostname.replace(/^www\./, "");

    if (hostname === "youtube.com" || hostname === "m.youtube.com") {
      const videoId = url.searchParams.get("v");

      return videoId ? `https://www.youtube.com/embed/${videoId}` : null;
    }

    if (hostname === "youtu.be") {
      const videoId = url.pathname.split("/").filter(Boolean)[0];

      return videoId ? `https://www.youtube.com/embed/${videoId}` : null;
    }

    if (hostname === "vimeo.com") {
      const videoId = url.pathname.split("/").filter(Boolean)[0];

      return videoId ? `https://player.vimeo.com/video/${videoId}` : null;
    }

    if (hostname === "player.vimeo.com") {
      return value;
    }

    return null;
  } catch {
    return null;
  }
}

export function VideoLecturePreview({ url }: VideoLecturePreviewProps): JSX.Element | null {
  const t = useT();
  const trimmedUrl = url.trim();
  const embedUrl = getEmbedVideoUrl(trimmedUrl);

  if (!trimmedUrl) {
    return null;
  }

  return (
    <div className="space-y-3 border-t border-hairline pt-5">
      <div className="flex items-center gap-2 text-sm font-medium text-ink">
        <Video className="size-4" />
        {t("author.previewTitle")}
      </div>
      <div className="aspect-video w-full overflow-hidden border border-hairline bg-ink">
        {embedUrl ? (
          <iframe
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
            allowFullScreen
            className="h-full w-full"
            referrerPolicy="strict-origin-when-cross-origin"
            src={embedUrl}
            title={t("author.video")}
          />
        ) : (
          <video className="h-full w-full" controls preload="metadata" src={trimmedUrl}>
            <track kind="captions" />
          </video>
        )}
      </div>
    </div>
  );
}

export function PdfLecturePreview({
  existingUrl,
  file
}: PdfLecturePreviewProps): JSX.Element | null {
  const t = useT();
  const [objectUrl, setObjectUrl] = useState<string | null>(null);

  useEffect(() => {
    if (!file) {
      setObjectUrl(null);
      return;
    }

    const nextUrl = URL.createObjectURL(file);
    setObjectUrl(nextUrl);

    return () => URL.revokeObjectURL(nextUrl);
  }, [file]);

  const previewUrl = objectUrl ?? existingUrl;

  if (!previewUrl) {
    return null;
  }

  return (
    <div className="space-y-3 border-t border-hairline pt-5">
      <div className="flex items-center gap-2 text-sm font-medium text-ink">
        <FileText className="size-4" />
        {t("author.previewTitle")}
      </div>
      <iframe
        className="h-[28rem] w-full border border-hairline bg-panel-warm sm:h-[36rem]"
        src={previewUrl}
        title={file?.name ?? t("author.pdf")}
      />
    </div>
  );
}
