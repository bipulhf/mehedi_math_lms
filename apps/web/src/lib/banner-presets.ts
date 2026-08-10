import type { BannerPreset } from "@genex/shared";
import type { CSSProperties } from "react";
import type { MessageKey } from "@genex/i18n";

export interface BannerPresetStyle {
  labelKey: MessageKey;
  style: CSSProperties;
}

/**
 * A curated set of on-brand backgrounds, each already paired with a text
 * colour known to read on it — not a free colour picker. `action-foreground`
 * is the same near-black the accent buttons use on a bright fill; `ink` is
 * the page's own default text colour, white on the dark panel.
 */
export const bannerPresetStyles: Record<BannerPreset, BannerPresetStyle> = {
  CYAN: {
    labelKey: "admin.banner.presetCyan",
    style: { background: "var(--color-brand-cyan)", color: "var(--color-action-foreground)" }
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
        "linear-gradient(90deg, var(--color-brand-orange), var(--color-brand-yellow), var(--color-brand-cyan))",
      color: "var(--color-action-foreground)"
    }
  },
  YELLOW: {
    labelKey: "admin.banner.presetYellow",
    style: { background: "var(--color-brand-yellow)", color: "var(--color-action-foreground)" }
  }
};
