import { PlusIcon } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { StoryCover } from "@/components/story/cover";
import { StoryStatusBadge } from "@/components/writer/status-badge";
import { Button } from "@/components/ui/button";
import { formatCount, formatRelative, pluralize } from "@/lib/utils";
import { requireViewer } from "@/server/auth/session";
import { listContinueReading } from "@/server/services/social";
import { listMyStories } from "@/server/services/stories";

export const metadata: Metadata = { title: "My stories" };

export default async function DashboardPage() {
  const viewer = await requireViewer("/dashboard");
  const [stories, reading] = await Promise.all([
    listMyStories(viewer),
    listContinueReading(viewer, 4),
  ]);

  return (
    <div className="mx-auto max-w-4xl px-4 py-10 sm:px-6">
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-muted-foreground text-sm">Hello, {viewer.name.split(" ")[0]}</p>
          <h1 className="font-display mt-1 text-4xl font-semibold">Your stories</h1>
        </div>
        {stories.length > 0 ? (
          <Button asChild>
            <Link href="/write/new">
              <PlusIcon /> New story
            </Link>
          </Button>
        ) : null}
      </header>

      {stories.length === 0 ? (
        <section className="mt-10 rounded-lg border border-dashed px-6 py-16 text-center">
          <p className="font-display text-2xl">Every story starts with a title.</p>
          <p className="text-muted-foreground mx-auto mt-2 max-w-md">
            Give it a name and you’ll go straight to your first chapter. Everything saves
            automatically, and nothing is public until you choose to publish.
          </p>
          <Button asChild size="lg" className="mt-6">
            <Link href="/write/new">
              <PlusIcon /> Start a story
            </Link>
          </Button>
        </section>
      ) : (
        <ul className="mt-8 divide-y border-y">
          {stories.map((story) => (
            <li key={story.id} className="group relative flex items-center gap-4 py-4">
              <StoryCover
                title={story.title}
                src={story.coverUrl}
                seed={story.id}
                size="sm"
                className="w-11"
              />
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-2">
                  <Link
                    href={`/write/${story.id}`}
                    className="font-display truncate text-lg font-semibold decoration-1 underline-offset-4 group-hover:underline after:absolute after:inset-0"
                  >
                    {story.title}
                  </Link>
                  <StoryStatusBadge status={story.status} />
                </div>
                <p className="text-muted-foreground mt-0.5 text-sm">
                  {pluralize(story.chapterCount, "chapter")} · {formatCount(story.wordCount)} words
                  · edited {formatRelative(story.lastEdited)}
                </p>
              </div>
            </li>
          ))}
        </ul>
      )}

      {reading.length > 0 ? (
        <section className="mt-14" aria-labelledby="reading-heading">
          <h2 id="reading-heading" className="font-display text-2xl font-semibold">
            Continue reading
          </h2>
          <ul className="mt-4 grid gap-3 sm:grid-cols-2">
            {reading.map((story) => (
              <li key={story.id}>
                <Link
                  href={`${story.href}/${story.progress.position}`}
                  className="hover:bg-muted flex gap-3 rounded-md border p-3"
                >
                  <StoryCover
                    title={story.title}
                    src={story.coverUrl}
                    seed={story.id}
                    size="sm"
                    className="w-10"
                  />
                  <span className="min-w-0">
                    <span className="block truncate font-medium">{story.title}</span>
                    <span className="text-muted-foreground block truncate text-sm">
                      {story.progress.title}
                    </span>
                    <span className="bg-muted mt-2 block h-1 w-32 overflow-hidden rounded-full">
                      <span
                        className="bg-accent block h-full"
                        style={{ width: `${Math.round(story.progress.percent * 100)}%` }}
                      />
                    </span>
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        </section>
      ) : null}
    </div>
  );
}
