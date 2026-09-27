import type { Metadata } from "next";
import Link from "next/link";
import { StoryList } from "@/components/story/story-card";
import { Button } from "@/components/ui/button";
import { languageName } from "@/lib/languages";
import { cn } from "@/lib/utils";
import {
  availableLanguages,
  genresWithCounts,
  listStories,
  popularTags,
} from "@/server/services/discovery";

export const metadata: Metadata = { title: "Explore" };
export const dynamic = "force-dynamic";

type Params = { sort?: string; genre?: string; language?: string; tag?: string; page?: string };

function hrefWith(current: Params, changes: Partial<Params>): string {
  const next = { ...current, ...changes };
  if (!("page" in changes)) delete next.page;
  const query = new URLSearchParams(
    Object.entries(next).filter((entry): entry is [string, string] => Boolean(entry[1])),
  );
  const qs = query.toString();
  return qs ? `/explore?${qs}` : "/explore";
}

export default async function ExplorePage(props: PageProps<"/explore">) {
  const raw = await props.searchParams;
  const params: Params = Object.fromEntries(
    ["sort", "genre", "language", "tag", "page"].map((k) => [
      k,
      typeof raw[k] === "string" ? (raw[k] as string) : undefined,
    ]),
  );
  const [result, genres, languages, tags] = await Promise.all([
    listStories(params),
    genresWithCounts(),
    availableLanguages(),
    popularTags(16),
  ]);
  const sort = params.sort === "popular" ? "popular" : "latest";
  const activeGenre = genres.find((g) => g.slug === params.genre);
  const heading = [
    activeGenre?.name,
    params.language ? languageName(params.language) : null,
    params.tag ? `#${params.tag}` : null,
  ]
    .filter(Boolean)
    .join(" · ");

  return (
    <div className="mx-auto max-w-6xl px-4 py-10 sm:px-6">
      <header className="flex flex-wrap items-end justify-between gap-4 border-b pb-6">
        <div>
          <h1 className="font-display text-4xl font-semibold">{heading || "Explore"}</h1>
          <p className="text-muted-foreground mt-2">
            {sort === "popular"
              ? "Loved by readers over the last 30 days."
              : "Newest stories first."}
          </p>
        </div>
        <div role="tablist" aria-label="Sort" className="bg-muted flex rounded-md p-1 text-sm">
          {(["latest", "popular"] as const).map((value) => (
            <Link
              key={value}
              role="tab"
              aria-selected={sort === value}
              href={hrefWith(params, { sort: value === "latest" ? undefined : value })}
              className={cn(
                "text-muted-foreground rounded-sm px-3 py-1 capitalize",
                sort === value && "bg-surface text-foreground shadow-sm",
              )}
            >
              {value}
            </Link>
          ))}
        </div>
      </header>

      <div className="mt-8 grid gap-10 lg:grid-cols-[220px_1fr]">
        <aside className="space-y-8 text-sm" aria-label="Filters">
          <FilterGroup title="Genre">
            <FilterLink href={hrefWith(params, { genre: undefined })} active={!params.genre}>
              All genres
            </FilterLink>
            {genres.map((g) => (
              <FilterLink
                key={g.slug}
                href={hrefWith(params, { genre: g.slug })}
                active={params.genre === g.slug}
                count={g.stories}
              >
                {g.name}
              </FilterLink>
            ))}
          </FilterGroup>
          {languages.length > 0 ? (
            <FilterGroup title="Language">
              <FilterLink
                href={hrefWith(params, { language: undefined })}
                active={!params.language}
              >
                Any language
              </FilterLink>
              {languages.map((l) => (
                <FilterLink
                  key={l.code}
                  href={hrefWith(params, { language: l.code })}
                  active={params.language === l.code}
                  count={l.stories}
                >
                  {languageName(l.code)}
                </FilterLink>
              ))}
            </FilterGroup>
          ) : null}
          {tags.length > 0 ? (
            <div>
              <h2 className="text-muted-foreground mb-2 font-medium">Tags</h2>
              <div className="flex flex-wrap gap-1.5">
                {tags.map((t) => (
                  <Link
                    key={t.name}
                    href={hrefWith(params, { tag: params.tag === t.name ? undefined : t.name })}
                    aria-current={params.tag === t.name ? "true" : undefined}
                    className={cn(
                      "text-muted-foreground hover:text-foreground rounded-sm border px-2 py-0.5 text-[13px]",
                      params.tag === t.name && "border-accent bg-accent-soft text-accent",
                    )}
                  >
                    #{t.name}
                  </Link>
                ))}
              </div>
            </div>
          ) : null}
        </aside>

        <section aria-label="Stories">
          <StoryList
            stories={result.stories}
            empty={
              <div className="space-y-3">
                <p className="font-display text-foreground text-xl">Nothing here yet.</p>
                <p>Try another genre or language — or write the story you wish existed.</p>
              </div>
            }
          />
          {(result.page > 1 || result.hasMore) && (
            <nav aria-label="Pagination" className="mt-6 flex justify-between border-t pt-6">
              {result.page > 1 ? (
                <Button asChild variant="outline">
                  <Link href={hrefWith(params, { page: String(result.page - 1) })}>← Newer</Link>
                </Button>
              ) : (
                <span />
              )}
              {result.hasMore ? (
                <Button asChild variant="outline">
                  <Link href={hrefWith(params, { page: String(result.page + 1) })}>
                    More stories →
                  </Link>
                </Button>
              ) : null}
            </nav>
          )}
        </section>
      </div>
    </div>
  );
}

function FilterGroup({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div>
      <h2 className="text-muted-foreground mb-2 font-medium">{title}</h2>
      <ul className="flex flex-wrap gap-1.5 lg:flex-col lg:gap-0.5">{children}</ul>
    </div>
  );
}

function FilterLink({
  href,
  active,
  count,
  children,
}: {
  href: string;
  active: boolean;
  count?: number;
  children: React.ReactNode;
}) {
  return (
    <li>
      <Link
        href={href}
        aria-current={active ? "true" : undefined}
        className={cn(
          "text-muted-foreground hover:text-foreground flex items-baseline justify-between gap-2 rounded-md border px-2.5 py-1 lg:border-0 lg:px-2",
          active && "border-foreground bg-muted text-foreground font-medium",
        )}
      >
        <span>{children}</span>
        {count ? (
          <span className="text-subtle-foreground text-xs tabular-nums">{count}</span>
        ) : null}
      </Link>
    </li>
  );
}
