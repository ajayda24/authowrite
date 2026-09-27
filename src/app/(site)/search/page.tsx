import { SearchIcon } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { StoryList } from "@/components/story/story-card";
import { Avatar } from "@/components/ui/avatar";
import { Input } from "@/components/ui/input";
import { searchAuthors, searchStories, searchTags } from "@/server/services/discovery";

export const metadata: Metadata = { title: "Search" };
export const dynamic = "force-dynamic";

export default async function SearchPage(props: PageProps<"/search">) {
  const { q } = await props.searchParams;
  const query = typeof q === "string" ? q.trim() : "";
  const [stories, authors, tags] = query
    ? await Promise.all([searchStories(query), searchAuthors(query), searchTags(query)])
    : [[], [], []];
  const nothing = query && stories.length === 0 && authors.length === 0 && tags.length === 0;

  return (
    <div className="mx-auto max-w-3xl px-4 py-10 sm:px-6">
      <h1 className="font-display text-4xl font-semibold">Search</h1>
      <form action="/search" role="search" className="relative mt-6">
        <label htmlFor="q" className="sr-only">Search stories, authors and tags</label>
        <SearchIcon className="pointer-events-none absolute top-1/2 left-3.5 size-4 -translate-y-1/2 text-subtle-foreground" aria-hidden="true" />
        <Input id="q" name="q" type="search" defaultValue={query} placeholder="Titles, authors, tags…" className="h-12 pl-10 text-base" autoFocus />
      </form>

      {nothing ? (
        <p className="py-16 text-center text-muted-foreground">
          Nothing matched “{query}”. Try a different word, or <Link className="text-accent underline" href="/explore">browse all stories</Link>.
        </p>
      ) : null}

      {authors.length > 0 && (
        <section className="mt-10" aria-labelledby="authors-heading">
          <h2 id="authors-heading" className="text-sm font-medium text-muted-foreground">Authors</h2>
          <ul className="mt-3 grid gap-2 sm:grid-cols-2">
            {authors.map((a) => (
              <li key={a.id}>
                <Link href={`/${a.username}`} className="flex items-center gap-3 rounded-md border px-3 py-2.5 hover:bg-muted">
                  <Avatar name={a.name} src={a.image} size={36} />
                  <span className="min-w-0">
                    <span className="block truncate font-medium">{a.name}</span>
                    <span className="block truncate text-sm text-muted-foreground">@{a.username}</span>
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        </section>
      )}

      {tags.length > 0 && (
        <section className="mt-10" aria-labelledby="tags-heading">
          <h2 id="tags-heading" className="text-sm font-medium text-muted-foreground">Tags</h2>
          <div className="mt-3 flex flex-wrap gap-2">
            {tags.map((t) => (
              <Link key={t.name} href={`/explore?tag=${encodeURIComponent(t.name)}`} className="rounded-sm border px-2 py-0.5 text-sm hover:bg-muted">
                #{t.name}
              </Link>
            ))}
          </div>
        </section>
      )}

      {stories.length > 0 && (
        <section className="mt-10" aria-labelledby="stories-heading">
          <h2 id="stories-heading" className="text-sm font-medium text-muted-foreground">Stories</h2>
          <StoryList stories={stories} />
        </section>
      )}
    </div>
  );
}
