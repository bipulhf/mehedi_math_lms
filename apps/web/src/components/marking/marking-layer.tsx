import {
  emptyMarkingDocument,
  type MarkingColor,
  type MarkingDocument,
  type MarkingElement,
  markingDocumentVersion,
  type MarkingPenWidth,
  type MarkingStamp
} from "@genex/shared";
import type { JSX, PointerEvent as ReactPointerEvent } from "react";
import { useRef, useState } from "react";

import { markingColorHex, markingPenWidthRatio } from "@/components/marking/marking-colors";

export type MarkingTool = "PEN" | "ERASER" | "NOTE" | MarkingStamp;

interface MarkingLayerProps {
  color: MarkingColor;
  marking: MarkingDocument;
  /** Absent means the page is only being read — a student's view of their result. */
  onChange?: ((next: MarkingDocument) => void) | undefined;
  pageHeight: number;
  pageUrl: string;
  pageWidth: number;
  penWidth: MarkingPenWidth;
  tool: MarkingTool;
}

/** Stamp glyphs are drawn rather than typed: a tick has to look the same everywhere. */
const stampGlyph: Record<MarkingStamp, string> = {
  CROSS: "✗",
  HALF: "½",
  TICK: "✓"
};

function nextElementId(prefix: string): string {
  return `${prefix}-${Math.random().toString(36).slice(2, 10)}`;
}

/**
 * A Script Page with the teacher's Marking drawn over it.
 *
 * The overlay is an SVG in the page's own aspect ratio, with every coordinate
 * normalised 0-1 — the same document renders on a thumbnail, on this canvas,
 * and on a phone (ADR-0010). Nothing is ever burned into the photograph.
 */
