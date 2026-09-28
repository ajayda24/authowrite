import { ArrowLeftIcon } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { wordDelta } from "@/components/history/version-kind";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Label, Select } from "@/components/ui/input";
import type { ChapterChange, MetaChange } from "@/lib/history/compare";
import { languageName } from "@/lib/languages";
import { formatCount, pluralize } from "@/lib/utils";
import { getViewer } from "@/server/auth/session";
import { compareVersions, listVersions, parseVersionNumber } from "@/server/services/history";
import { loadOr404 } from "@/server/services/load";
import { listGenres } from "@/server/services/stories";

export const metadata: Metadata = { title: "Compare versions" };

const FIELD_LABELS: Record<MetaChange["field"], string> = {
  title: "Title",
  description: "Description",
  genre: "Genre",
  language: "Language",
  cover: "Cover",
  tags: "Tags",
};

function ChangeBadge({ change }: { change: ChapterChange }) {
  switch (change.change) {
    case "added":
      return <Badge variant="published">Added</Badge>;
    case "removed":
      return (
        <Badge className="border-destructive/30 bg-destructive/10 text-destructive">Removed</Badge>
      );
    case "edited":
      return <Badge variant="accent">Text changed</Badge>;
    default:
      return <Badge variant="draft">No text changes</Badge>;
  }
}

