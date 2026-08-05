import { hasMathDelimiters, renderMathInHtml } from "@genex/shared";
import type { JSX } from "react";

import { sanitizeHtml } from "@/lib/html";
import { renderMathToHtml } from "@/lib/katex";
import { cn } from "@/lib/utils";

export interface RichTextContentProps {
  className?: string | undefined;
  html: string;
  /**
   * `"inline"` renders `$$…$$` inline anyway. For the one-line contexts — the
   * marking workspace's question strip — where a centred block would break the
   * row it sits in.
   */
  mathDisplay?: "auto" | "inline" | undefined;
}

/**
 * Rich text as a reader sees it, with any maths typeset.
 *
 * The order is the safety argument. `sanitizeHtml` runs first, so what reaches
 * the maths pass is the 16-tag allowlist and nothing else; only then is KaTeX
 * markup — produced by our own code from a LaTeX string — put in. Author bytes
 * are never re-injected as HTML, which is why the allowlist did not have to
 * open up for `span`, `class` or MathML. ADR-0014.
 */
export function RichTextContent({
  className,
  html,
  mathDisplay = "auto"
}: RichTextContentProps): JSX.Element {
  const sanitized = sanitizeHtml(html);

  if (sanitized.trim().length === 0) {
    return <span className={cn("text-muted-faint", className)} />;
  }

  // Text without a dollar in it never touches KaTeX.
  const rendered = hasMathDelimiters(sanitized)
    ? renderMathInHtml(sanitized, (latex, isDisplay) =>
        renderMathToHtml(latex, mathDisplay === "inline" ? false : isDisplay)
      )
    : sanitized;

  return (
    <div
      className={cn(
        "rich-text-content text-base font-light leading-relaxed text-ink",
        className
      )}
      dangerouslySetInnerHTML={{ __html: rendered }}
    />
  );
}
