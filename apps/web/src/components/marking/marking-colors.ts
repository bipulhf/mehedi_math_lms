import type { MarkingColor, MarkingPenWidth } from "@mma/shared";

/**
 * The Marking palette, as CSS colours.
 *
 * These are the only colours a teacher can draw in, and they are deliberately
 * outside the design tokens: Marking sits on top of a photograph of paper, not
 * on the app's surfaces, so it needs to read against pencil and biro rather
 * than against `--paper`.
 */
export const markingColorHex: Record<MarkingColor, string> = {
  BLACK: "#1B1B1B",
  BLUE: "#1D4ED8",
  GREEN: "#15803D",
  RED: "#DC2626"
};

/** Stroke width as a fraction of the page's shorter edge, so it scales with zoom. */
export const markingPenWidthRatio: Record<MarkingPenWidth, number> = {
  MEDIUM: 0.004,
  THICK: 0.008,
  THIN: 0.002
};
