import { useEditor, EditorContent, type Editor } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import Link from "@tiptap/extension-link";
import Underline from "@tiptap/extension-underline";
import Placeholder from "@tiptap/extension-placeholder";
import {
  Bold,
  Italic,
  Underline as UnderlineIcon,
  Strikethrough,
  Heading1,
  Heading2,
  Heading3,
  List,
  ListOrdered,
  Quote,
  Link as LinkIcon
} from "lucide-react";
import type { JSX } from "react";
import { useEffect, useState } from "react";

import { Button } from "@/components/ui/button";
import { fieldClassName } from "@/components/ui/field";
import { cn } from "@/lib/utils";

export interface RichTextEditorProps {
  className?: string | undefined;
  error?: string | undefined;
  id?: string | undefined;
  onChange: (value: string) => void;
  placeholder?: string | undefined;
  value: string;
}

function ToolbarButton({
  active,
  children,
  onClick,
  title
}: {
  active?: boolean;
  children: JSX.Element;
  onClick: () => void;
  title: string;
}): JSX.Element {
  return (
    <Button
      className="size-7"
      onClick={onClick}
      size="icon"
      title={title}
      type="button"
      variant={active ? "ink" : "outline"}
    >
      {children}
    </Button>
  );
}

function LinkPrompt({ editor }: { editor: Editor }): JSX.Element {
  const [url, setUrl] = useState("");
  const currentHref = editor.isActive("link") ? (editor.getAttributes("link").href as string) : "";

  useEffect(() => {
    setUrl(currentHref);
  }, [currentHref]);

  const apply = (): void => {
    if (url.trim() === "") {
      editor.chain().focus().unsetLink().run();
      return;
    }
    const href = url.startsWith("http://") || url.startsWith("https://") ? url : `https://${url}`;
    editor.chain().focus().setLink({ href }).run();
  };

  return (
    <div className="flex items-center gap-1">
      <input
        className="h-7 w-32 rounded-[var(--radius)] border border-hairline bg-card px-2 text-xs text-ink placeholder:text-placeholder focus-visible:border-line-strong focus-visible:outline-none"
        onChange={(event) => setUrl(event.target.value)}
        onKeyDown={(event) => {
          if (event.key === "Enter") {
            event.preventDefault();
            apply();
          }
        }}
        placeholder="https://..."
        type="text"
        value={url}
      />
      <Button className="size-7" onClick={apply} size="icon" type="button" variant="ink">
        <LinkIcon className="size-3.5" />
      </Button>
    </div>
  );
}

export function RichTextEditor({
  className,
  error,
  id,
  onChange,
  placeholder,
  value
}: RichTextEditorProps): JSX.Element {
  const editor = useEditor({
    editorProps: {
      attributes: {
        class: "min-h-32 px-3.5 py-3 text-sm text-ink focus-visible:outline-none"
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
    if (editor && !editor.isDestroyed && value !== editor.getHTML()) {
      editor.commands.setContent(value, { emitUpdate: false });
    }
  }, [editor, value]);

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
        <div className="flex flex-wrap items-center gap-1 border-b border-hairline bg-panel-warm/50 p-1.5">
          <ToolbarButton
            active={editor.isActive("bold")}
            onClick={() => editor.chain().focus().toggleBold().run()}
            title="Bold"
          >
            <Bold className="size-3.5" />
          </ToolbarButton>
          <ToolbarButton
            active={editor.isActive("italic")}
            onClick={() => editor.chain().focus().toggleItalic().run()}
            title="Italic"
          >
            <Italic className="size-3.5" />
          </ToolbarButton>
          <ToolbarButton
            active={editor.isActive("underline")}
            onClick={() => editor.chain().focus().toggleUnderline().run()}
            title="Underline"
          >
            <UnderlineIcon className="size-3.5" />
          </ToolbarButton>
          <ToolbarButton
            active={editor.isActive("strike")}
            onClick={() => editor.chain().focus().toggleStrike().run()}
            title="Strikethrough"
          >
            <Strikethrough className="size-3.5" />
          </ToolbarButton>

          <span className="mx-1 h-4 w-px bg-hairline" />

          <ToolbarButton
            active={editor.isActive("heading", { level: 1 })}
            onClick={() => editor.chain().focus().toggleHeading({ level: 1 }).run()}
            title="Heading 1"
          >
            <Heading1 className="size-3.5" />
          </ToolbarButton>
          <ToolbarButton
            active={editor.isActive("heading", { level: 2 })}
            onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()}
            title="Heading 2"
          >
            <Heading2 className="size-3.5" />
          </ToolbarButton>
          <ToolbarButton
            active={editor.isActive("heading", { level: 3 })}
            onClick={() => editor.chain().focus().toggleHeading({ level: 3 }).run()}
            title="Heading 3"
          >
            <Heading3 className="size-3.5" />
          </ToolbarButton>

          <span className="mx-1 h-4 w-px bg-hairline" />

          <ToolbarButton
            active={editor.isActive("bulletList")}
            onClick={() => editor.chain().focus().toggleBulletList().run()}
            title="Bullet list"
          >
            <List className="size-3.5" />
          </ToolbarButton>
          <ToolbarButton
            active={editor.isActive("orderedList")}
            onClick={() => editor.chain().focus().toggleOrderedList().run()}
            title="Numbered list"
          >
            <ListOrdered className="size-3.5" />
          </ToolbarButton>
          <ToolbarButton
            active={editor.isActive("blockquote")}
            onClick={() => editor.chain().focus().toggleBlockquote().run()}
            title="Quote"
          >
            <Quote className="size-3.5" />
          </ToolbarButton>

          <span className="mx-1 h-4 w-px bg-hairline" />

          <LinkPrompt editor={editor} />
        </div>
        <EditorContent editor={editor} />
      </div>
      {error ? <p className="text-sm text-error">{error}</p> : null}
    </div>
  );
}
