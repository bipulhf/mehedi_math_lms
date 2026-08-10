import { lazy, Suspense, type JSX } from "react";

import type { RichTextEditorProps } from "@/components/ui/rich-text-editor-impl";

export type { RichTextEditorProps } from "@/components/ui/rich-text-editor-impl";

const RichTextEditorImpl = lazy(async () => {
  const module = await import("@/components/ui/rich-text-editor-impl");

  return { default: module.RichTextEditor };
});

export function RichTextEditor(props: RichTextEditorProps): JSX.Element {
  return (
    <Suspense fallback={<div className="min-h-32 border border-hairline bg-card" />}>
      <RichTextEditorImpl {...props} />
    </Suspense>
  );
}
