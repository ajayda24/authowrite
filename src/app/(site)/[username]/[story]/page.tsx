import { BookOpenIcon, PenLineIcon } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { StoryCover } from "@/components/story/cover";
import { Comments } from "@/components/social/comments";
import { BookmarkButton, FollowButton, LikeButton, ShareButton } from "@/components/social/social-buttons";
import { ViewTracker } from "@/components/social/view-tracker";
import { StoryStatusBadge } from "@/components/writer/status-badge";
import { Avatar } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { readingMinutes } from "@/lib/content/text";
import { languageName } from "@/lib/languages";
import { decodeParam } from "@/lib/params";
import { formatDate, pluralize } from "@/lib/utils";
import { getViewer } from "@/server/auth/session";
import { getPublicStory } from "@/server/services/stories";

async function load(props: PageProps<"/[username]/[story]">) {
  const params = await props.params;
  const viewer = await getViewer();
  const data = await getPublicStory(viewer, decodeParam(params.username), decodeParam(params.story));
  return { data, viewer };
}

export async function generateMetadata(props: PageProps<"/[username]/[story]">): Promise<Metadata> {
  const { data } = await load(props);
  if (!data) return { title: "Story not found" };
  return {
    title: `${data.story.title} by ${data.author.name}`,
    description: data.story.description || undefined,
    robots: data.story.status === "published" ? undefined : { index: false },
    openGraph: { type: "book", title: data.story.title, description: data.story.description || undefined },
  };
}