export function MarkingLayer({
  color,
  marking,
  onChange,
  pageHeight,
  pageUrl,
  pageWidth,
  penWidth,
  tool
}: MarkingLayerProps): JSX.Element {
  const surfaceRef = useRef<HTMLDivElement | null>(null);
  const [draftPoints, setDraftPoints] = useState<{ x: number; y: number }[]>([]);
  const [pendingNote, setPendingNote] = useState<{ text: string; x: number; y: number } | null>(
    null
  );
  const isEditable = onChange !== undefined;
  const aspect = pageWidth > 0 && pageHeight > 0 ? pageHeight / pageWidth : 1.4142;
  const viewWidth = 100;
  const viewHeight = 100 * aspect;
  const strokeWidth = markingPenWidthRatio[penWidth] * Math.min(viewWidth, viewHeight) * 10;

  const toNormalised = (event: ReactPointerEvent<HTMLDivElement>): { x: number; y: number } => {
    const bounds = surfaceRef.current?.getBoundingClientRect();

    if (!bounds || bounds.width === 0 || bounds.height === 0) {
      return { x: 0, y: 0 };
    }

    return {
      x: Math.min(1, Math.max(0, (event.clientX - bounds.left) / bounds.width)),
      y: Math.min(1, Math.max(0, (event.clientY - bounds.top) / bounds.height))
    };
  };

  const commit = (elements: readonly MarkingElement[]): void => {
    onChange?.({ elements: [...elements], version: markingDocumentVersion });
  };

  const removeElement = (elementId: string): void => {
    commit(marking.elements.filter((element) => element.id !== elementId));
  };

  const handlePointerDown = (event: ReactPointerEvent<HTMLDivElement>): void => {
    if (!isEditable || pendingNote) {
      return;
    }

    const point = toNormalised(event);

    if (tool === "PEN") {
      event.currentTarget.setPointerCapture(event.pointerId);
      setDraftPoints([point]);
      return;
    }

    if (tool === "NOTE") {
      setPendingNote({ text: "", ...point });
      return;
    }

    if (tool === "ERASER") {
      return;
    }

    commit([
      ...marking.elements,
      {
        color,
        id: nextElementId("stamp"),
        kind: "STAMP",
        size: 0.06,
        stamp: tool,
        x: point.x,
        y: point.y
      }
    ]);
  };

  const handlePointerMove = (event: ReactPointerEvent<HTMLDivElement>): void => {
    if (!isEditable || tool !== "PEN" || draftPoints.length === 0) {
      return;
    }

    setDraftPoints((points) => [...points, toNormalised(event)]);
  };

  const handlePointerUp = (): void => {
    if (draftPoints.length === 0) {
      return;
    }

    // A tap with the pen is not a stroke — it would store a dot nobody drew.
    if (draftPoints.length > 1) {
      commit([
        ...marking.elements,
        {
          color,
          id: nextElementId("stroke"),
          kind: "STROKE",
          points: draftPoints.slice(0, 2000),
          width: penWidth
        }
      ]);
    }

    setDraftPoints([]);
  };

  const renderElement = (element: MarkingElement): JSX.Element | null => {
    const eraserProps =
      isEditable && tool === "ERASER"
        ? {
            className: "cursor-pointer",
            onPointerDown: (event: ReactPointerEvent<SVGElement>) => {
              event.stopPropagation();
              removeElement(element.id);
            },
            style: { pointerEvents: "auto" as const }
          }
        : { style: { pointerEvents: "none" as const } };

    if (element.kind === "STROKE") {
      return (
        <polyline
          key={element.id}
          fill="none"
          points={element.points
            .map((point) => `${point.x * viewWidth},${point.y * viewHeight}`)
            .join(" ")}
          stroke={markingColorHex[element.color]}
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={markingPenWidthRatio[element.width] * Math.min(viewWidth, viewHeight) * 10}
          {...eraserProps}
        />
      );
    }

    if (element.kind === "STAMP") {
      return (
        <text
          key={element.id}
          dominantBaseline="middle"
          fill={markingColorHex[element.color]}
          fontSize={element.size * viewHeight}
          textAnchor="middle"
          x={element.x * viewWidth}
          y={element.y * viewHeight}
          {...eraserProps}
        >
          {stampGlyph[element.stamp]}
        </text>
      );
    }

    return (
      <text
        key={element.id}
        dominantBaseline="hanging"
        fill={markingColorHex[element.color]}
        fontSize={element.fontSize * viewHeight}
        x={element.x * viewWidth}
        y={element.y * viewHeight}
        {...eraserProps}
      >
        {element.text}
      </text>
    );
  };

  return (
    <div
      ref={surfaceRef}
      className={`relative w-full select-none ${isEditable ? "touch-none" : ""}`}
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerUp}
    >
      <img alt="" className="block w-full rounded-[var(--radius)]" draggable={false} src={pageUrl} />
      <svg
        className="absolute inset-0 h-full w-full"
        preserveAspectRatio="none"
        viewBox={`0 0 ${viewWidth} ${viewHeight}`}
        style={{ pointerEvents: "none" }}
      >
        {(marking.elements.length > 0 ? marking : emptyMarkingDocument).elements.map(renderElement)}
        {draftPoints.length > 1 ? (
          <polyline
            fill="none"
            points={draftPoints
              .map((point) => `${point.x * viewWidth},${point.y * viewHeight}`)
              .join(" ")}
            stroke={markingColorHex[color]}
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={strokeWidth}
          />
        ) : null}
      </svg>
      {pendingNote ? (
        <form
          className="absolute z-10 flex gap-1"
          style={{ left: `${pendingNote.x * 100}%`, top: `${pendingNote.y * 100}%` }}
          onSubmit={(event) => {
            event.preventDefault();

            if (pendingNote.text.trim().length > 0) {
              commit([
                ...marking.elements,
                {
                  color,
                  fontSize: 0.025,
                  id: nextElementId("note"),
                  kind: "NOTE",
                  text: pendingNote.text.trim().slice(0, 500),
                  x: pendingNote.x,
                  y: pendingNote.y
                }
              ]);
            }

            setPendingNote(null);
          }}
        >
          <input
            autoFocus
            className="h-8 rounded-[var(--radius)] border border-line-strong bg-paper px-2 text-xs text-ink"
            placeholder="Note"
            value={pendingNote.text}
            onChange={(event) =>
              setPendingNote((note) => (note ? { ...note, text: event.target.value } : note))
            }
            onKeyDown={(event) => {
              if (event.key === "Escape") {
                setPendingNote(null);
              }
            }}
          />
        </form>
      ) : null}
    </div>
  );
}
