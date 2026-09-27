import { ArrowLeftIcon, ArrowRightIcon, PenLineIcon } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ChapterMenu } from "@/components/reader/chapter-menu";
import { ReaderSettings } from "@/components/reader/reader-settings";
import { ReadingProgress } from "@/components/reader/reading-progress";
import { Comments } from "@/components/social/comments";
import { ViewTracker } from "@/components/social/view-tracker";
import { Button } from "@/components/ui/button";
import { readingMinutes } from "@/lib/content/text";
import { decodeParam } from "@/lib/params";
import { getViewer } from "@/server/auth/session";
import { getReaderChapter } from "@/server/services/chapters";

async function load(props: PageProps<"/[username]/[story]/[chapter]">) {
  const params = await props.params;
  const viewer = await getViewer();
  const data = await getReaderChapter(viewer, decodeParam(params.username), decodeParam(params.story), Number(params.chapter));
  return { data, viewer };
}

export async function generateMetadata(props: PageProps<"/[username]/[story]/[chapter]">): Promise<Metadata> {
  const { data } = await load(props);
  if (!data) return { title: "Chapter not found" };
  const chapterTitle = data.chapter.title || `Chapter ${data.chapter.position}`;
  return {
    title: `${chapterTitle} — ${data.story.title}`,
    robots: data.story.status === "published" && data.chapter.status === "published" ? undefined : { index: false },
  };
}

export default async function ReaderPage(props: PageProps<"/[username]/[story]/[chapter]">) {
  const { data, viewer } = await load(props);
  if (!data) notFound();
  const { story, author, chapter, toc, prev, next, isOwner } = data;
  const base = `/${author.username}/${story.slug}`;
  const chapterTitle = chapter.title || `Chapter ${chapter.position}`;

  return (
    <>
      <ReadingProgress targetId="chapter-body" storyId={story.id} chapterId={chapter.id} track={Boolean(viewer) && !isOwner} />
      {!isOwner ? <ViewTracker storyId={story.id} /> : null}
      <header className="sticky top-0 z-40 border-b bg-background/92 backdrop-blur-sm">
        <div className="mx-auto flex h-13 max-w-5xl items-center gap-2 px-3 sm:px-5">
          <Link href={base} className="inline-flex min-w-0 items-center gap-1.5 rounded-md py-1 pr-2 text-sm text-muted-foreground hover:text-foreground">
            <ArrowLeftIcon className="size-4 shrink-0" aria-hidden="true" />
            <span className="truncate">
              <span className="font-medium text-foreground">{story.title}</span>
              <span className="hidden sm:inline"> · {author.name}</span>
            </span>
          </Link>
          <div className="ml-auto flex items-center">
            {isOwner ? (
              <Button asChild variant="ghost" size="sm">
                <Link href={`/write/${story.id}/chapters/${chapter.id}`}><PenLineIcon /> Edit</Link>
              </Button>
            ) : null}
            <ChapterMenu base={base} current={chapter.position} chapters={toc} />
            <ReaderSettings targetId="chapter-body" />
          </div>
        </div>
      </header>

      <main id="main" className="px-5 pt-14 pb-20 sm:pt-20">
        <article lang={story.language} className="mx-auto max-w-[40rem]">
          <header className="mb-12 text-center">
            <p className="text-sm tracking-wide text-subtle-foreground uppercase">
              Chapter {data.number}
              {chapter.status === "draft" ? " · Draft" : ""}
            </p>
            <h1 className="mt-3 font-display text-3xl leading-tight font-semibold text-balance sm:text-4xl">{chapterTitle}</h1>
            <p className="mt-3 text-sm text-muted-foreground">{readingMinutes(chapter.wordCount)} min read</p>
          </header>
          <div
            id="chapter-body"
            className="story-prose mx-auto max-w-[40rem]"
            dangerouslySetInnerHTML={{ __html: chapter.html }}
          />
        </article>

        <nav aria-label="Chapter navigation" className="mx-auto mt-20 grid max-w-[40rem] gap-3 border-t pt-8 sm:grid-cols-2">
          {prev ? (
            <Link href={`${base}/${prev.position}`} className="rounded-md border px-4 py-3 hover:bg-muted">
              <span className="flex items-center gap-1 text-xs text-muted-foreground"><ArrowLeftIcon className="size-3" aria-hidden="true" /> Previous</span>
              <span className="mt-1 block truncate font-display">{prev.title || `Chapter ${prev.position}`}</span>
            </Link>
          ) : <span className="hidden sm:block" />}
          {next ? (
            <Link href={`${base}/${next.position}`} className="rounded-md border px-4 py-3 text-right hover:bg-muted">
              <span className="flex items-center justify-end gap-1 text-xs text-muted-foreground">Next <ArrowRightIcon className="size-3" aria-hidden="true" /></span>
              <span className="mt-1 block truncate font-display">{next.title || `Chapter ${next.position}`}</span>
            </Link>
          ) : (
            <Link href={base} className="rounded-md border bg-muted/50 px-4 py-3 text-right hover:bg-muted">
              <span className="text-xs text-muted-foreground">You’ve reached the latest chapter</span>
              <span className="mt-1 block font-display">Back to {story.title}</span>
            </Link>
          )}
        </nav>

        <div className="mx-auto mt-16 max-w-[40rem]">
          <Comments storyId={story.id} chapterId={chapter.id} viewerId={viewer?.id ?? null} storyAuthorId={story.authorId} path={`${base}/${chapter.position}`} />
        </div>
      </main>
    </>
  );
}
