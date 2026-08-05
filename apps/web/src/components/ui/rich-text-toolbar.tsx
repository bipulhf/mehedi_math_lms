import type { Editor } from "@tiptap/react";
import {
  Bold,
  Heading1,
  Heading2,
  Heading3,
  Italic,
  Link as LinkIcon,
  List,
  ListOrdered,
  Quote,
  Sigma,
  Strikethrough,
  Underline as UnderlineIcon
} from "lucide-react";
import type { JSX } from "react";
import { useEffect, useState } from "react";

import { Button } from "@/components/ui/button";
import { useT } from "@/lib/i18n/locale-context";

/**
 * The editor's toolbar, kept out of `rich-text-editor.tsx` — that file also
 * carries the TipTap configuration, a paste handler and a preview, and all four
 * in one file is how a component gets to 400 lines.
 */

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

export function RichTextToolbar({
  editor,
  onInsertMath
}: {
  editor: Editor;
  onInsertMath: () => void;
}): JSX.Element {
  const t = useT();

  return (
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

      {/* Maths sits with the block controls rather than the text styles: it
          inserts content, it does not restyle what is selected. */}
      <ToolbarButton onClick={onInsertMath} title={t("math.insert")}>
        <Sigma className="size-3.5" />
      </ToolbarButton>

      <span className="mx-1 h-4 w-px bg-hairline" />

      <LinkPrompt editor={editor} />
    </div>
  );
}
