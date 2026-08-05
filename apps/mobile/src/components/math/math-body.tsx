import { escapeHtmlText, hasMathDelimiters } from "@genex/shared";
import type { JSX } from "react";

import { MathWebView } from "@/src/components/math/math-webview";
import { Body } from "@/src/components/ui";

export interface MathBodyProps {
  /** A plain string — an MCQ option — which may carry `$…$`. */
  muted?: boolean;
  text: string;
}

/**
 * An MCQ option, typeset only when it needs to be.
 *
 * Four options with no maths in them cost four `Text` nodes, as before. Only
 * the ones carrying a formula become a WebView, which is what keeps a results
 * list scrollable — a screen of WebViews is not.
 *
 * The text is escaped on the way in because it is a plain field: an option
 * reading `a < b` is three characters a teacher typed, not the start of a tag.
 */
export function MathBody({ muted = false, text }: MathBodyProps): JSX.Element {
  if (!hasMathDelimiters(text)) {
    return <Body muted={muted}>{text}</Body>;
  }

  return <MathWebView html={escapeHtmlText(text)} muted={muted} />;
}
