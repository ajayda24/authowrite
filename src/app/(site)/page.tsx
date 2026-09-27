import { ArrowRightIcon } from "lucide-react";
import Link from "next/link";
import { StoryList, StoryTile } from "@/components/story/story-card";
import { Button } from "@/components/ui/button";
import { getViewer } from "@/server/auth/session";
import { genresWithCounts, listStories } from "@/server/services/discovery";

export const dynamic = "force-dynamic";

export default async function HomePage() {
  const [viewer, latest, popular, genres] = await Promise.all([
    getViewer(),
    listStories({ sort: "latest" }),
    listStories({ sort: "popular" }),
    genresWithCounts(),
  ]);

  return (
    <>
      <section className="border-b">
        <div className="mx-auto grid max-w-6xl gap-10 px-4 py-16 sm:px-6 md:grid-cols-[1.25fr_1fr] md:py-24">
          <div>
            <p className="text-sm font-medium tracking-wide text-accent uppercase">Write. Publish. Discover.</p>
            <h1 className="mt-4 font-display text-4xl leading-[1.08] font-semibold text-balance sm:text-5xl md:text-[3.6rem]">
              Discover stories worth getting lost in.
            </h1>
            <p className="mt-5 max-w-xl text-lg leading-relaxed text-muted-foreground text-pretty">
              A calm, open home for fiction. Read for free, or start writing your own story in
              minutes — it stays yours, always.
            </p>
            <div className="mt-8 flex flex-wrap gap-3">
              <Button asChild size="lg">
                <Link href={viewer ? "/write/new" : "/sign-up"}>Start writing</Link>
              </Button>
              <Button asChild size="lg" variant="outline">
                <Link href="/explore">Explore stories</Link>
              </Button>
            </div>
          </div>
          <ol className="grid content-center gap-5 text-[15px] md:border-l md:pl-10" aria-label="How it works">
            {[
              ["Write", "A quiet, distraction-free editor that saves as you type."],
              ["Publish", "Share a chapter or a whole story with one click."],
              ["Discover", "Readers find, follow and bookmark the stories they love."],
            ].map(([title, body], i) => (
              <li key={title} className="flex gap-4">
                <span className="font-display text-2xl text-subtle-foreground tabular-nums">{i + 1}</span>
                <div>
                  <p className="font-medium">{title}</p>
                  <p className="mt-0.5 leading-relaxed text-muted-foreground">{body}</p>
                </div>
              </li>
            ))}
          </ol>
        </div>
      </section>

      {popular.stories.length > 0 ? (
        <section className="mx-auto max-w-6xl px-4 pt-14 sm:px-6" aria-labelledby="popular-heading">
          <SectionHeading id="popular-heading" title="Popular this month" href="/explore?sort=popular" />
          <div className="mt-6 grid grid-cols-3 gap-x-4 gap-y-8 sm:grid-cols-4 md:grid-cols-6">
            {popular.stories.slice(0, 6).map((story) => (
              <StoryTile key={story.id} story={story} />
            ))}
          </div>
        </section>
      ) : null}

      <div className="mx-auto grid max-w-6xl gap-12 px-4 pt-14 sm:px-6 lg:grid-cols-[1fr_260px]">
        <section aria-labelledby="latest-heading">
          <SectionHeading id="latest-heading" title="Fresh from writers" href="/explore" />
          <StoryList
            stories={latest.stories.slice(0, 8)}
            empty={
              <div className="space-y-3">
                <p className="font-display text-xl text-foreground">The shelves are empty — for now.</p>
                <p>Be the first to publish a story here.</p>
                <Button asChild variant="outline">
                  <Link href={viewer ? "/write/new" : "/sign-up"}>Write the first story</Link>
                </Button>
              </div>
            }
          />
        </section>
        <aside aria-labelledby="genres-heading" className="lg:pt-1">
          <h2 id="genres-heading" className="text-sm font-medium text-muted-foreground">
            Browse by genre
          </h2>
          <ul className="mt-3 flex flex-wrap gap-2 lg:flex-col lg:gap-0">
            {genres.map((genre) => (
              <li key={genre.slug}>
                <Link
                  href={`/explore?genre=${genre.slug}`}
                  className="flex items-baseline justify-between gap-3 rounded-md border px-3 py-1.5 text-sm hover:bg-muted lg:rounded-none lg:border-0 lg:border-b lg:px-0 lg:py-2.5 lg:hover:bg-transparent lg:hover:text-accent"
                >
                  <span className="font-display text-[15px]">{genre.name}</span>
                  {genre.stories > 0 ? (
                    <span className="text-xs text-subtle-foreground tabular-nums">{genre.stories}</span>
                  ) : null}
                </Link>
              </li>
            ))}
          </ul>
        </aside>
      </div>
    </>
  );
}

function SectionHeading({ id, title, href }: { id: string; title: string; href: string }) {
  return (
    <div className="flex items-baseline justify-between border-b pb-3">
      <h2 id={id} className="font-display text-2xl font-semibold">
        {title}
      </h2>
      <Link href={href} className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground">
        See all <ArrowRightIcon className="size-3.5" aria-hidden="true" />
      </Link>
    </div>
  );
}
