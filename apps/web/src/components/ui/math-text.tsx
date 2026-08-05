import { decodeHtmlEntities, segmentMath } from "@genex/shared";
import type { JSX } from "react";

import { renderMathToHtml } from "@/lib/katex";
import { cn } from "@/lib/utils";

export interface MathTextProps {
  className?: string | undefined;
  /** A plain string — an MCQ option — not HTML. */
  text: string;
}

/**
 * Maths inside a plain-text field.
 *
 * MCQ options are stored as plain text, not HTML, and are rendered as React
 * children everywhere. So this builds nodes rather than an HTML string: the
 * prose stays a React child, which React escapes, and only the KaTeX output —
 * which we produced — is set as markup. There is no HTML string to get the
 * escaping wrong in.
 */
export function MathText({ className, text }: MathTextProps): JSX.Element {
  const segments = segmentMath(text);

  return (
    <span className={cn("math-text", className)}>
      {segments.map((segment, index) =>
        segment.kind === "text" ? (
          <span key={index}>{segment.value}</span>
        ) : (
          <span
            dangerouslySetInnerHTML={{
              __html: renderMathToHtml(decodeHtmlEntities(segment.value), false)
            }}
            key={index}
          />
        )
      )}
    </span>
  );
}
