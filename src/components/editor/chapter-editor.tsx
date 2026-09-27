"use client";

import { EditorContent, useEditor } from "@tiptap/react";
import {
  AlertTriangleIcon,
  ArrowLeftIcon,
  CheckIcon,
  CloudOffIcon,
  EyeIcon,
  LoaderIcon,
} from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState, useTransition } from "react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogTitle,
} from "@/components/ui/dialog";
import { editorExtensions } from "@/lib/content/extensions";
import { countWords } from "@/lib/content/text";
import type { DocNode } from "@/lib/content/types";
import { formatCount, formatRelative } from "@/lib/utils";
import { publishChapterAction } from "@/server/actions/stories";
import { EditorToolbar } from "./toolbar";
import { discardBackup, readBackup, useAutosave, type SaveState } from "./use-autosave";

interface Props {
  chapter: {
    id: string;
    title: string;
    content: DocNode;
    revision: number;
    status: "draft" | "published";
    position: number;
  };
  story: { id: string; title: string; status: string; language: string };
  readerHref: string;
}

export function ChapterEditor({ chapter, story, readerHref }: Props) {
  const router = useRouter();
  const [title, setTitle] = useState(chapter.title);
  const [words, setWords] = useState(0);
  const titleRef = useRef(chapter.title);
  const { state, schedule, flush } = useAutosave(chapter.id, chapter.revision);
  const [publishOpen, setPublishOpen] = useState(false);
  const [staleBackup, setStaleBackup] = useState<{
    title: string;
    content: unknown;
    at: number;
  } | null>(null);

  const editor = useEditor({
    extensions: editorExtensions("Begin your story…"),
    content: chapter.content,
    immediatelyRender: false,
    editorProps: {
      attributes: {
        class: "story-prose",
        lang: story.language,
        "aria-label": "Chapter text",
        role: "textbox",
        "aria-multiline": "true",
        spellcheck: "true",
      },
    },
    onCreate: ({ editor }) => {
      const found = readBackup(chapter.id, chapter.revision);
      if (found && !found.stale) {
        const { backup } = found;
        editor.commands.setContent(backup.content as DocNode, { emitUpdate: false });
        titleRef.current = backup.title;
        setTitle(backup.title);
        schedule({ title: backup.title, content: backup.content });
        toast.info("We restored changes that hadn’t been saved yet.");
      } else if (found?.stale) {
        setStaleBackup(found.backup);
      }
      setWords(countWords(editor.getText()));
    },
    onUpdate: ({ editor }) => {
      setWords(countWords(editor.getText()));
      schedule({ title: titleRef.current, content: editor.getJSON() });
    },
  });

  // ⌘S / Ctrl+S saves immediately instead of opening the browser dialog.
  useEffect(() => {
    function onKeyDown(event: KeyboardEvent) {
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "s") {
        event.preventDefault();
        void flush();
      }
    }
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [flush]);

  function onTitleChange(value: string) {
    setTitle(value);
    titleRef.current = value;
    if (editor) schedule({ title: value, content: editor.getJSON() });
  }

  return (
    <div className="flex min-h-dvh flex-col">
      <header className="bg-background/95 sticky top-0 z-30 border-b backdrop-blur-sm">
        <div className="mx-auto flex h-13 max-w-5xl items-center gap-3 px-3 sm:px-5">
          <Link
            href={`/write/${story.id}`}
            onClick={() => void flush()}
            className="text-muted-foreground hover:text-foreground inline-flex min-w-0 items-center gap-1.5 rounded-md py-1 pr-2 text-sm"
          >
            <ArrowLeftIcon className="size-4 shrink-0" aria-hidden="true" />
            <span className="truncate">{story.title}</span>
          </Link>
          <div className="ml-auto flex items-center gap-2">
            <SaveIndicator state={state} />
            <Button asChild variant="ghost" size="sm" className="hidden sm:inline-flex">
              <Link href={readerHref} onClick={() => void flush()}>
                <EyeIcon /> Preview
              </Link>
            </Button>
            {chapter.status === "published" && story.status === "published" ? (
              <Badge variant="published">Published</Badge>
            ) : (
              <Button size="sm" variant="accent" onClick={() => setPublishOpen(true)}>
                Publish
              </Button>
            )}
          </div>
        </div>
        {editor ? (
          <div className="mx-auto max-w-5xl border-t px-2 sm:px-4">
            <EditorToolbar editor={editor} />
          </div>
        ) : null}
      </header>

      {state.kind === "conflict" ? (
        <div role="alert" className="border-destructive/30 bg-destructive/5 border-b">
          <div className="mx-auto flex max-w-3xl flex-wrap items-center gap-3 px-4 py-3 text-sm">
            <AlertTriangleIcon className="text-destructive size-4" aria-hidden="true" />
            <span className="flex-1">{state.message} Your latest text is kept on this device.</span>
            <Button size="sm" variant="outline" onClick={() => router.refresh()}>
              Reload
            </Button>
          </div>
        </div>
      ) : null}

      {staleBackup ? (
        <div role="alert" className="bg-accent-soft border-b">
          <div className="mx-auto flex max-w-3xl flex-wrap items-center gap-3 px-4 py-3 text-sm">
            <span className="flex-1">
              This device has a different version of this chapter from{" "}
              {formatRelative(new Date(staleBackup.at))} that was never saved. Keep it, or use the
              version shown below?
            </span>
            <Button
              size="sm"
              onClick={() => {
                if (!editor) return;
                editor.commands.setContent(staleBackup.content as DocNode, { emitUpdate: false });
                titleRef.current = staleBackup.title;
                setTitle(staleBackup.title);
                setWords(countWords(editor.getText()));
                schedule({ title: staleBackup.title, content: staleBackup.content });
                setStaleBackup(null);
              }}
            >
              Restore my version
            </Button>
            <Button
              size="sm"
              variant="outline"
              onClick={() => {
                discardBackup(chapter.id);
                setStaleBackup(null);
              }}
            >
              Discard it
            </Button>
          </div>
        </div>
      ) : null}

      <main id="main" className="flex-1">
        <div className="mx-auto max-w-[44rem] px-5 pt-12 pb-40 sm:pt-16">
          <p className="text-subtle-foreground mb-2 text-sm">Chapter {chapter.position}</p>
          <label htmlFor="chapter-title" className="sr-only">
            Chapter title
          </label>
          <textarea
            id="chapter-title"
            value={title}
            rows={1}
            maxLength={160}
            placeholder="Chapter title"
            onChange={(e) => onTitleChange(e.target.value.replace(/\n/g, ""))}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.preventDefault();
                editor?.commands.focus("start");
              }
            }}
            className="font-display placeholder:text-subtle-foreground field-sizing-content w-full resize-none bg-transparent text-3xl leading-tight font-semibold outline-none sm:text-4xl"
          />
          <div className="mt-8">
            {editor ? (
              <EditorContent editor={editor} />
            ) : (
              <div className="story-prose text-subtle-foreground min-h-[60vh]">Loading…</div>
            )}
          </div>
        </div>
      </main>

      <footer className="bg-background/90 text-subtle-foreground pointer-events-none fixed right-4 bottom-3 rounded-md px-2 py-1 text-xs tabular-nums">
        {formatCount(words)} {words === 1 ? "word" : "words"}
      </footer>

      <PublishDialog
        open={publishOpen}
        onOpenChange={setPublishOpen}
        chapterId={chapter.id}
        storyIsDraft={story.status === "draft"}
        chapterIsPublished={chapter.status === "published"}
        beforePublish={flush}
        onPublished={() => {
          router.refresh();
          toast.success("Published! Readers can now enjoy it.", {
            action: { label: "View", onClick: () => router.push(readerHref) },
          });
        }}
      />
    </div>
  );
}

