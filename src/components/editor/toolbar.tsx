"use client";

import type { Editor } from "@tiptap/react";
import { useEditorState } from "@tiptap/react";
import {
  BoldIcon,
  Heading2Icon,
  Heading3Icon,
  ImageIcon,
  ItalicIcon,
  LinkIcon,
  ListIcon,
  ListOrderedIcon,
  MinusIcon,
  PilcrowIcon,
  QuoteIcon,
  Redo2Icon,
  StrikethroughIcon,
  UnderlineIcon,
  Undo2Icon,
} from "lucide-react";
import { useRef, useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { isSafeHref } from "@/lib/content/sanitize";
import { uploadImageFile } from "@/lib/upload-client";
import { cn } from "@/lib/utils";

const isMac = typeof navigator !== "undefined" && /Mac|iPhone|iPad/.test(navigator.platform);
const mod = isMac ? "⌘" : "Ctrl+";

function ToolButton({
  label,
  shortcut,
  active,
  disabled,
  onClick,
  children,
}: {
  label: string;
  shortcut?: string;
  active?: boolean;
  disabled?: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  const title = shortcut ? `${label} (${shortcut})` : label;
  return (
    <button
      type="button"
      title={title}
      aria-label={label}
      aria-pressed={active}
      disabled={disabled}
      onMouseDown={(e) => e.preventDefault()}
      onClick={onClick}
      className={cn(
        "inline-flex size-8 shrink-0 items-center justify-center rounded-sm text-muted-foreground transition-colors hover:bg-muted hover:text-foreground disabled:opacity-35 [&_svg]:size-4",
        active && "bg-muted text-foreground",
      )}
    >
      {children}
    </button>
  );
}

function Divider() {
  return <span className="mx-1 h-5 w-px shrink-0 bg-border" aria-hidden="true" />;
}

export function EditorToolbar({ editor }: { editor: Editor }) {
  const [linkOpen, setLinkOpen] = useState(false);
  const [uploading, setUploading] = useState(false);
  const fileInput = useRef<HTMLInputElement>(null);

  const s = useEditorState({
    editor,
    selector: ({ editor: e }) => ({
      paragraph: e.isActive("paragraph"),
      h2: e.isActive("heading", { level: 2 }),
      h3: e.isActive("heading", { level: 3 }),
      bold: e.isActive("bold"),
      italic: e.isActive("italic"),
      underline: e.isActive("underline"),
      strike: e.isActive("strike"),
      quote: e.isActive("blockquote"),
      bullet: e.isActive("bulletList"),
      ordered: e.isActive("orderedList"),
      link: e.isActive("link"),
      canUndo: e.can().undo(),
      canRedo: e.can().redo(),
    }),
  });

  async function insertImage(file: File | undefined) {
    if (!file) return;
    setUploading(true);
    try {
      const { url } = await uploadImageFile(file);
      editor.chain().focus().setImage({ src: url, alt: "" }).run();
    } catch (error) {
      toast.error((error as Error).message);
    } finally {
      setUploading(false);
      if (fileInput.current) fileInput.current.value = "";
    }
  }

  return (
    <>
      <div role="toolbar" aria-label="Formatting" className="flex items-center gap-0.5 overflow-x-auto py-1.5 [scrollbar-width:none]">
        <ToolButton label="Text" active={s.paragraph} onClick={() => editor.chain().focus().setParagraph().run()}>
          <PilcrowIcon />
        </ToolButton>
        <ToolButton label="Heading" active={s.h2} onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()}>
          <Heading2Icon />
        </ToolButton>
        <ToolButton label="Subheading" active={s.h3} onClick={() => editor.chain().focus().toggleHeading({ level: 3 }).run()}>
          <Heading3Icon />
        </ToolButton>
        <Divider />
        <ToolButton label="Bold" shortcut={`${mod}B`} active={s.bold} onClick={() => editor.chain().focus().toggleBold().run()}>
          <BoldIcon />
        </ToolButton>
        <ToolButton label="Italic" shortcut={`${mod}I`} active={s.italic} onClick={() => editor.chain().focus().toggleItalic().run()}>
          <ItalicIcon />
        </ToolButton>
        <ToolButton label="Underline" shortcut={`${mod}U`} active={s.underline} onClick={() => editor.chain().focus().toggleUnderline().run()}>
          <UnderlineIcon />
        </ToolButton>
        <ToolButton label="Strikethrough" active={s.strike} onClick={() => editor.chain().focus().toggleStrike().run()}>
          <StrikethroughIcon />
        </ToolButton>
        <ToolButton label="Link" active={s.link} onClick={() => setLinkOpen(true)}>
          <LinkIcon />
        </ToolButton>
        <Divider />
        <ToolButton label="Quote" active={s.quote} onClick={() => editor.chain().focus().toggleBlockquote().run()}>
          <QuoteIcon />
        </ToolButton>
        <ToolButton label="Bulleted list" active={s.bullet} onClick={() => editor.chain().focus().toggleBulletList().run()}>
          <ListIcon />
        </ToolButton>
        <ToolButton label="Numbered list" active={s.ordered} onClick={() => editor.chain().focus().toggleOrderedList().run()}>
          <ListOrderedIcon />
        </ToolButton>
        <ToolButton label="Scene break" onClick={() => editor.chain().focus().setHorizontalRule().run()}>
          <MinusIcon />
        </ToolButton>
        <ToolButton label={uploading ? "Uploading image…" : "Image"} disabled={uploading} onClick={() => fileInput.current?.click()}>
          <ImageIcon />
        </ToolButton>
        <Divider />
        <ToolButton label="Undo" shortcut={`${mod}Z`} disabled={!s.canUndo} onClick={() => editor.chain().focus().undo().run()}>
          <Undo2Icon />
        </ToolButton>
        <ToolButton label="Redo" shortcut={isMac ? "⇧⌘Z" : "Ctrl+Y"} disabled={!s.canRedo} onClick={() => editor.chain().focus().redo().run()}>
          <Redo2Icon />
        </ToolButton>
        <input
          ref={fileInput}
          type="file"
          accept="image/png,image/jpeg,image/webp,image/gif,image/avif"
          className="sr-only"
          tabIndex={-1}
          aria-hidden="true"
          onChange={(e) => insertImage(e.target.files?.[0])}
        />
      </div>
      <LinkDialog editor={editor} open={linkOpen} onOpenChange={setLinkOpen} />
    </>
  );
}

function LinkDialog({ editor, open, onOpenChange }: { editor: Editor; open: boolean; onOpenChange: (open: boolean) => void }) {
  const current = (editor.getAttributes("link").href as string | undefined) ?? "";
  const [error, setError] = useState<string | null>(null);

  function apply(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    let href = String(new FormData(event.currentTarget).get("href") ?? "").trim();
    if (!href) {
      editor.chain().focus().extendMarkRange("link").unsetLink().run();
      onOpenChange(false);
      return;
    }
    if (!/^[a-z]+:/i.test(href) && !href.startsWith("/")) href = `https://${href}`;
    if (!isSafeHref(href)) return setError("Enter a web address like https://example.com");
    const chain = editor.chain().focus().extendMarkRange("link");
    if (editor.state.selection.empty && !editor.isActive("link")) {
      chain.insertContent({ type: "text", text: href, marks: [{ type: "link", attrs: { href } }] }).run();
    } else {
      chain.setLink({ href }).run();
    }
    setError(null);
    onOpenChange(false);
  }

  return (
    <Dialog open={open} onOpenChange={(o) => { setError(null); onOpenChange(o); }}>
      <DialogContent>
        <DialogTitle>{current ? "Edit link" : "Add link"}</DialogTitle>
        <DialogDescription>Leave empty to remove the link.</DialogDescription>
        <form onSubmit={apply} className="mt-4">
          <label htmlFor="link-href" className="sr-only">Web address</label>
          <Input id="link-href" name="href" defaultValue={current} placeholder="https://" autoFocus aria-invalid={Boolean(error)} />
          {error ? <p role="alert" className="mt-2 text-sm text-destructive">{error}</p> : null}
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
            <Button type="submit">Apply</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

