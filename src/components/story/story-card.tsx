import Link from "next/link";
import { languageName } from "@/lib/languages";
import { readingMinutes } from "@/lib/content/text";
import { formatCount, pluralize } from "@/lib/utils";
import type { StorySummary } from "@/server/services/summaries";
import { StoryCover } from "./cover";

/** Horizontal story row used in lists: cover, title, author, blurb, meta. */
export function StoryRow({ story }: { story: StorySummary }) {
  return (
    <article className="group relative flex gap-4 py-5 sm:gap-5">
      <StoryCover
        title={story.title}
        author={story.author.name}
        src={story.coverUrl}
        seed={story.id}
        size="sm"
        className="w-[72px] sm:w-[84px]"
      />
      <div className="min-w-0 flex-1">
        <h3 className="font-display text-lg leading-snug font-semibold sm:text-xl">
          <Link href={story.href} className="after:absolute after:inset-0 group-hover:underline decoration-1 underline-offset-4">
            {story.title}
          </Link>
        </h3>
        <p className="mt-0.5 text-sm text-muted-foreground">
          by{" "}
          <Link href={`/${story.author.username}`} className="relative z-10 text-foreground hover:underline">
            {story.author.name}
          </Link>
        </p>
        {story.description ? (
          <p className="mt-2 line-clamp-2 text-[15px] leading-relaxed text-muted-foreground">{story.description}</p>
        ) : null}
        <StoryMeta story={story} />
      </div>
    </article>
  );
}

export function StoryMeta({ story }: { story: StorySummary }) {
  const bits = [
    story.genre?.name,
    story.language !== "en" ? languageName(story.language) : null,
    pluralize(story.chapterCount, "chapter"),
    `${readingMinutes(story.wordCount)} min read`,
    story.likeCount > 0 ? `${formatCount(story.likeCount)} ♥` : null,
  ].filter(Boolean);
  return (
    <p className="mt-2.5 flex flex-wrap gap-x-2 text-[13px] text-subtle-foreground">
      {bits.map((bit, i) => (
        <span key={i} className="after:ml-2 after:content-['·'] last:after:content-none">
          {bit}
        </span>
      ))}
    </p>
  );
}

/** Compact vertical card for shelves on the home page. */
export function StoryTile({ story }: { story: StorySummary }) {
  return (
    <article className="group relative w-full">
      <StoryCover title={story.title} author={story.author.name} src={story.coverUrl} seed={story.id} className="w-full transition-transform group-hover:-translate-y-0.5" />
      <h3 className="mt-3 line-clamp-2 font-display text-[15px] leading-snug font-semibold">
        <Link href={story.href} className="after:absolute after:inset-0">
          {story.title}
        </Link>
      </h3>
      <p className="mt-0.5 truncate text-[13px] text-muted-foreground">{story.author.name}</p>
    </article>
  );
}

export function StoryList({ stories, empty }: { stories: StorySummary[]; empty?: React.ReactNode }) {
  if (stories.length === 0) {
    return <div className="py-16 text-center text-muted-foreground">{empty ?? "No stories yet."}</div>;
  }
  return (
    <div className="divide-y">
      {stories.map((story) => (
        <StoryRow key={story.id} story={story} />
      ))}
    </div>
  );
}
