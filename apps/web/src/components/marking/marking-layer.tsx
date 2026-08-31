import {
  emptyMarkingDocument,
  resolveStrokeWidthRatio,
  type MarkingColor,
  type MarkingDocument,
  type MarkingElement,
  markingDocumentVersion,
  type MarkingStamp,
  type MarkingStrokeWidth
} from "@mma/shared";
import type { JSX, PointerEvent as ReactPointerEvent } from "react";
import { useRef, useState } from "react";

import { markingColorHex } from "@/components/marking/marking-colors";

export type MarkingTool = "PEN" | "ERASER" | "NOTE" | MarkingStamp;

interface MarkingLayerProps {
  color: MarkingColor;
  marking: MarkingDocument;
  /** Absent means the page is only being read — a student's view of their result. */
  onChange?: ((next: MarkingDocument) => void) | undefined;
  pageHeight: number;
  pageUrl: string;
  pageWidth: number;
  penWidth: MarkingStrokeWidth;
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
  const hasCommittedNoteRef = useRef(false);
  const isEditable = onChange !== undefined;
  const isErasing = isEditable && tool === "ERASER";
  const aspect = pageWidth > 0 && pageHeight > 0 ? pageHeight / pageWidth : 1.4142;
  const viewWidth = 100;
  const viewHeight = 100 * aspect;

  /**
   * A stroke's width is a fraction of the page's shorter edge, which is what
   * `markingStrokeWidthMin`/`Max` have always described. It used to be scaled
   * ten times past that here, so even the thinnest setting drew a band about a
   * centimetre wide on a real script and the notes were narrower than the pen
   * that wrote them.
   */
  const strokeWidthFor = (width: MarkingStrokeWidth): number =>
    resolveStrokeWidthRatio(width) * Math.min(viewWidth, viewHeight);

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

  /**
   * Enter used to be the only way to keep a note, so a teacher who typed one
   * and clicked on to the next page lost it without being told — the mark was
   * never written and the student saw an unannotated page. Blur commits too,
   * and the ref stops Enter (which blurs straight after submitting) from
   * writing the same note twice.
   */
  const commitNote = (): void => {
    if (!pendingNote || hasCommittedNoteRef.current) {
      return;
    }

    hasCommittedNoteRef.current = true;

    const text = pendingNote.text.trim();

    if (text.length > 0) {
      commit([
        ...marking.elements,
        {
          color,
          fontSize: 0.025,
          id: nextElementId("note"),
          kind: "NOTE",
          text: text.slice(0, 500),
          x: pendingNote.x,
          y: pendingNote.y
        }
      ]);
    }

    setPendingNote(null);
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
      hasCommittedNoteRef.current = false;
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
    const eraserProps = isErasing
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
          strokeWidth={strokeWidthFor(element.width)}
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

    // A NOTE is typed text, and the SVG is stretched to the page box with
    // `preserveAspectRatio="none"` — inside it a note is squashed with the
    // page and drawn at the browser's smallest hinted size. It is laid over
    // the page as ordinary text instead, below.
    return null;
  };

  const notes = marking.elements.filter((element) => element.kind === "NOTE");

  return (
    <div
      ref={surfaceRef}
      className={`relative w-full select-none ${isEditable ? "touch-none" : ""}`}
      // Notes are sized in `cqw`, so the page box has to be their container.
      style={{ containerType: "inline-size" }}
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerUp}
    >
      {/* A bare `<img>`, deliberately: a Script Page has no variants to choose
          between — it is stored sized-down and nothing else exists (ADR-0009) —
          and the overlay is positioned against this exact box. */}
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
            strokeWidth={strokeWidthFor(penWidth)}
          />
        ) : null}
      </svg>
      {notes.map((note) => (
        <span
          key={note.id}
          className={`absolute max-w-[70%] whitespace-pre-wrap font-medium leading-tight ${
            isErasing ? "cursor-pointer" : ""
          }`}
          style={{
            color: markingColorHex[note.color],
            // `fontSize` is a fraction of the page's height, and `cqw` is a
            // hundredth of its width, so the aspect converts between them. The
            // floor keeps a note readable on a thumbnail, where the page it
            // scales with is a couple of hundred pixels wide.
            fontSize: `max(0.8rem, ${(note.fontSize * aspect * 100).toFixed(3)}cqw)`,
            left: `${note.x * 100}%`,
            pointerEvents: isErasing ? "auto" : "none",
            top: `${note.y * 100}%`
          }}
          onPointerDown={
            isErasing
              ? (event) => {
                  event.stopPropagation();
                  removeElement(note.id);
                }
              : undefined
          }
        >
          {note.text}
        </span>
      ))}
      {pendingNote ? (
        <form
          className="absolute z-10 flex gap-1"
          style={{ left: `${pendingNote.x * 100}%`, top: `${pendingNote.y * 100}%` }}
          onSubmit={(event) => {
            event.preventDefault();
            commitNote();
          }}
        >
          <input
            autoFocus
            className="h-8 rounded-[var(--radius)] border border-line-strong bg-paper px-2 text-xs text-ink"
            placeholder="Text"
            value={pendingNote.text}
            onBlur={commitNote}
            onChange={(event) =>
              setPendingNote((note) => (note ? { ...note, text: event.target.value } : note))
            }
            onKeyDown={(event) => {
              if (event.key === "Escape") {
                hasCommittedNoteRef.current = true;
                setPendingNote(null);
              }
            }}
          />
        </form>
      ) : null}
    </div>
  );
}
