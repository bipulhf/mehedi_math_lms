import type { BannerPreset } from "@genex/shared";
import type { CSSProperties } from "react";
import type { MessageKey } from "@genex/i18n";

export interface BannerPresetStyle {
  labelKey: MessageKey;
  style: CSSProperties;
}

/**
 * A curated set of on-brand backgrounds, each already paired with a text
 * colour known to read on it — not a free colour picker. The two dark fills
 * take `paper`; the bright ones take `ink`, the same near-black the rest of
 * the page reads in.
 *
 * The enum names come from the shared schema and are deliberately left alone
 * so the column stays portable; the colours behind them are this brand's.
 * `CYAN` is the spectrum teal and `YELLOW` the spectrum amber — the labels in
 * `messages/*.ts` say so.
 */
export const bannerPresetStyles: Record<BannerPreset, BannerPresetStyle> = {
  CYAN: {
    labelKey: "admin.banner.presetCyan",
    style: { background: "var(--color-spectrum-teal)", color: "var(--color-paper)" }
  },
  INK: {
    labelKey: "admin.banner.presetInk",
    style: { background: "var(--color-ink)", color: "var(--color-paper)" }
  },
  ORANGE: {
    labelKey: "admin.banner.presetOrange",
    style: { background: "var(--color-accent)", color: "var(--color-ink)" }
  },
  SPECTRUM: {
    labelKey: "admin.banner.presetSpectrum",
    style: {
      background:
        "linear-gradient(90deg, var(--color-spectrum-ember), var(--color-spectrum-amber), var(--color-spectrum-teal))",
      color: "var(--color-ink)"
    }
  },
  YELLOW: {
    labelKey: "admin.banner.presetYellow",
    style: { background: "var(--color-spectrum-amber)", color: "var(--color-ink)" }
  }
};
