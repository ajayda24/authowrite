/**
 * Low-level recording of story versions. Used by publishing, restoring and
 * the "Save a version" action. Deliberately has no dependency on the other
 * services so they can all call it.
 */
import { createHash } from "node:crypto";
import { asc, eq, inArray, max, sql } from "drizzle-orm";
import type { Executor } from "@/server/db";
import {
  chapters,
  contentBlobs,
  stories,
  storyTags,
  storyVersions,
  tags,
  type VersionChapter,
  type VersionKind,
  type VersionMeta,
} from "@/server/db/schema";
import type { DocNode } from "@/lib/content/types";
import type { HistoryState } from "@/lib/history/compare";

/** Content address of a chapter document (SHA-256 of its JSON). */
export function hashContent(doc: DocNode): string {
  return createHash("sha256").update(JSON.stringify(doc)).digest("hex");
}

interface CapturedChapter extends VersionChapter {
  content: DocNode;
}

/**
 * Captures the current state of a story.
 * - `working`: everything the writer has, including drafts and unpublished edits.
 * - `published`: only what readers can see.
 */
export async function captureStory(
  exec: Executor,
  storyId: string,
  view: "working" | "published",
): Promise<{ meta: VersionMeta; chapters: CapturedChapter[] }> {
  const [[story], tagRows, chapterRows] = await Promise.all([
    exec.select().from(stories).where(eq(stories.id, storyId)).limit(1),
    exec
      .select({ name: tags.name })
      .from(storyTags)
      .innerJoin(tags, eq(tags.id, storyTags.tagId))
      .where(eq(storyTags.storyId, storyId))
      .orderBy(asc(tags.name)),
    exec
      .select()
      .from(chapters)
      .where(eq(chapters.storyId, storyId))
      .orderBy(asc(chapters.position)),
  ]);
  if (!story) throw new Error(`Story ${storyId} not found`);

  const captured: CapturedChapter[] = [];
  for (const c of chapterRows) {
    if (view === "published") {
      if (c.status !== "published" || !c.publishedContent) continue;
      captured.push({
        id: c.id,
        position: captured.length + 1,
        title: c.publishedTitle ?? c.title,
        status: "published",
        content: c.publishedContent,
        blob: hashContent(c.publishedContent),
        wordCount: c.publishedWordCount,
      });
    } else {
      captured.push({
        id: c.id,
        position: c.position,
        title: c.title,
        status: c.status,
        content: c.content,
        blob: hashContent(c.content),
        wordCount: c.wordCount,
      });
    }
  }

  return {
    meta: {
      title: story.title,
      description: story.description,
      genreSlug: story.genreSlug,
      language: story.language,
      coverKey: story.coverKey,
      tags: tagRows.map((t) => t.name),
    },
    chapters: captured,
  };
}

/** Converts a capture into the shape used for comparisons. */
export function toHistoryState(capture: {
  meta: VersionMeta;
  chapters: VersionChapter[];
}): HistoryState {
  return {
    meta: capture.meta,
    chapters: capture.chapters.map(({ id, position, title, status, blob, wordCount }) => ({
      id,
      position,
      title,
      status,
      blob,
      wordCount,
    })),
  };
}

/**
 * Records a new version of a story. Call inside the same transaction as the
 * change it describes, so history and content can never disagree.
 */
export async function recordVersion(
  exec: Executor,
  input: { storyId: string; kind: VersionKind; message?: string; authorId: string | null },
) {
  // Serialize version numbering per story.
  await exec.execute(
    sql`select 1 from ${stories} where ${stories.id} = ${input.storyId} for update`,
  );

  const capture = await captureStory(
    exec,
    input.storyId,
    input.kind === "published" ? "published" : "working",
  );

  const blobs = new Map(capture.chapters.map((c) => [c.blob, c.content]));
  if (blobs.size > 0) {
    await exec
      .insert(contentBlobs)
      .values([...blobs].map(([hash, content]) => ({ hash, content })))
      .onConflictDoNothing();
  }

  const [{ last }] = await exec
    .select({ last: max(storyVersions.number) })
    .from(storyVersions)
    .where(eq(storyVersions.storyId, input.storyId));

  const versionChapters: VersionChapter[] = capture.chapters.map(
    ({ id, position, title, status, blob, wordCount }) => ({
      id,
      position,
      title,
      status,
      blob,
      wordCount,
    }),
  );
  const [version] = await exec
    .insert(storyVersions)
    .values({
      storyId: input.storyId,
      number: (last ?? 0) + 1,
      kind: input.kind,
      message: (input.message ?? "").trim().slice(0, 500),
      authorId: input.authorId,
      meta: capture.meta,
      chapters: versionChapters,
      wordCount: versionChapters.reduce((sum, c) => sum + c.wordCount, 0),
      chapterCount: versionChapters.length,
    })
    .returning();
  return version;
}

/** Loads chapter documents for the given content hashes. */
export async function loadBlobs(exec: Executor, hashes: string[]): Promise<Map<string, DocNode>> {
  const unique = [...new Set(hashes)];
  if (unique.length === 0) return new Map();
  const rows = await exec
    .select({ hash: contentBlobs.hash, content: contentBlobs.content })
    .from(contentBlobs)
    .where(inArray(contentBlobs.hash, unique));
  return new Map(rows.map((r) => [r.hash, r.content]));
}
