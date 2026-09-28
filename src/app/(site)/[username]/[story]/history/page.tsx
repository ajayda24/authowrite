import { ArrowLeftIcon } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { formatCount, formatDate, pluralize } from "@/lib/utils";
import { decodeParam } from "@/lib/params";
import { getViewer } from "@/server/auth/session";
import { listPublishedVersions } from "@/server/services/history";

async function load(props: PageProps<"/[username]/[story]/history">) {
  const params = await props.params;
  const viewer = await getViewer();
  return listPublishedVersions(viewer, decodeParam(params.username), decodeParam(params.story));
}

export async function generateMetadata(
  props: PageProps<"/[username]/[story]/history">,
): Promise<Metadata> {
  const data = await load(props);
  return { title: data ? `History of ${data.story.title}` : "Story not found" };
}

/** Public, read-only list of a story's published versions. */
export default async function PublicHistoryPage(props: PageProps<"/[username]/[story]/history">) {
  const data = await load(props);
  if (!data) notFound();
  const { story, versions, isOwner } = data;
  const base = `/${story.authorUsername}/${story.slug}`;

  return (
    <div className="mx-auto max-w-2xl px-4 py-12 sm:px-6">
      <Link
        href={base}
        className="text-muted-foreground hover:text-foreground inline-flex items-center gap-1 text-sm"
      >
        <ArrowLeftIcon className="size-3.5" aria-hidden="true" /> {story.title}
      </Link>
      <h1 className="font-display mt-3 text-3xl font-semibold">Story history</h1>
      <p className="text-muted-foreground mt-2 leading-relaxed">
        Every published update to <em>{story.title}</em> by {story.authorName}, newest first.
      </p>
      {isOwner ? (
        <p className="mt-3 text-sm">
          <Link
            href={`/write/${story.id}/history`}
            className="text-accent underline underline-offset-4"
          >
            See your full history, including drafts and saved versions →
          </Link>
        </p>
      ) : null}

      {versions.length === 0 ? (
        <p className="text-muted-foreground mt-10">No published updates yet.</p>
      ) : (
        <ol className="mt-10 border-l pl-6">
          {versions.map((v, i) => (
            <li key={v.number} className="relative pb-8 last:pb-0">
              <span
                aria-hidden="true"
                className="bg-success ring-background absolute top-1.5 -left-[31px] size-2.5 rounded-full ring-4"
              />
              <p className="text-muted-foreground text-sm">
                <time dateTime={v.createdAt.toISOString()}>{formatDate(v.createdAt)}</time> ·
                Version {v.number}
                {i === versions.length - 1 ? " · First published" : ""}
              </p>
              <p className="font-display mt-1 text-lg">{v.message || "Published an update"}</p>
              <p className="text-subtle-foreground mt-1 text-[13px]">
                {[
                  v.added && i !== versions.length - 1
                    ? `${pluralize(v.added, "chapter")} added`
                    : null,
                  v.edited ? `${pluralize(v.edited, "chapter")} revised` : null,
                  v.removed ? `${pluralize(v.removed, "chapter")} removed` : null,
                ]
                  .filter(Boolean)
                  .join(" · ") || `${pluralize(v.chapterCount, "chapter")}`}
                {` · ${formatCount(v.wordCount)} words`}
              </p>
            </li>
          ))}
        </ol>
      )}
    </div>
  );
}