function SaveIndicator({ state }: { state: SaveState }) {
  const [, force] = useState(0);
  useEffect(() => {
    const id = setInterval(() => force((n) => n + 1), 30_000);
    return () => clearInterval(id);
  }, []);

  let content: React.ReactNode;
  switch (state.kind) {
    case "saving":
      content = (
        <>
          <LoaderIcon className="size-3.5 animate-spin" aria-hidden="true" /> Saving…
        </>
      );
      break;
    case "dirty":
      content = "Unsaved changes";
      break;
    case "offline":
      content = (
        <>
          <CloudOffIcon className="size-3.5" aria-hidden="true" /> Offline — kept on this device
        </>
      );
      break;
    case "conflict":
      content = <span className="text-destructive">Not saved</span>;
      break;
    case "error":
      content = <span className="text-destructive">Couldn’t save — retrying</span>;
      break;
    default:
      content = state.at ? (
        <>
          <CheckIcon className="size-3.5" aria-hidden="true" /> Saved {formatRelative(state.at)}
        </>
      ) : (
        "All changes saved"
      );
  }
  return (
    <span
      role="status"
      aria-live="polite"
      className="text-muted-foreground inline-flex items-center gap-1.5 text-xs whitespace-nowrap"
      data-save-state={state.kind}
    >
      {content}
    </span>
  );
}

function PublishDialog({
  open,
  onOpenChange,
  chapterId,
  storyIsDraft,
  chapterIsPublished,
  beforePublish,
  onPublished,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  chapterId: string;
  storyIsDraft: boolean;
  chapterIsPublished: boolean;
  beforePublish: () => Promise<boolean>;
  onPublished: () => void;
}) {
  const [publishStory, setPublishStory] = useState(true);
  const [pending, startTransition] = useTransition();

  function publish() {
    startTransition(async () => {
      const saved = await beforePublish();
      if (!saved) {
        toast.error(
          "Your latest changes couldn’t be saved yet, so we didn’t publish. Please try again.",
        );
        return;
      }
      const result = await publishChapterAction(chapterId, storyIsDraft ? publishStory : true);
      if (!result.ok) return void toast.error(result.error);
      onOpenChange(false);
      onPublished();
    });
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogTitle>
          {chapterIsPublished ? "Publish your story" : "Publish this chapter"}
        </DialogTitle>
        <DialogDescription>
          Readers will see the chapter exactly as it looks now. You can keep editing afterwards —
          changes appear as soon as they’re saved.
        </DialogDescription>
        {storyIsDraft ? (
          <label className="mt-5 flex items-start gap-3 rounded-md border p-3 text-sm">
            <input
              type="checkbox"
              checked={publishStory}
              onChange={(e) => setPublishStory(e.target.checked)}
              className="mt-0.5 size-4 accent-[var(--accent)]"
            />
            <span>
              <span className="font-medium">Also publish the story</span>
              <span className="text-muted-foreground block">
                So readers can find it on Explore and your profile.
              </span>
            </span>
          </label>
        ) : null}
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Not yet
          </Button>
          <Button variant="accent" onClick={publish} disabled={pending}>
            {pending ? "Publishing…" : "Publish"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
