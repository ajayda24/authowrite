"use client";

import { ImageIcon, TrashIcon, XIcon } from "lucide-react";
import { useRef, useState, useTransition } from "react";
import { toast } from "sonner";
import { StoryCover } from "@/components/story/cover";
import { Button } from "@/components/ui/button";
import { ConfirmDialog } from "@/components/ui/dialog";
import { Field, Input, Select, Textarea } from "@/components/ui/input";
import { LANGUAGES } from "@/lib/languages";
import { uploadImageFile } from "@/lib/upload-client";
import { cn } from "@/lib/utils";
import {
  deleteStoryAction,
  setStoryStatusAction,
  updateStoryAction,
} from "@/server/actions/stories";

type Status = "draft" | "published" | "unlisted" | "archived";

interface Props {
  story: {
    id: string;
    title: string;
    description: string;
    genreSlug: string | null;
    language: string;
    tags: string[];
    status: Status;
    coverKey: string | null;
    coverUrl: string | null;
  };
  genres: { slug: string; name: string }[];
  hasPublishedChapter: boolean;
}

const STATUS_OPTIONS: { value: Status; label: string; description: string }[] = [
  { value: "draft", label: "Draft", description: "Only you can see it." },
  { value: "published", label: "Published", description: "Anyone can find and read it." },
  {
    value: "unlisted",
    label: "Unlisted",
    description: "Anyone with the link can read it, but it isn’t listed.",
  },
  {
    value: "archived",
    label: "Archived",
    description: "Hidden from readers. You can bring it back any time.",
  },
];

