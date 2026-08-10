import { useQuery } from "@tanstack/react-query";
import { X } from "lucide-react";
import type { JSX } from "react";
import { useState } from "react";

import { RichTextContent } from "@/components/ui/rich-text-content";
import { getActiveBanner } from "@/lib/api/banners";
import { bannerPresetStyles } from "@/lib/banner-presets";
import { useT } from "@/lib/i18n/locale-context";
import { queryKeys } from "@/lib/query/keys";

/** The site-wide promo/discount strip an admin manages. Nothing renders until an active banner loads. */
export function BannerStrip(): JSX.Element | null {
  const t = useT();
  const [dismissedId, setDismissedId] = useState<string | null>(null);

  const { data: banner } = useQuery({
    queryFn: getActiveBanner,
    queryKey: queryKeys.banners.active()
  });

  if (!banner || banner.id === dismissedId) {
    return null;
  }

  return (
    <div
      className="flex min-h-16 items-center justify-center gap-4 px-4 py-4 text-center text-base"
      style={bannerPresetStyles[banner.backgroundPreset].style}
    >
      <RichTextContent className="min-w-0 text-inherit [&_p]:m-0" html={banner.message} />
      {banner.linkUrl ? (
        <a className="shrink-0 font-medium underline underline-offset-2" href={banner.linkUrl}>
          {banner.linkLabel || banner.linkUrl}
        </a>
      ) : null}
      <button
        aria-label={t("common.close")}
        className="shrink-0 opacity-70 transition-opacity hover:opacity-100"
        onClick={() => setDismissedId(banner.id)}
        type="button"
      >
        <X className="size-4" />
      </button>
    </div>
  );
}
