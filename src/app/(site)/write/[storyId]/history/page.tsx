import type { Metadata } from "next";
import Link from "next/link";
import { RestoreVersionButton, SaveVersionButton } from "@/components/history/history-actions";
import {
  VersionKindBadge,
  defaultVersionMessage,
  wordDelta,
} from "@/components/history/version-kind";
import { Avatar } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { formatCount, formatRelative, pluralize } from "@/lib/utils";
import { getViewer } from "@/server/auth/session";
import { listVersions } from "@/server/services/history";
import { loadOr404 } from "@/server/services/load";

export const metadata: Metadata = { title: "Story history" };

export default async function StoryHistoryPage(props: PageProps<"/write/[storyId]/history">) {
  const { storyId } = await props.params;
  const viewer = await getViewer();
  const versions = await loadOr404(() => listVersions(viewer, storyId));

  return (
    <div>
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div className="max-w-xl">
          <h2 className="font-display text-xl font-semibold">Story history</h2>
          <p className="text-muted-foreground mt-1 text-sm leading-relaxed">
            Every time you publish or save a version, a copy of your story is kept here. Look back,
            compare, or restore any version. Nothing is ever lost.
          </p>
        </div>
        <SaveVersionButton storyId={storyId} />
      </div>

      {versions.length === 0 ? (
        <div className="mt-8 rounded-lg border border-dashed px-6 py-12 text-center">
          <p className="font-display text-lg">No versions yet</p>
          <p className="text-muted-foreground mx-auto mt-2 max-w-md text-sm">
            A version is saved automatically each time you publish. You can also save one yourself,
            for example before a big rewrite.
          </p>
        </div>
      ) : (
        <ol className="mt-8 border-l pl-6" aria-label="Versions, newest first">
          {versions.map((version, index) => {
            const previous = versions[index + 1];
            return (
              <li key={version.id} className="relative pb-8 last:pb-0">
                <span
                  aria-hidden="true"
                  className={
                    version.kind === "published"
                      ? "bg-success ring-background absolute top-1.5 -left-[31px] size-2.5 rounded-full ring-4"
                      : "border-border-strong bg-background ring-background absolute top-1.5 -left-[31px] size-2.5 rounded-full border-2 ring-4"
                  }
                />
                <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                  <div className="min-w-0">
                    <p className="flex flex-wrap items-center gap-2">
                      <Link
                        href={`/write/${storyId}/history/${version.number}`}
                        className="font-display text-lg font-semibold decoration-1 underline-offset-4 hover:underline"
                      >
                        Version {version.number}
                      </Link>
                      <VersionKindBadge kind={version.kind} />
                    </p>
                    <p className="mt-1 leading-relaxed">
                      {version.message || (
                        <span className="text-muted-foreground">
                          {defaultVersionMessage(version.kind)}
                        </span>
                      )}
                    </p>
                    <p className="text-muted-foreground mt-1.5 flex flex-wrap items-center gap-x-2 text-[13px]">
                      {version.author ? (
                        <span className="inline-flex items-center gap-1.5">
                          <Avatar name={version.author.name} src={version.author.image} size={18} />
                          {version.author.name}
                        </span>
                      ) : null}
                      <time
                        dateTime={version.createdAt.toISOString()}
                        title={version.createdAt.toLocaleString("en")}
                      >
                        {formatRelative(version.createdAt)}
                      </time>
                      <span>· {pluralize(version.chapterCount, "chapter")}</span>
                      <span>· {formatCount(version.wordCount)} words</span>
                      {previous ? (
                        <span>· {wordDelta(previous.wordCount, version.wordCount)}</span>
                      ) : null}
                    </p>
                  </div>
                  <div className="flex shrink-0 flex-wrap gap-1.5">
                    <Button asChild variant="ghost" size="sm">
                      <Link href={`/write/${storyId}/history/${version.number}`}>View</Link>
                    </Button>
                    <Button asChild variant="ghost" size="sm">
                      <Link
                        href={`/write/${storyId}/history/compare?from=${version.number}&to=current`}
                      >
                        Compare
                      </Link>
                    </Button>
                    <RestoreVersionButton storyId={storyId} number={version.number} />
                  </div>
                </div>
              </li>
            );
          })}
        </ol>
      )}
    </div>
  );
}