export function StorySettingsForm({ story, genres, hasPublishedChapter }: Props) {
  const [pending, startTransition] = useTransition();
  const [cover, setCover] = useState({ key: story.coverKey, url: story.coverUrl });
  const [uploading, setUploading] = useState(false);
  const [tags, setTags] = useState<string[]>(story.tags);
  const [tagDraft, setTagDraft] = useState("");
  const [title, setTitle] = useState(story.title);
  const fileInput = useRef<HTMLInputElement>(null);

  function addTag(value: string) {
    const clean = value.trim().replace(/^#/, "");
    if (clean && !tags.includes(clean) && tags.length < 8) setTags([...tags, clean]);
    setTagDraft("");
  }

  async function onCoverSelected(file: File | undefined) {
    if (!file) return;
    setUploading(true);
    try {
      const uploaded = await uploadImageFile(file);
      setCover({ key: uploaded.key, url: uploaded.url });
    } catch (error) {
      toast.error((error as Error).message);
    } finally {
      setUploading(false);
      if (fileInput.current) fileInput.current.value = "";
    }
  }

  function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const allTags = tagDraft.trim() ? [...tags, tagDraft.trim()] : tags;
    startTransition(async () => {
      const result = await updateStoryAction(story.id, {
        title: String(form.get("title") ?? ""),
        description: String(form.get("description") ?? ""),
        genreSlug: String(form.get("genre") ?? "") || null,
        language: String(form.get("language") ?? "en"),
        tags: allTags,
        coverKey: cover.key,
      });
      if (result.ok) {
        setTagDraft("");
        toast.success("Story details saved.");
      } else toast.error(result.error);
    });
  }

  function changeStatus(status: Status) {
    startTransition(async () => {
      const result = await setStoryStatusAction(story.id, status);
      if (result.ok)
        toast.success(status === "published" ? "Your story is live." : "Visibility updated.");
      else toast.error(result.error);
    });
  }

  return (
    <div className="space-y-12">
      <form onSubmit={onSubmit} className="grid gap-8 md:grid-cols-[180px_1fr]">
        <div className="space-y-3">
          <p className="text-sm font-medium">Cover</p>
          <StoryCover title={title} src={cover.url} seed={story.id} className="w-36 md:w-full" />
          <input
            ref={fileInput}
            type="file"
            accept="image/png,image/jpeg,image/webp,image/gif,image/avif"
            className="sr-only"
            id="cover-upload"
            onChange={(e) => onCoverSelected(e.target.files?.[0])}
          />
          <div className="flex flex-wrap gap-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              disabled={uploading}
              onClick={() => fileInput.current?.click()}
            >
              <ImageIcon /> {uploading ? "Uploading…" : cover.url ? "Change" : "Upload"}
            </Button>
            {cover.url ? (
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => setCover({ key: null, url: null })}
              >
                Remove
              </Button>
            ) : null}
          </div>
          <p className="text-muted-foreground text-xs leading-relaxed">
            No cover? We’ll design a simple one from your title. Best size: 1200×1800.
          </p>
        </div>

        <div className="space-y-5">
          <Field label="Title" htmlFor="title">
            <Input
              id="title"
              name="title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              maxLength={160}
              required
            />
          </Field>
          <Field
            label="Description"
            htmlFor="description"
            hint="A few sentences to invite readers in."
          >
            <Textarea
              id="description"
              name="description"
              defaultValue={story.description}
              maxLength={2000}
              rows={5}
            />
          </Field>
          <div className="grid gap-5 sm:grid-cols-2">
            <Field label="Genre" htmlFor="genre">
              <Select id="genre" name="genre" defaultValue={story.genreSlug ?? ""}>
                <option value="">No genre</option>
                {genres.map((g) => (
                  <option key={g.slug} value={g.slug}>
                    {g.name}
                  </option>
                ))}
              </Select>
            </Field>
            <Field label="Language" htmlFor="language">
              <Select id="language" name="language" defaultValue={story.language}>
                {LANGUAGES.map((l) => (
                  <option key={l.code} value={l.code}>
                    {l.name}
                  </option>
                ))}
                {!LANGUAGES.some((l) => l.code === story.language) ? (
                  <option value={story.language}>{story.language}</option>
                ) : null}
              </Select>
            </Field>
          </div>
          <Field label="Tags" htmlFor="tags" hint="Up to 8. Press Enter or comma to add.">
            <div className="border-border-strong bg-surface focus-within:border-ring focus-within:ring-ring/25 flex min-h-10 flex-wrap items-center gap-1.5 rounded-md border px-2 py-1.5 focus-within:ring-2">
              {tags.map((tag) => (
                <span
                  key={tag}
                  className="bg-muted inline-flex items-center gap-1 rounded-sm px-1.5 py-0.5 text-sm"
                >
                  #{tag}
                  <button
                    type="button"
                    onClick={() => setTags(tags.filter((t) => t !== tag))}
                    aria-label={`Remove tag ${tag}`}
                    className="text-muted-foreground hover:text-foreground"
                  >
                    <XIcon className="size-3" />
                  </button>
                </span>
              ))}
              <input
                id="tags"
                value={tagDraft}
                onChange={(e) => setTagDraft(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" || e.key === ",") {
                    e.preventDefault();
                    addTag(tagDraft);
                  } else if (e.key === "Backspace" && !tagDraft && tags.length) {
                    setTags(tags.slice(0, -1));
                  }
                }}
                onBlur={() => tagDraft && addTag(tagDraft)}
                disabled={tags.length >= 8}
                placeholder={tags.length ? "" : "monsoon, family, kerala"}
                className="placeholder:text-subtle-foreground min-w-24 flex-1 bg-transparent py-0.5 text-[15px] outline-none"
              />
            </div>
          </Field>
          <Button type="submit" disabled={pending || uploading}>
            {pending ? "Saving…" : "Save details"}
          </Button>
        </div>
      </form>

      <section aria-labelledby="visibility-heading" className="border-t pt-8">
        <h2 id="visibility-heading" className="font-display text-xl font-semibold">
          Who can read this story?
        </h2>
        {!hasPublishedChapter ? (
          <p className="text-muted-foreground mt-2 text-sm">
            Publish at least one chapter to share your story.
          </p>
        ) : null}
        <div
          role="radiogroup"
          aria-labelledby="visibility-heading"
          className="mt-4 grid gap-2 sm:grid-cols-2"
        >
          {STATUS_OPTIONS.map((option) => {
            const active = story.status === option.value;
            const blocked =
              !hasPublishedChapter && (option.value === "published" || option.value === "unlisted");
            return (
              <button
                key={option.value}
                type="button"
                role="radio"
                aria-checked={active}
                disabled={pending || blocked}
                onClick={() => !active && changeStatus(option.value)}
                className={cn(
                  "rounded-md border px-4 py-3 text-left transition-colors disabled:cursor-not-allowed disabled:opacity-50",
                  active ? "border-foreground bg-muted" : "hover:bg-muted/60",
                )}
              >
                <span className="flex items-center gap-2 font-medium">
                  <span
                    className={cn(
                      "border-border-strong size-3 rounded-full border",
                      active && "border-foreground border-4",
                    )}
                    aria-hidden="true"
                  />
                  {option.label}
                </span>
                <span className="text-muted-foreground mt-1 block pl-5 text-sm">
                  {option.description}
                </span>
              </button>
            );
          })}
        </div>
      </section>

      <section aria-labelledby="danger-heading" className="border-t pt-8">
        <h2 id="danger-heading" className="font-display text-xl font-semibold">
          Delete story
        </h2>
        <p className="text-muted-foreground mt-2 max-w-xl text-sm">
          Permanently deletes the story, every chapter, and all comments. If you only want to hide
          it, choose <strong>Archived</strong> above instead.
        </p>
        <ConfirmDialog
          title={`Delete “${story.title}”?`}
          description="This permanently deletes the story and all its chapters. This can’t be undone."
          confirmLabel="Delete story"
          onConfirm={() =>
            startTransition(async () => {
              const result = await deleteStoryAction(story.id);
              if (result && !result.ok) toast.error(result.error);
            })
          }
          trigger={
            <Button variant="outline" className="text-destructive mt-4" disabled={pending}>
              <TrashIcon /> Delete story
            </Button>
          }
        />
      </section>
    </div>
  );
}
