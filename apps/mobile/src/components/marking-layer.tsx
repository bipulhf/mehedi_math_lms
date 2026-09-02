import {
  resolveStrokeWidthRatio,
  type MarkingColor,
  type MarkingDocument,
  type MarkingElement,
  markingDocumentVersion,
  type MarkingStamp,
  type MarkingStrokeWidth
} from "@mma/shared";
import type { JSX } from "react";
import { useMemo, useRef, useState } from "react";
import { PanResponder, StyleSheet, TextInput, View } from "react-native";
import { Image } from "expo-image";
import Svg, { Polyline, Text as SvgText } from "react-native-svg";

import { colors, radius, spacing } from "@/src/theme/tokens";

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
  /** Only shown while placing text, which only an editable layer can do. */
  textPlaceholder?: string | undefined;
  tool: MarkingTool;
  width: number;
}

const colorHex: Record<MarkingColor, string> = {
  BLACK: "#1B1B1B",
  BLUE: "#1D4ED8",
  GREEN: "#15803D",
  RED: "#DC2626"
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
  pageHeight,
  pageUrl,
  pageWidth,
  penWidth,
  textPlaceholder = "",
  tool,
  width
}: MarkingLayerProps): JSX.Element {
  const aspect = pageWidth > 0 && pageHeight > 0 ? pageHeight / pageWidth : 1.4142;
  const height = width * aspect;
  const [draftPoints, setDraftPoints] = useState<{ x: number; y: number }[]>([]);
  const draftRef = useRef<{ x: number; y: number }[]>([]);
  const [pendingText, setPendingText] = useState<{ x: number; y: number } | null>(null);
  const [textDraft, setTextDraft] = useState("");
  // Submitting (return key) fires both onSubmitEditing and, right after,
  // onBlur — both against the same pre-clear render, so without this a
  // single Enter press would commit the text twice.
  const hasCommittedTextRef = useRef(false);
  const isEditable = onChange !== undefined;

  /**
   * A stroke's width is a fraction of the page's shorter edge, which is what
   * `markingStrokeWidthMin`/`Max` have always described. It used to be scaled
   * ten times past that here, so even the thinnest setting drew a band about a
   * centimetre wide on a real script.
   */
  const strokeWidthFor = (value: MarkingStrokeWidth): number =>
    resolveStrokeWidthRatio(value) * Math.min(width, height);

  /**
   * The floor keeps a note readable on a phone, where the page it scales with
   * is only a few hundred points wide.
   */
  const noteFontSize = (fraction: number): number => Math.max(12, fraction * height);

  const commit = (elements: readonly MarkingElement[]): void => {
    onChange?.({ elements: [...elements], version: markingDocumentVersion });
  };

  const commitText = (): void => {
    if (hasCommittedTextRef.current) {
      return;
    }

    hasCommittedTextRef.current = true;

    const trimmed = textDraft.trim();

    if (pendingText && trimmed.length > 0) {
      commit([
        ...marking.elements,
        {
          color,
          fontSize: 0.025,
          id: nextElementId("note"),
          kind: "NOTE",
          text: trimmed.slice(0, 500),
          x: pendingText.x,
          y: pendingText.y
        }
      ]);
    }

    setPendingText(null);
    setTextDraft("");
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
          if (pendingText) {
            return;
          }

          const point = toNormalised(event.nativeEvent.locationX, event.nativeEvent.locationY);

          if (tool === "PEN") {
            draftRef.current = [point];
            setDraftPoints(draftRef.current);
            return;
          }

          if (tool === "NOTE") {
            hasCommittedTextRef.current = false;
            setPendingText(point);
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
    [color, height, isEditable, marking.elements, pendingText, penWidth, tool, width]
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
          strokeWidth={strokeWidthFor(element.width)}
        />
      );
    }

    if (element.kind === "STAMP") {
      return (
        <SvgText
          fill={colorHex[element.color]}
          fontSize={element.size * height}
          key={element.id}
          textAnchor="middle"
          x={element.x * width}
          y={element.y * height}
        >
          {stampGlyph[element.stamp]}
        </SvgText>
      );
    }

    const size = noteFontSize(element.fontSize);

    return (
      <SvgText
        fill={colorHex[element.color]}
        fontSize={size}
        fontWeight="500"
        key={element.id}
        textAnchor="start"
        x={element.x * width}
        // `y` is a baseline here, so a note written near the top of the page
        // was drawn above it and cropped away. Dropping it by its own size
        // hangs the text off the point it was placed at, as the web does.
        y={element.y * height + size}
      >
        {element.text}
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
            strokeWidth={strokeWidthFor(penWidth)}
          />
        ) : null}
      </Svg>
      {pendingText ? (
        <TextInput
          accessibilityLabel={textPlaceholder}
          autoFocus
          onBlur={commitText}
          onChangeText={setTextDraft}
          onSubmitEditing={commitText}
          placeholder={textPlaceholder}
          placeholderTextColor={colors.placeholder}
          selectionColor={colors.accent}
          style={[styles.textInput, { left: pendingText.x * width, top: pendingText.y * height }]}
          value={textDraft}
        />
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  textInput: {
    backgroundColor: colors.card,
    borderColor: colors.hairline,
    borderRadius: radius.sm,
    borderWidth: 1,
    color: colors.ink,
    minWidth: 140,
    padding: spacing.sm,
    position: "absolute"
  }
});
