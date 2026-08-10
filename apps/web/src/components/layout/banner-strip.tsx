import { useQuery } from "@tanstack/react-query";
import { X } from "lucide-react";
import type { JSX } from "react";
import { useState } from "react";

import { getActiveBanner } from "@/lib/api/banners";
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
    <div className="flex items-center justify-center gap-3 bg-accent px-4 py-2.5 text-center text-sm text-ink">
      <p className="min-w-0">
        {banner.message}
        {banner.linkUrl ? (
          <a className="ml-2 font-medium underline underline-offset-2" href={banner.linkUrl}>
            {banner.linkLabel || banner.linkUrl}
          </a>
        ) : null}
      </p>
      <button
        aria-label={t("common.close")}
        className="shrink-0 text-ink/70 transition-colors hover:text-ink"
        onClick={() => setDismissedId(banner.id)}
        type="button"
      >
        <X className="size-4" />
      </button>
    </div>
  );
}
