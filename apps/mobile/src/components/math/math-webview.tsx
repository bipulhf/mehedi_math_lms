import { renderMathInHtml } from "@genex/shared";
import katex from "katex";
import type { JSX } from "react";
import { useMemo, useState } from "react";
import { StyleSheet, View } from "react-native";
import { WebView } from "react-native-webview";

import { katexCss } from "@/src/components/math/katex-css";
import { colors, fonts, typography } from "@/src/theme/tokens";

/**
 * Rich text with typeset maths, on a phone.
 *
 * KaTeX itself runs in the app's own JavaScript — `renderToString` is pure JS
 * and needs no DOM — so the WebView is only ever asked to paint HTML we already
 * produced. No script of ours runs inside it, none of the author's does either,
 * and the KaTeX library is not loaded twice.
 *
 * A WebView rather than an approximation because students sit real exams here:
 * a fraction shown as `a/b` is a different question from a fraction. The cost
 * is real, so `HtmlContent` only reaches for this when the text actually
 * contains maths.
 */

const INITIAL_HEIGHT = 44;

/** Tells the app how tall the rendered text turned out. */
const MEASURE_SCRIPT = `
  (function () {
    function post() {
      var height = document.body.scrollHeight;
      window.ReactNativeWebView.postMessage(String(height));
    }
    post();
    window.addEventListener('load', post);
    // Fonts arrive as data URIs, so this settles immediately -- but a reflow
    // after they apply still changes the height by a pixel or two.
    if (document.fonts && document.fonts.ready) { document.fonts.ready.then(post); }
    new ResizeObserver(post).observe(document.body);
  })();
  true;
`;

function buildDocument(bodyHtml: string, isMuted: boolean): string {
  const textColor = isMuted ? colors.muted : colors.ink;

  return `<!doctype html>
<html><head>
<meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=1, user-scalable=no" />
<style>${katexCss}</style>
<style>
  html, body { margin: 0; padding: 0; background: transparent; }
  body {
    color: ${textColor};
    font-family: ${fonts.body}, system-ui, sans-serif;
    font-size: ${String(typography.body.fontSize)}px;
    line-height: ${String(typography.body.lineHeight / typography.body.fontSize)};
    overflow-x: hidden;
    word-wrap: break-word;
  }
  p { margin: 0 0 8px; }
  p:last-child { margin-bottom: 0; }
  a { color: ${colors.accent}; }
  ul, ol { margin: 8px 0; padding-left: 20px; }
  blockquote { border-left: 3px solid ${colors.hairline}; margin: 0; padding-left: 12px; }
  .katex { font-size: 1.05em; }
  .katex-display { margin: 8px 0; overflow-x: auto; overflow-y: hidden; }
</style>
</head><body>${bodyHtml}</body></html>`;
}

export interface MathWebViewProps {
  /** Sanitised HTML from the API, with `$…$` in its text. */
  html: string;
  muted?: boolean;
}

export function MathWebView({ html, muted = false }: MathWebViewProps): JSX.Element {
  const [height, setHeight] = useState(INITIAL_HEIGHT);
  const document = useMemo(
    () =>
      buildDocument(
        renderMathInHtml(html, (latex, isDisplay) =>
          katex.renderToString(latex, {
            displayMode: isDisplay,
            maxExpand: 1000,
            maxSize: 50,
            output: "htmlAndMathml",
            strict: "ignore",
            throwOnError: false,
            trust: false
          })
        ),
        muted
      ),
    [html, muted]
  );

  return (
    <View style={[styles.container, { height }]}>
      <WebView
        androidLayerType="hardware"
        injectedJavaScript={MEASURE_SCRIPT}
        onMessage={(event) => {
          const measured = Number(event.nativeEvent.data);

          if (Number.isFinite(measured) && measured > 0) {
            setHeight(Math.ceil(measured));
          }
        }}
        originWhitelist={["*"]}
        // It is a block of text, not a page: the list around it does the
        // scrolling, and a tap must not zoom.
        scalesPageToFit={false}
        scrollEnabled={false}
        setBuiltInZoomControls={false}
        source={{ html: document }}
        style={styles.webView}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    width: "100%"
  },
  webView: {
    backgroundColor: "transparent",
    flex: 1
  }
});
