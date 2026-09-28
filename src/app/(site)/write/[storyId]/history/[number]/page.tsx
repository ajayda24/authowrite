import { ArrowLeftIcon } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { RestoreChapterButton, RestoreVersionButton } from "@/components/history/history-actions";
import { VersionKindBadge, defaultVersionMessage } from "@/components/history/version-kind";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { languageName } from "@/lib/languages";
import { formatCount, formatDate } from "@/lib/utils";
import { getViewer } from "@/server/auth/session";
import { getVersion, parseVersionNumber } from "@/server/services/history";
import { loadOr404 } from "@/server/services/load";

export async function generateMetadata(
  props: PageProps<"/write/[storyId]/history/[number]">,
): Promise<Metadata> {
  const { number } = await props.params;
  return { title: `Version ${number}` };
}

export default async function VersionPage(props: PageProps<"/write/[storyId]/history/[number]">) {
  const { storyId, number: raw } = await props.params;
  const number = parseVersionNumber(raw);
  if (!number) notFound();
  const viewer = await getViewer();
  const { version, meta, chapters } = await loadOr404(() => getVersion(viewer, storyId, number));

  return (
    <div className="space-y-10">
      <div>
        <Link
          href={`/write/${storyId}/history`}
          className="text-muted-foreground hover:text-foreground inline-flex items-center gap-1 text-sm"
        >
          <ArrowLeftIcon className="size-3.5" aria-hidden="true" /> Story history
        </Link>
        <div className="mt-3 flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <h2 className="font-display flex flex-wrap items-center gap-2 text-2xl font-semibold">
              Version {version.number} <VersionKindBadge kind={version.kind} />
            </h2>
            <p className="mt-1">{version.message || defaultVersionMessage(version.kind)}</p>
            <p className="text-muted-foreground mt-1 text-sm">
              {version.author ? `${version.author.name} · ` : ""}
              {formatDate(version.createdAt)} ·{" "}
              {version.createdAt.toLocaleTimeString("en", { hour: "numeric", minute: "2-digit" })} ·{" "}
              {formatCount(version.wordCount)} words
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <Button asChild variant="outline" size="sm">
              <Link href={`/write/${storyId}/history/compare?from=${version.number}&to=current`}>
                Compare with current draft
              </Link>
            </Button>
            {version.number > 1 ? (
              <Button asChild variant="ghost" size="sm">
                <Link
                  href={`/write/${storyId}/history/compare?from=${version.number - 1}&to=${version.number}`}
                >
                  What changed in this version
                </Link>
              </Button>
            ) : null}
            <RestoreVersionButton storyId={storyId} number={version.number} />
          </div>
        </div>
      </div>

      <section aria-labelledby="details-heading" className="rounded-md border p-5">
        <h3 id="details-heading" className="text-muted-foreground text-sm font-medium">
          Story details in this version
        </h3>
        <dl className="mt-3 grid gap-x-8 gap-y-3 text-sm sm:grid-cols-[auto_1fr]">
          <dt className="text-muted-foreground">Title</dt>
          <dd className="font-display text-base">{meta.title}</dd>
          <dt className="text-muted-foreground">Description</dt>
          <dd className="whitespace-pre-line">{meta.description || "—"}</dd>
          <dt className="text-muted-foreground">Genre</dt>
          <dd>{meta.genreName ?? "—"}</dd>
          <dt className="text-muted-foreground">Language</dt>
          <dd>{languageName(meta.language)}</dd>
          <dt className="text-muted-foreground">Tags</dt>
          <dd>{meta.tags.length ? meta.tags.map((t) => `#${t}`).join(" ") : "—"}</dd>
        </dl>
      </section>

      <section aria-labelledby="chapters-heading">
        <h3 id="chapters-heading" className="font-display text-xl font-semibold">
          Chapters in this version
        </h3>
        {chapters.length === 0 ? (
          <p className="text-muted-foreground mt-3 text-sm">This version has no chapters.</p>
        ) : (
          <div className="mt-4 divide-y rounded-md border">
            {chapters.map((chapter) => (
              <details key={chapter.id} className="group">
                <summary className="hover:bg-muted/50 flex cursor-pointer list-none items-center gap-3 px-4 py-3">
                  <span className="font-display text-subtle-foreground w-6 text-right text-sm tabular-nums">
                    {chapter.position}
                  </span>
                  <span className="min-w-0 flex-1 truncate font-medium">
                    {chapter.title || `Chapter ${chapter.position}`}
                  </span>
                  <Badge variant={chapter.status === "published" ? "published" : "draft"}>
                    {chapter.status === "published" ? "Published" : "Draft"}
                  </Badge>
                  <span className="text-muted-foreground hidden text-[13px] sm:inline">
                    {formatCount(chapter.wordCount)} words
                  </span>
                  <span
                    aria-hidden="true"
                    className="text-muted-foreground transition-transform group-open:rotate-90"
                  >
                    ›
                  </span>
                </summary>
                <div className="bg-surface border-t px-5 py-6">
                  <div className="mb-4 flex justify-end">
                    <RestoreChapterButton
                      storyId={storyId}
                      number={version.number}
                      chapterId={chapter.id}
                      title={chapter.title || `Chapter ${chapter.position}`}
                    />
                  </div>
                  <div
                    lang={meta.language}
                    className="story-prose mx-auto max-w-[40rem]"
                    dangerouslySetInnerHTML={{ __html: chapter.html }}
                  />
                </div>
              </details>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
