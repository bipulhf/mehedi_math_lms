import type { JSX } from "react";

import { sanitizeHtml } from "@/lib/html";
import { cn } from "@/lib/utils";

export interface RichTextContentProps {
  className?: string | undefined;
  html: string;
}

export function RichTextContent({ className, html }: RichTextContentProps): JSX.Element {
  const sanitized = sanitizeHtml(html);

  if (sanitized.trim().length === 0) {
    return <span className={cn("text-muted-faint", className)} />;
  }

  return (
    <div
      className={cn(
        "rich-text-content text-base font-light leading-relaxed text-ink",
        className
      )}
      dangerouslySetInnerHTML={{ __html: sanitized }}
    />
  );
}