export default async function StoryPage(props: PageProps<"/[username]/[story]">) {
  const { data, viewer } = await load(props);
  if (!data) notFound();
  const { story, author, chapters, stats, tags, isOwner } = data;
  const base = `/${author.username}/${story.slug}`;
  const readable = chapters.filter((c) => c.status === "published" || isOwner);
  const progress = data.viewer?.progress;
  const startHref = progress ? `${base}/${progress.position}` : readable[0] ? `${base}/${readable[0].position}` : null;

  return (
    <div className="mx-auto max-w-5xl px-4 py-10 sm:px-6 sm:py-14">
      {story.status === "published" || story.status === "unlisted" ? <ViewTracker storyId={story.id} /> : null}
      {isOwner ? (
        <div className="mb-8 flex flex-wrap items-center gap-3 rounded-md border bg-muted/60 px-4 py-2.5 text-sm">
          <StoryStatusBadge status={story.status} />
          <span className="flex-1 text-muted-foreground">
            {story.status === "draft" ? "Only you can see this page." : "This is how readers see your story."}
          </span>
          <Button asChild size="sm" variant="outline">
            <Link href={`/write/${story.id}`}><PenLineIcon /> Edit story</Link>
          </Button>
        </div>
      ) : null}

      <div className="grid gap-8 md:grid-cols-[240px_1fr] md:gap-12">
        <StoryCover title={story.title} author={author.name} src={story.coverUrl} seed={story.id} size="lg" className="mx-auto w-44 md:w-full" />
        <div>
          {story.genreName ? (
            <Link href={`/explore?genre=${story.genreSlug}`} className="text-sm font-medium tracking-wide text-accent uppercase hover:underline">
              {story.genreName}
            </Link>
          ) : null}
          <h1 lang={story.language} className="mt-2 font-display text-4xl leading-tight font-semibold text-balance sm:text-5xl">
            {story.title}
          </h1>
          <div className="mt-5 flex flex-wrap items-center gap-3">
            <Link href={`/${author.username}`} className="flex items-center gap-2.5 hover:underline">
              <Avatar name={author.name} src={author.image} size={32} />
              <span className="font-medium">{author.name}</span>
            </Link>
            {!isOwner ? (
              <FollowButton userId={author.id} name={author.name} following={Boolean(data.viewer?.followingAuthor)} signedIn={Boolean(viewer)} size="sm" />
            ) : null}
          </div>

          {story.description ? (
            <p lang={story.language} className="mt-6 max-w-2xl font-display text-lg leading-relaxed whitespace-pre-line text-foreground/90">
              {story.description}
            </p>
          ) : null}

          <dl className="mt-6 flex flex-wrap gap-x-6 gap-y-2 text-sm text-muted-foreground">
            <div><dt className="sr-only">Chapters</dt><dd>{pluralize(readable.length, "chapter")}</dd></div>
            <div><dt className="sr-only">Reading time</dt><dd>{readingMinutes(stats.words)} min read</dd></div>
            <div><dt className="sr-only">Language</dt><dd>{languageName(story.language)}</dd></div>
            <div><dt className="sr-only">Reads</dt><dd>{pluralize(stats.views, "read")}</dd></div>
            {story.publishedAt ? (<div><dt className="sr-only">Published</dt><dd>Published {formatDate(story.publishedAt)}</dd></div>) : null}
          </dl>

          {tags.length > 0 ? (
            <ul className="mt-4 flex flex-wrap gap-1.5" aria-label="Tags">
              {tags.map((tag) => (
                <li key={tag}>
                  <Link href={`/explore?tag=${encodeURIComponent(tag)}`} className="rounded-sm border px-2 py-0.5 text-[13px] text-muted-foreground hover:text-foreground">
                    #{tag}
                  </Link>
                </li>
              ))}
            </ul>
          ) : null}

          <div className="mt-8 flex flex-wrap gap-2">
            {startHref ? (
              <Button asChild size="lg" variant="accent">
                <Link href={startHref}>
                  <BookOpenIcon /> {progress ? `Continue · Chapter ${progress.position}` : "Start reading"}
                </Link>
              </Button>
            ) : null}
            <LikeButton storyId={story.id} liked={Boolean(data.viewer?.liked)} count={stats.likes} signedIn={Boolean(viewer)} />
            <BookmarkButton storyId={story.id} bookmarked={Boolean(data.viewer?.bookmarked)} signedIn={Boolean(viewer)} />
            <ShareButton title={story.title} text={`${story.title} by ${author.name}`} />
          </div>
        </div>
      </div>

      <div className="mt-16 grid gap-16 md:grid-cols-[1fr_280px]">
        <section aria-labelledby="toc-heading">
          <h2 id="toc-heading" className="border-b pb-3 font-display text-2xl font-semibold">Chapters</h2>
          {readable.length === 0 ? (
            <p className="py-6 text-muted-foreground">No chapters yet.</p>
          ) : (
            <ol className="divide-y">
              {readable.map((chapter) => (
                <li key={chapter.id}>
                  <Link href={`${base}/${chapter.position}`} className="group flex items-baseline gap-4 py-3.5">
                    <span className="w-6 text-right font-display text-sm text-subtle-foreground tabular-nums">{chapter.position}</span>
                    <span lang={story.language} className="flex-1 font-display text-lg group-hover:underline decoration-1 underline-offset-4">
                      {chapter.title || `Chapter ${chapter.position}`}
                    </span>
                    {chapter.status === "draft" ? <span className="text-xs text-subtle-foreground">Draft</span> : null}
                    <span className="text-[13px] text-subtle-foreground">{readingMinutes(chapter.wordCount)} min</span>
                  </Link>
                </li>
              ))}
            </ol>
          )}
        </section>
        <aside aria-label="About the author" className="md:pt-1">
          <h2 className="text-sm font-medium text-muted-foreground">About the author</h2>
          <Link href={`/${author.username}`} className="mt-3 flex items-center gap-3">
            <Avatar name={author.name} src={author.image} size={44} />
            <span>
              <span className="block font-medium">{author.name}</span>
              <span className="block text-sm text-muted-foreground">@{author.username}</span>
            </span>
          </Link>
          {author.bio ? <p className="mt-3 text-sm leading-relaxed text-muted-foreground">{author.bio}</p> : null}
        </aside>
      </div>

      <div className="mt-16 max-w-2xl border-t pt-10">
        <Comments storyId={story.id} chapterId={null} viewerId={viewer?.id ?? null} storyAuthorId={author.id} path={base} />
      </div>
    </div>
  );
}
