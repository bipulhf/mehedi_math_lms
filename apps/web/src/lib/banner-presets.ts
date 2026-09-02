import type { BannerPreset } from "@mma/shared";
import type { CSSProperties } from "react";
import type { MessageKey } from "@mma/i18n";

export interface BannerPresetStyle {
  labelKey: MessageKey;
  style: CSSProperties;
}

/**
 * A curated set of on-brand backgrounds, each already paired with a text
 * colour known to read on it — not a free colour picker. `on-accent` is
 * whatever reads on the blue in the current theme; `action-foreground` is the
 * dark navy that reads on a bright constant fill; `ink` is the page's own
 * text colour, which follows the panel it sits on.
 *
 * The keys are the stored `BannerPreset` values, so `CYAN` still names the
 * brand's primary — which is now blue.
 */
export const bannerPresetStyles: Record<BannerPreset, BannerPresetStyle> = {
  CYAN: {
    labelKey: "admin.banner.presetCyan",
    style: { background: "var(--color-accent)", color: "var(--color-on-accent)" }
  },
  INK: {
    labelKey: "admin.banner.presetInk",
    style: { background: "var(--color-panel-warm)", color: "var(--color-ink)" }
  },
  ORANGE: {
    labelKey: "admin.banner.presetOrange",
    style: { background: "var(--color-brand-orange)", color: "var(--color-action-foreground)" }
  },
  SPECTRUM: {
    labelKey: "admin.banner.presetSpectrum",
    style: {
      background:
        "linear-gradient(90deg, var(--color-brand-orange), var(--color-brand-orange-strong), var(--color-brand-blue))",
      color: "var(--color-action-foreground)"
    }
  },
  YELLOW: {
    labelKey: "admin.banner.presetYellow",
    style: { background: "var(--color-brand-orange-strong)", color: "var(--color-action-foreground)" }
  }
};
