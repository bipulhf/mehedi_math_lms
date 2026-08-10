import type { MarkingColor } from "@genex/shared";

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
