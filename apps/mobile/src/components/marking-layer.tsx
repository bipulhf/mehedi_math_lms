import {
  type MarkingColor,
  type MarkingDocument,
  type MarkingElement,
  markingDocumentVersion,
  type MarkingPenWidth,
  type MarkingStamp
} from "@genex/shared";
import type { JSX } from "react";
import { useMemo, useRef, useState } from "react";
import { PanResponder, StyleSheet, View } from "react-native";
import { Image } from "expo-image";
import Svg, { Polyline, Text as SvgText } from "react-native-svg";

export type MarkingTool = "PEN" | "ERASER" | "NOTE" | MarkingStamp;

interface MarkingLayerProps {
  color: MarkingColor;
  marking: MarkingDocument;
  /** Absent means the page is only being read — a student's view of their result. */
  onChange?: ((next: MarkingDocument) => void) | undefined;
  onNoteRequested?: ((point: { x: number; y: number }) => void) | undefined;
  pageHeight: number;
  pageUrl: string;
  pageWidth: number;
  penWidth: MarkingPenWidth;
  tool: MarkingTool;
  width: number;
}

const colorHex: Record<MarkingColor, string> = {
  BLACK: "#1B1B1B",
  BLUE: "#1D4ED8",
  GREEN: "#15803D",
  RED: "#DC2626"
};

const penWidthRatio: Record<MarkingPenWidth, number> = {
  MEDIUM: 0.004,
  THICK: 0.008,
  THIN: 0.002
};

const stampGlyph: Record<MarkingStamp, string> = {
  CROSS: "✗",
  HALF: "½",
  TICK: "✓"
};

function nextElementId(prefix: string): string {
  return `${prefix}-${Math.random().toString(36).slice(2, 10)}`;
}

/**
 * A Script Page with the teacher's Marking over it.
 *
 * The same normalised document the web draws (ADR-0010), rendered here with
 * react-native-svg and drawn with a pan responder. Coordinates are 0-1, so the
 * page can be laid out at any width the screen allows.
 */
export function MarkingLayer({
  color,
  marking,
  onChange,
  onNoteRequested,
  pageHeight,
  pageUrl,
  pageWidth,
  penWidth,
  tool,
  width
}: MarkingLayerProps): JSX.Element {
  const aspect = pageWidth > 0 && pageHeight > 0 ? pageHeight / pageWidth : 1.4142;
  const height = width * aspect;
  const [draftPoints, setDraftPoints] = useState<{ x: number; y: number }[]>([]);
  const draftRef = useRef<{ x: number; y: number }[]>([]);
  const isEditable = onChange !== undefined;

  const commit = (elements: readonly MarkingElement[]): void => {
    onChange?.({ elements: [...elements], version: markingDocumentVersion });
  };

  const toNormalised = (x: number, y: number): { x: number; y: number } => ({
    x: Math.min(1, Math.max(0, x / width)),
    y: Math.min(1, Math.max(0, y / height))
  });

  const panResponder = useMemo(
    () =>
      PanResponder.create({
        onMoveShouldSetPanResponder: () => isEditable && tool === "PEN",
        onPanResponderGrant: (event) => {
          const point = toNormalised(event.nativeEvent.locationX, event.nativeEvent.locationY);

          if (tool === "PEN") {
            draftRef.current = [point];
            setDraftPoints(draftRef.current);
            return;
          }

          if (tool === "NOTE") {
            onNoteRequested?.(point);
            return;
          }

          if (tool === "ERASER") {
            // Nearest element wins: on a phone there is no hover, and hitting a
            // one-pixel stroke with a fingertip is not a usable target.
            const nearest = [...marking.elements]
              .reverse()
              .find((element) =>
                element.kind === "STROKE"
                  ? element.points.some(
                      (candidate) => Math.hypot(candidate.x - point.x, candidate.y - point.y) < 0.05
                    )
                  : Math.hypot(element.x - point.x, element.y - point.y) < 0.06
              );

            if (nearest) {
              commit(marking.elements.filter((element) => element.id !== nearest.id));
            }

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
        },
        onPanResponderMove: (event) => {
          if (tool !== "PEN") {
            return;
          }

          draftRef.current = [
            ...draftRef.current,
            toNormalised(event.nativeEvent.locationX, event.nativeEvent.locationY)
          ];
          setDraftPoints(draftRef.current);
        },
        onPanResponderRelease: () => {
          if (tool !== "PEN" || draftRef.current.length < 2) {
            draftRef.current = [];
            setDraftPoints([]);
            return;
          }

          commit([
            ...marking.elements,
            {
              color,
              id: nextElementId("stroke"),
              kind: "STROKE",
              points: draftRef.current.slice(0, 2000),
              width: penWidth
            }
          ]);
          draftRef.current = [];
          setDraftPoints([]);
        },
        onStartShouldSetPanResponder: () => isEditable
      }),
    [color, height, isEditable, marking.elements, onNoteRequested, penWidth, tool, width]
  );

  const renderElement = (element: MarkingElement): JSX.Element => {
    if (element.kind === "STROKE") {
      return (
        <Polyline
          fill="none"
          key={element.id}
          points={element.points.map((point) => `${point.x * width},${point.y * height}`).join(" ")}
          stroke={colorHex[element.color]}
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={penWidthRatio[element.width] * Math.min(width, height) * 10}
        />
      );
    }

    return (
      <SvgText
        fill={colorHex[element.color]}
        fontSize={(element.kind === "STAMP" ? element.size : element.fontSize) * height}
        key={element.id}
        textAnchor={element.kind === "STAMP" ? "middle" : "start"}
        x={element.x * width}
        y={element.y * height}
      >
        {element.kind === "STAMP" ? stampGlyph[element.stamp] : element.text}
      </SvgText>
    );
  };

  return (
    <View style={{ height, width }} {...panResponder.panHandlers}>
      <Image contentFit="contain" source={{ uri: pageUrl }} style={StyleSheet.absoluteFill} />
      <Svg height={height} style={StyleSheet.absoluteFill} width={width}>
        {marking.elements.map(renderElement)}
        {draftPoints.length > 1 ? (
          <Polyline
            fill="none"
            points={draftPoints.map((point) => `${point.x * width},${point.y * height}`).join(" ")}
            stroke={colorHex[color]}
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={penWidthRatio[penWidth] * Math.min(width, height) * 10}
          />
        ) : null}
      </Svg>
    </View>
  );
}