export default async function ComparePage(props: PageProps<"/write/[storyId]/history/compare">) {
  const { storyId } = await props.params;
  const query = await props.searchParams;
  const viewer = await getViewer();
  const versions = await loadOr404(() => listVersions(viewer, storyId));

  const latest = versions[0]?.number ?? null;
  const from = parseVersionNumber(query.from) ?? (latest ? Math.max(1, latest - 1) : null);
  const to: number | "current" =
    query.to === "current" || query.to === undefined
      ? "current"
      : (parseVersionNumber(query.to) ?? "current");

  const [comparison, genres] = await Promise.all([
    from ? loadOr404(() => compareVersions(viewer, storyId, from, to)) : null,
    listGenres(),
  ]);
  const genreName = (slug: string) => genres.find((g) => g.slug === slug)?.name ?? (slug || "None");
  const describe = (m: MetaChange, value: string) => {
    if (m.field === "genre") return genreName(value);
    if (m.field === "language") return languageName(value);
    if (m.field === "cover") return value ? "Custom cover" : "Generated cover";
    return value || "(empty)";
  };
  const toLabel = to === "current" ? "your current draft" : `version ${to}`;

  const counts = comparison
    ? {
        edited: comparison.chapters.filter((c) => c.change === "edited").length,
        added: comparison.chapters.filter((c) => c.change === "added").length,
        removed: comparison.chapters.filter((c) => c.change === "removed").length,
      }
    : null;

  return (
    <div className="space-y-8">
      <div>
        <Link
          href={`/write/${storyId}/history`}
          className="text-muted-foreground hover:text-foreground inline-flex items-center gap-1 text-sm"
        >
          <ArrowLeftIcon className="size-3.5" aria-hidden="true" /> Story history
        </Link>
        <h2 className="font-display mt-3 text-2xl font-semibold">Compare versions</h2>
      </div>

      {versions.length === 0 ? (
        <p className="text-muted-foreground">
          There are no saved versions yet. Publish or save a version first.
        </p>
      ) : (
        <form
          className="flex flex-col gap-3 rounded-md border p-4 sm:flex-row sm:items-end"
          method="get"
        >
          <div className="flex-1 space-y-1.5">
            <Label htmlFor="from">From</Label>
            <Select id="from" name="from" defaultValue={from ?? undefined}>
              {versions.map((v) => (
                <option key={v.number} value={v.number}>
                  Version {v.number}
                  {v.message ? ` — ${v.message.slice(0, 50)}` : ""}
                </option>
              ))}
            </Select>
          </div>
          <div className="flex-1 space-y-1.5">
            <Label htmlFor="to">To</Label>
            <Select id="to" name="to" defaultValue={String(to)}>
              <option value="current">Current draft</option>
              {versions.map((v) => (
                <option key={v.number} value={v.number}>
                  Version {v.number}
                  {v.message ? ` — ${v.message.slice(0, 50)}` : ""}
                </option>
              ))}
            </Select>
          </div>
          <Button type="submit" variant="outline">
            Compare
          </Button>
        </form>
      )}

      {comparison && counts ? (
        comparison.identical ? (
          <p className="bg-muted rounded-md px-4 py-3">
            Version {from} and {toLabel} are identical.
          </p>
        ) : (
          <>
            <p className="text-lg leading-relaxed">
              From version {from} to {toLabel}:{" "}
              {[
                counts.edited ? `${pluralize(counts.edited, "chapter")} changed` : null,
                counts.added ? `${pluralize(counts.added, "chapter")} added` : null,
                counts.removed ? `${pluralize(counts.removed, "chapter")} removed` : null,
                comparison.meta.length ? "story details updated" : null,
              ]
                .filter(Boolean)
                .join(", ") || "chapters renamed or reordered"}
              .{" "}
              <span className="text-muted-foreground">
                ({formatCount(comparison.wordsBefore)} → {formatCount(comparison.wordsAfter)} words,{" "}
                {wordDelta(comparison.wordsBefore, comparison.wordsAfter)})
              </span>
            </p>

            {comparison.meta.length > 0 ? (
              <section aria-labelledby="details-changes">
                <h3 id="details-changes" className="text-muted-foreground text-sm font-medium">
                  Story details
                </h3>
                <ul className="mt-2 divide-y rounded-md border">
                  {comparison.meta.map((m) => (
                    <li
                      key={m.field}
                      className="grid gap-1 px-4 py-3 text-sm sm:grid-cols-[120px_1fr]"
                    >
                      <span className="font-medium">{FIELD_LABELS[m.field]}</span>
                      {m.field === "tags" ? (
                        <span>
                          {m.added?.map((t) => (
                            <span key={t} className="text-success mr-2">
                              +#{t}
                            </span>
                          ))}
                          {m.removed?.map((t) => (
                            <span key={t} className="text-destructive mr-2 line-through">
                              #{t}
                            </span>
                          ))}
                        </span>
                      ) : m.field === "description" ? (
                        <span className="text-muted-foreground">Description was rewritten.</span>
                      ) : (
                        <span>
                          <span className="text-muted-foreground line-through">
                            {describe(m, m.before)}
                          </span>
                          <span aria-hidden="true" className="text-subtle-foreground mx-2">
                            →
                          </span>
                          <span className="sr-only"> changed to </span>
                          {describe(m, m.after)}
                        </span>
                      )}
                    </li>
                  ))}
                </ul>
              </section>
            ) : null}

            <section aria-labelledby="chapter-changes">
              <h3 id="chapter-changes" className="text-muted-foreground text-sm font-medium">
                Chapters
              </h3>
              <ul className="mt-2 divide-y rounded-md border">
                {comparison.chapters.map((c) => (
                  <li key={c.id} className="flex flex-wrap items-center gap-x-3 gap-y-1 px-4 py-3">
                    <span className="min-w-0 flex-1">
                      <span
                        className={
                          c.change === "removed" ? "font-medium line-through" : "font-medium"
                        }
                      >
                        {c.title || `Chapter ${c.position}`}
                      </span>
                      {c.renamed ? (
                        <span className="text-muted-foreground block text-[13px]">
                          Renamed from “{c.previousTitle}”
                        </span>
                      ) : null}
                      {c.moved && c.previousPosition ? (
                        <span className="text-muted-foreground block text-[13px]">
                          Moved from position {c.previousPosition} to {c.position}
                        </span>
                      ) : null}
                    </span>
                    <ChangeBadge change={c} />
                    <span className="text-muted-foreground w-28 text-right text-[13px] tabular-nums">
                      {c.change === "unchanged"
                        ? `${formatCount(c.wordsAfter)} words`
                        : wordDelta(c.wordsBefore, c.wordsAfter)}
                    </span>
                  </li>
                ))}
              </ul>
            </section>
          </>
        )
      ) : null}
    </div>
  );
}
