"use client";

import {
  ArrowDownIcon,
  ArrowUpIcon,
  EyeIcon,
  EyeOffIcon,
  MoreHorizontalIcon,
  PencilIcon,
  PlusIcon,
  TrashIcon,
} from "lucide-react";
import Link from "next/link";
import { useState, useTransition } from "react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  ConfirmDialog,
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import { formatCount, formatRelative } from "@/lib/utils";
import {
  addChapterAction,
  deleteChapterAction,
  moveChapterAction,
  renameChapterAction,
  setChapterStatusAction,
} from "@/server/actions/stories";

interface ChapterItem {
  id: string;
  position: number;
  title: string;
  status: "draft" | "published";
  wordCount: number;
  updatedAt: Date;
}

export function ChapterList({ storyId, chapters }: { storyId: string; chapters: ChapterItem[] }) {
  const [pending, startTransition] = useTransition();
  const totalWords = chapters.reduce((sum, c) => sum + c.wordCount, 0);

  function perform(fn: () => Promise<{ ok: boolean; error?: string }>, success?: string) {
    startTransition(async () => {
      const result = await fn();
      if (!result.ok) toast.error(result.error ?? "Something went wrong.");
      else if (success) toast.success(success);
    });
  }

  return (
    <section aria-labelledby="chapters-heading">
      <div className="flex items-baseline justify-between">
        <h2 id="chapters-heading" className="font-display text-xl font-semibold">
          Chapters{" "}
          <span className="text-muted-foreground ml-1 text-sm font-normal">
            {formatCount(totalWords)} words
          </span>
        </h2>
        <form
          action={() => perform(() => addChapterAction(storyId).then((r) => r ?? { ok: true }))}
        >
          <Button type="submit" variant="outline" size="sm" disabled={pending}>
            <PlusIcon /> Add chapter
          </Button>
        </form>
      </div>
      <ol className="mt-4 divide-y rounded-md border" aria-busy={pending}>
        {chapters.map((chapter, index) => (
          <li key={chapter.id} className="flex items-center gap-3 px-3 py-3 sm:px-4">
            <span className="font-display text-subtle-foreground w-6 text-right text-sm tabular-nums">
              {chapter.position}
            </span>
            <div className="min-w-0 flex-1">
              <Link
                href={`/write/${storyId}/chapters/${chapter.id}`}
                className="block truncate font-medium decoration-1 underline-offset-4 hover:underline"
              >
                {chapter.title || `Chapter ${chapter.position}`}
              </Link>
              <p className="text-muted-foreground text-[13px]">
                {formatCount(chapter.wordCount)} words · edited {formatRelative(chapter.updatedAt)}
              </p>
            </div>
            <Badge variant={chapter.status === "published" ? "published" : "draft"}>
              {chapter.status === "published" ? "Published" : "Draft"}
            </Badge>
            <ChapterMenu
              chapter={chapter}
              isFirst={index === 0}
              isLast={index === chapters.length - 1}
              disabled={pending}
              perform={perform}
            />
          </li>
        ))}
      </ol>
    </section>
  );
}

function ChapterMenu({
  chapter,
  isFirst,
  isLast,
  disabled,
  perform,
}: {
  chapter: ChapterItem;
  isFirst: boolean;
  isLast: boolean;
  disabled: boolean;
  perform: (fn: () => Promise<{ ok: boolean; error?: string }>, success?: string) => void;
}) {
  const [renaming, setRenaming] = useState(false);
  const label = chapter.title || `Chapter ${chapter.position}`;
  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button
            variant="ghost"
            size="icon-sm"
            aria-label={`Actions for ${label}`}
            disabled={disabled}
          >
            <MoreHorizontalIcon />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          <DropdownMenuItem onSelect={() => setRenaming(true)}>
            <PencilIcon /> Rename
          </DropdownMenuItem>
          {chapter.status === "published" ? (
            <DropdownMenuItem
              onSelect={() =>
                perform(
                  () => setChapterStatusAction(chapter.id, "draft"),
                  "Chapter moved back to drafts.",
                )
              }
            >
              <EyeOffIcon /> Unpublish
            </DropdownMenuItem>
          ) : (
            <DropdownMenuItem
              onSelect={() =>
                perform(() => setChapterStatusAction(chapter.id, "published"), "Chapter published.")
              }
            >
              <EyeIcon /> Publish
            </DropdownMenuItem>
          )}
          <DropdownMenuSeparator />
          <DropdownMenuItem
            disabled={isFirst}
            onSelect={() => perform(() => moveChapterAction(chapter.id, "up"))}
          >
            <ArrowUpIcon /> Move up
          </DropdownMenuItem>
          <DropdownMenuItem
            disabled={isLast}
            onSelect={() => perform(() => moveChapterAction(chapter.id, "down"))}
          >
            <ArrowDownIcon /> Move down
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          <ConfirmDialog
            title={`Delete “${label}”?`}
            description="This chapter and its comments will be permanently deleted. This can’t be undone."
            onConfirm={() => perform(() => deleteChapterAction(chapter.id), "Chapter deleted.")}
            trigger={
              <DropdownMenuItem
                onSelect={(e) => e.preventDefault()}
                className="text-destructive data-[highlighted]:text-destructive [&_svg]:!text-destructive"
              >
                <TrashIcon /> Delete
              </DropdownMenuItem>
            }
          />
        </DropdownMenuContent>
      </DropdownMenu>
      <Dialog open={renaming} onOpenChange={setRenaming}>
        <DialogContent>
          <DialogTitle>Rename chapter</DialogTitle>
          <DialogDescription>Chapter {chapter.position}</DialogDescription>
          <form
            className="mt-4"
            onSubmit={(e) => {
              e.preventDefault();
              const title = String(new FormData(e.currentTarget).get("title") ?? "");
              setRenaming(false);
              perform(() => renameChapterAction(chapter.id, title));
            }}
          >
            <label htmlFor={`rename-${chapter.id}`} className="sr-only">
              Chapter title
            </label>
            <Input
              id={`rename-${chapter.id}`}
              name="title"
              defaultValue={chapter.title}
              maxLength={160}
              autoFocus
            />
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setRenaming(false)}>
                Cancel
              </Button>
              <Button type="submit">Save</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </>
  );
}
