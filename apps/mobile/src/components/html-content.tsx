import { hasMathDelimiters } from "@mma/shared";
import type { JSX } from "react";
import { useWindowDimensions } from "react-native";
import RenderHTML, { type HTMLSource } from "react-native-render-html";

import { MathWebView } from "@/src/components/math/math-webview";
import { fonts, typography } from "@/src/theme/tokens";
import { useThemeColors } from "@/src/theme/theme";

export interface HtmlContentProps {
  html: string | null | undefined;
  muted?: boolean;
}

export function HtmlContent({ html, muted = false }: HtmlContentProps): JSX.Element | null {
  const colors = useThemeColors();
  const { width } = useWindowDimensions();
  const trimmed = html?.trim() ?? "";

  if (trimmed.length === 0) {
    return null;
  }

  // Maths needs a WebView; everything else keeps the native renderer, which is
  // cheaper and matches the app's typography exactly. A question with no
  // formula in it pays nothing for this.
  if (hasMathDelimiters(trimmed)) {
    return <MathWebView html={trimmed} muted={muted} />;
  }

  const source: HTMLSource = { html: trimmed };

  return (
    <RenderHTML
      contentWidth={width - 32}
      source={source}
      tagsStyles={{
        a: {
          color: colors.accent,
          textDecorationLine: "underline"
        },
        blockquote: {
          borderLeftColor: colors.hairline,
          borderLeftWidth: 3,
          color: muted ? colors.muted : colors.inkMuted,
          paddingLeft: 12
        },
        body: {
          color: muted ? colors.muted : colors.ink,
          fontFamily: fonts.body,
          fontSize: typography.body.fontSize,
          lineHeight: typography.body.lineHeight,
          margin: 0
        },
        h1: {
          color: muted ? colors.muted : colors.ink,
          fontFamily: fonts.displayBold,
          fontSize: typography.heading.fontSize,
          lineHeight: typography.heading.lineHeight,
          marginBottom: 8,
          marginTop: 16
        },
        h2: {
          color: muted ? colors.muted : colors.ink,
          fontFamily: fonts.displayBold,
          fontSize: typography.title.fontSize,
          lineHeight: typography.title.lineHeight,
          marginBottom: 8,
          marginTop: 12
        },
        h3: {
          color: muted ? colors.muted : colors.ink,
          fontFamily: fonts.displayBold,
          fontSize: typography.body.fontSize + 2,
          lineHeight: typography.body.lineHeight + 4,
          marginBottom: 6,
          marginTop: 10
        },
        li: {
          color: muted ? colors.muted : colors.ink,
          fontFamily: fonts.body,
          fontSize: typography.body.fontSize,
          lineHeight: typography.body.lineHeight
        },
        ol: {
          color: muted ? colors.muted : colors.ink,
          marginBottom: 8,
          marginTop: 8
        },
        p: {
          color: muted ? colors.muted : colors.ink,
          fontFamily: fonts.body,
          fontSize: typography.body.fontSize,
          lineHeight: typography.body.lineHeight,
          marginBottom: 8,
          marginTop: 0
        },
        ul: {
          color: muted ? colors.muted : colors.ink,
          marginBottom: 8,
          marginTop: 8
        }
      }}
    />
  );
}
