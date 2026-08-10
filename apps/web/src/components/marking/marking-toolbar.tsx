import {
  markingStrokeWidthMax,
  markingStrokeWidthMin,
  resolveStrokeWidthRatio,
  type MarkingColor,
  type MarkingStrokeWidth
} from "@mma/shared";
import type { JSX } from "react";

import type { MarkingTool } from "@/components/marking/marking-layer";
import { markingColorHex } from "@/components/marking/marking-colors";
import { Button } from "@/components/ui/button";
import { useT } from "@/lib/i18n/locale-context";

interface MarkingToolbarProps {
  canUndo: boolean;
  color: MarkingColor;
  onColorChange: (color: MarkingColor) => void;
  onPenWidthChange: (width: number) => void;
  onToolChange: (tool: MarkingTool) => void;
  onUndo: () => void;
  penWidth: MarkingStrokeWidth;
  tool: MarkingTool;
}

const stampTools: readonly { label: string; value: MarkingTool }[] = [
  { label: "✓", value: "TICK" },
  { label: "✗", value: "CROSS" },
  { label: "½", value: "HALF" }
];

const colors: readonly MarkingColor[] = ["RED", "GREEN", "BLUE", "BLACK"];

/** The thumb dot scales between these two pixel sizes across the slider's range. */
const thumbPreviewMinPx = 4;
const thumbPreviewMaxPx = 18;

/** The whole marking kit: what to draw with, in what colour, and how to take it back. */
export function MarkingToolbar({
  canUndo,
  color,
  onColorChange,
  onPenWidthChange,
  onToolChange,
  onUndo,
  penWidth,
  tool
}: MarkingToolbarProps): JSX.Element {
  const t = useT();
  const tools: readonly { label: string; value: MarkingTool }[] = [
    { label: t("marking.pen"), value: "PEN" },
    ...stampTools,
    { label: t("marking.text"), value: "NOTE" },
    { label: t("marking.erase"), value: "ERASER" }
  ];
  const widthRatio = resolveStrokeWidthRatio(penWidth);
  const widthFraction =
    (widthRatio - markingStrokeWidthMin) / (markingStrokeWidthMax - markingStrokeWidthMin);
  const thumbPreviewPx = thumbPreviewMinPx + widthFraction * (thumbPreviewMaxPx - thumbPreviewMinPx);

  return (
    <div className="flex flex-wrap items-center gap-2 rounded-[var(--radius)] border border-hairline bg-panel-warm p-2">
      <div className="flex flex-wrap items-center gap-1">
        {tools.map((item) => (
          <Button
            key={item.value}
            size="sm"
            type="button"
            variant={tool === item.value ? "ink" : "outline"}
            onClick={() => onToolChange(item.value)}
          >
            {item.label}
          </Button>
        ))}
      </div>
      <span aria-hidden="true" className="h-6 w-px bg-hairline" />
      <div className="flex items-center gap-1">
        {colors.map((item) => (
          <button
            key={item}
            aria-label={item.toLowerCase()}
            aria-pressed={color === item}
            className={`size-7 rounded-[var(--radius)] border ${
              color === item ? "border-ink" : "border-hairline"
            }`}
            style={{ backgroundColor: markingColorHex[item] }}
            type="button"
            onClick={() => onColorChange(item)}
          />
        ))}
      </div>
      <span aria-hidden="true" className="h-6 w-px bg-hairline" />
      <div className="flex items-center gap-2">
        <span
          aria-hidden="true"
          className="shrink-0 rounded-full bg-ink"
          style={{ height: thumbPreviewPx, width: thumbPreviewPx }}
        />
        <input
          aria-label={t("marking.penWidth")}
          className="w-20 accent-(--secondary-container)"
          max={markingStrokeWidthMax}
          min={markingStrokeWidthMin}
          step={0.0005}
          type="range"
          value={widthRatio}
          onChange={(event) => onPenWidthChange(Number(event.target.value))}
        />
      </div>
      <Button
        className="ml-auto"
        disabled={!canUndo}
        size="sm"
        type="button"
        variant="outline"
        onClick={onUndo}
      >
        {t("marking.undo")}
      </Button>
    </div>
  );
}
