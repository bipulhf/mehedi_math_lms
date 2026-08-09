import { bijoyToUnicode, hasMathDelimiters, isBijoyEncoded } from "@mma/shared";
import { useEditor, EditorContent, type Editor } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import Link from "@tiptap/extension-link";
import Underline from "@tiptap/extension-underline";
import Placeholder from "@tiptap/extension-placeholder";
import type { JSX } from "react";
import { useEffect, useRef, useState } from "react";
import { toast } from "sonner";

import { MathInputDialog } from "@/components/ui/math-input-dialog";
import { useBijoyAutoConvert } from "@/hooks/use-bijoy-paste";
import { RichTextContent } from "@/components/ui/rich-text-content";
import { RichTextToolbar } from "@/components/ui/rich-text-toolbar";
import { fieldClassName } from "@/components/ui/field";
import { useT } from "@/lib/i18n/locale-context";
import { cn } from "@/lib/utils";

export interface RichTextEditorProps {
  className?: string | undefined;
  error?: string | undefined;
  id?: string | undefined;
  onChange: (value: string) => void;
  placeholder?: string | undefined;
  value: string;
}

export function RichTextEditor({
  className,
  error,
  id,
  onChange,
  placeholder,
  value
}: RichTextEditorProps): JSX.Element {
  const t = useT();
  const [isMathOpen, setIsMathOpen] = useState(false);
  const { isEnabled: isBijoyEnabled, setEnabled: setBijoyEnabled } = useBijoyAutoConvert();
  // The paste handler is built with the editor's own configuration, so it
  // cannot close over the editor. This is how it reaches it afterwards.
  const editorRef = useRef<Editor | null>(null);
  const editor = useEditor({
    editorProps: {
      attributes: {
        class: "min-h-32 px-3.5 py-3 text-sm text-ink focus-visible:outline-none"
      },
      /**
       * Bijoy arrives through the clipboard or not at all — nobody types it into
       * a browser. Converting here rather than on save means the teacher reads
       * what will be stored, and can undo it.
       */
      handlePaste: (view, event) => {
        const pasted = event.clipboardData?.getData("text/plain") ?? "";

        if (!isBijoyEnabled || !isBijoyEncoded(pasted)) {
          return false;
        }

        event.preventDefault();

        const converted = bijoyToUnicode(pasted, { convertDigits: false });

        view.dispatch(view.state.tr.insertText(converted));
        toast.success(t("bijoy.converted"), {
          action: { label: t("bijoy.undo"), onClick: () => editorRef.current?.commands.undo() }
        });

        return true;
      }
    },
    extensions: [
      StarterKit.configure({
        heading: {
          levels: [1, 2, 3]
        }
      }),
      Link.configure({
        autolink: true,
        linkOnPaste: true,
        openOnClick: false
      }),
      Underline,
      ...(placeholder
        ? [
            Placeholder.configure({
              emptyEditorClass: "is-editor-empty",
              placeholder
            })
          ]
        : [])
    ],
    content: value,
    immediatelyRender: false,
    onUpdate: ({ editor: updatedEditor }) => {
      onChange(updatedEditor.getHTML());
    }
  });

  useEffect(() => {
    editorRef.current = editor;
  }, [editor]);

  useEffect(() => {
    if (editor && !editor.isDestroyed && value !== editor.getHTML()) {
      editor.commands.setContent(value, { emitUpdate: false });
    }
  }, [editor, value]);

  /**
   * Convert the whole field on demand, for text that was typed or pasted before
   * the switch was on. Replacements are applied last-first so the positions
   * taken from the document stay valid as it shortens.
   */
  const convertDocument = (): void => {
    if (!editor) {
      return;
    }

    const replacements: { from: number; text: string; to: number }[] = [];

    editor.state.doc.descendants((node, position) => {
      const text = node.text;

      if (!node.isText || text === undefined || !isBijoyEncoded(text)) {
        return;
      }

      const converted = bijoyToUnicode(text, { convertDigits: false });

      if (converted !== text) {
        replacements.push({ from: position, text: converted, to: position + text.length });
      }
    });

    if (replacements.length === 0) {
      toast.info(t("bijoy.nothingToConvert"));

      return;
    }

    const transaction = editor.state.tr;

    for (const replacement of [...replacements].reverse()) {
      transaction.insertText(replacement.text, replacement.from, replacement.to);
    }

    editor.view.dispatch(transaction);
    toast.success(t("bijoy.converted"), {
      action: { label: t("bijoy.undo"), onClick: () => editor.commands.undo() }
    });
  };

  if (!editor) {
    return (
      <div className={cn(fieldClassName(error, className), "min-h-32 bg-panel-warm")}>
        <div className="px-3.5 py-3 text-sm text-placeholder">{placeholder}</div>
      </div>
    );
  }

  return (
    <div className="space-y-2">
      <div
        className={cn(
          fieldClassName(error, className),
          "overflow-hidden p-0",
          "focus-within:border-line-strong"
        )}
        id={id}
      >
        <RichTextToolbar
          editor={editor}
          isBijoyEnabled={isBijoyEnabled}
          onConvertBijoy={convertDocument}
          onInsertMath={() => setIsMathOpen(true)}
          onToggleBijoy={setBijoyEnabled}
        />
        <EditorContent editor={editor} />
      </div>

      {/* The one real cost of writing maths as `$…$`: the author sees the
          source while typing. The strip is only drawn when there is maths in
          the field, so an ordinary notice or bug report is unchanged. */}
      {hasMathDelimiters(value) ? (
        <div className="border border-hairline bg-panel-warm/40 px-3.5 py-3">
          <p className="label-mono mb-2 text-xs uppercase text-muted-faint">{t("math.preview")}</p>
          <RichTextContent className="text-sm" html={value} />
        </div>
      ) : null}

      {error ? <p className="text-sm text-error">{error}</p> : null}

      <MathInputDialog
        onClose={() => setIsMathOpen(false)}
        onInsert={(latex, isDisplay) => {
          // Nodes, never a string: `insertContent("$x < y$")` is parsed as HTML
          // and the `<` starts a tag. Display maths lands as its own paragraph,
          // which is what makes it a block rather than a very tall word.
          editor
            .chain()
            .focus()
            .insertContent(
              isDisplay
                ? [{ type: "paragraph", content: [{ type: "text", text: `$$${latex}$$` }] }]
                : [{ type: "text", text: `$${latex}$` }]
            )
            .run();
          setIsMathOpen(false);
        }}
        open={isMathOpen}
      />
    </div>
  );
}
