/**
 * Story history: listing, viewing, comparing, saving and restoring versions.
 *
 * Writers see this as "Story History". Readers can see the list of published
 * versions. Restoring never destroys anything: the current state is always
 * saved as an automatic version first.
 */
import { and, desc, eq, inArray, max, sql } from "drizzle-orm";
import { z } from "zod";
import { db, type Transaction as Tx } from "@/server/db";
import {
  chapters,
  genres,
  stories,
  storyVersions,
  users,
  type VersionChapter,
  type VersionMeta,
} from "@/server/db/schema";
import { renderDocToHtml } from "@/lib/content/render";
import { sanitizeDoc } from "@/lib/content/sanitize";
import { countWords, docToText } from "@/lib/content/text";
import { EMPTY_DOC } from "@/lib/content/types";
import { compareStates, type StoryComparison } from "@/lib/history/compare";
import { fileUrl } from "@/lib/files";
import { NotFoundError, requireActor, type Actor } from "./errors";
import { getEditableStory, setStoryTags } from "./stories";
import { captureStory, loadBlobs, recordVersion, toHistoryState } from "./versions";
import { parseInput } from "./validation";

const messageSchema = z.string().trim().max(500, "Keep the description under 500 characters.");

const versionNumberSchema = z.coerce.number().int().min(1).max(1_000_000);

async function getVersionRow(storyId: string, number: number) {
  const n = versionNumberSchema.safeParse(number);
  if (!n.success) throw new NotFoundError("Version");
  const [row] = await db
    .select()
    .from(storyVersions)
    .where(and(eq(storyVersions.storyId, storyId), eq(storyVersions.number, n.data)))
    .limit(1);
  if (!row) throw new NotFoundError("Version");
  return row;
}

// ---------------------------------------------------------------------------
// Reading history (writer)
// ---------------------------------------------------------------------------

export async function listVersions(actor: Actor, storyId: string) {
  const story = await getEditableStory(actor, storyId);
  const rows = await db
    .select({
      id: storyVersions.id,
      number: storyVersions.number,
      kind: storyVersions.kind,
      message: storyVersions.message,
      wordCount: storyVersions.wordCount,
      chapterCount: storyVersions.chapterCount,
      createdAt: storyVersions.createdAt,
      author: { name: users.name, username: users.username, image: users.image },
    })
    .from(storyVersions)
    .leftJoin(users, eq(users.id, storyVersions.authorId))
    .where(eq(storyVersions.storyId, story.id))
    .orderBy(desc(storyVersions.number));
  return rows.map((row) => ({ ...row, author: row.author?.name ? row.author : null }));
}

/** A version with the full text of each chapter, for viewing. */
export async function getVersion(actor: Actor, storyId: string, number: number) {
  const story = await getEditableStory(actor, storyId);
  const version = await getVersionRow(story.id, number);
  const blobs = await loadBlobs(
    db,
    version.chapters.map((c) => c.blob),
  );
  const [genre] = version.meta.genreSlug
    ? await db.select().from(genres).where(eq(genres.slug, version.meta.genreSlug))
    : [];
  const [author] = version.authorId
    ? await db
        .select({ name: users.name, username: users.username })
        .from(users)
        .where(eq(users.id, version.authorId))
    : [];

  return {
    version: {
      number: version.number,
      kind: version.kind,
      message: version.message,
      createdAt: version.createdAt,
      wordCount: version.wordCount,
      chapterCount: version.chapterCount,
      author: author ?? null,
    },
    meta: {
      ...version.meta,
      genreName: genre?.name ?? null,
      coverUrl: fileUrl(version.meta.coverKey),
    },
    chapters: version.chapters.map((c) => ({
      ...c,
      html: renderDocToHtml(sanitizeDoc(blobs.get(c.blob) ?? EMPTY_DOC)),
    })),
  };
}

/**
 * Compares two versions of a story. `to` may be "current" to compare with
 * the writer's latest draft.
 */
export async function compareVersions(
  actor: Actor,
  storyId: string,
  from: number,
  to: number | "current",
): Promise<StoryComparison> {
  const story = await getEditableStory(actor, storyId);
  const before = await getVersionRow(story.id, from);
  const after =
    to === "current"
      ? toHistoryState(await captureStory(db, story.id, "working"))
      : toHistoryState(await getVersionRow(story.id, to));
  return compareStates(toHistoryState(before), after);
}

// ---------------------------------------------------------------------------
// Writing history
// ---------------------------------------------------------------------------

/** "Save a version": a named snapshot of the writer's current draft. */
export async function saveVersion(actor: Actor, storyId: string, message = "") {
  const user = requireActor(actor);
  const story = await getEditableStory(user, storyId);
  const text = parseInput(messageSchema, message);
  return db.transaction((tx) =>
    recordVersion(tx, { storyId: story.id, kind: "saved", message: text, authorId: user.id }),
  );
}

async function applyChapterContent(
  tx: Tx,
  chapterId: string,
  data: { title: string; content: ReturnType<typeof sanitizeDoc> },
) {
  const text = docToText(data.content);
  await tx
    .update(chapters)
    .set({
      title: data.title,
      content: data.content,
      contentText: text,
      wordCount: countWords(text),
      // Bumping the revision makes any open editor on an older copy stop
      // and offer to reload, instead of overwriting the restored text.
      revision: sql`${chapters.revision} + 1`,
    })
    .where(eq(chapters.id, chapterId));
}

async function genreExists(tx: Tx, slug: string | null): Promise<boolean> {
  if (!slug) return false;
  const rows = await tx.select({ slug: genres.slug }).from(genres).where(eq(genres.slug, slug));
  return rows.length > 0;
}

/**
 * Restores the whole story (details and chapters) to an earlier version.
 * The current draft is saved first as an automatic version, so this can
 * always be undone. What readers see only changes when the writer publishes.
 */
export async function restoreVersion(actor: Actor, storyId: string, number: number) {
  const user = requireActor(actor);
  const story = await getEditableStory(user, storyId);
  const version = await getVersionRow(story.id, number);
  const blobs = await loadBlobs(
    db,
    version.chapters.map((c) => c.blob),
  );

  return db.transaction(async (tx) => {
    const backup = await recordVersion(tx, {
      storyId: story.id,
      kind: "automatic",
      message: `Before restoring version ${version.number}`,
      authorId: user.id,
    });

    const meta: VersionMeta = version.meta;
    await tx
      .update(stories)
      .set({
        title: meta.title,
        description: meta.description,
        genreSlug: (await genreExists(tx, meta.genreSlug)) ? meta.genreSlug : null,
        language: meta.language,
        coverKey: meta.coverKey,
        updatedAt: new Date(),
      })
      .where(eq(stories.id, story.id));
    await setStoryTags(tx, story.id, meta.tags);

    const existing = await tx
      .select({ id: chapters.id })
      .from(chapters)
      .where(eq(chapters.storyId, story.id));
    const existingIds = new Set(existing.map((c) => c.id));
    const keepIds = new Set(version.chapters.map((c) => c.id));

    const toDelete = [...existingIds].filter((id) => !keepIds.has(id));
    if (toDelete.length > 0) await tx.delete(chapters).where(inArray(chapters.id, toDelete));

    for (const c of version.chapters) {
      const content = sanitizeDoc(blobs.get(c.blob) ?? EMPTY_DOC);
      if (existingIds.has(c.id)) {
        await applyChapterContent(tx, c.id, { title: c.title, content });
        await tx.update(chapters).set({ position: c.position }).where(eq(chapters.id, c.id));
      } else {
        const text = docToText(content);
        await tx.insert(chapters).values({
          id: c.id,
          storyId: story.id,
          position: c.position,
          title: c.title,
          content,
          contentText: text,
          wordCount: countWords(text),
          status: "draft",
        });
      }
    }

    return { backupNumber: backup.number };
  });
}

/** Restores a single chapter's title and text from an earlier version. */
export async function restoreChapter(
  actor: Actor,
  storyId: string,
  number: number,
  chapterId: string,
) {
  const user = requireActor(actor);
  const story = await getEditableStory(user, storyId);
  const version = await getVersionRow(story.id, number);
  const entry: VersionChapter | undefined = version.chapters.find((c) => c.id === chapterId);
  if (!entry) throw new NotFoundError("Chapter");
  const blobs = await loadBlobs(db, [entry.blob]);
  const content = sanitizeDoc(blobs.get(entry.blob) ?? EMPTY_DOC);

  return db.transaction(async (tx) => {
    const backup = await recordVersion(tx, {
      storyId: story.id,
      kind: "automatic",
      message: `Before restoring “${entry.title}” from version ${version.number}`,
      authorId: user.id,
    });

    const [current] = await tx
      .select({ id: chapters.id })
      .from(chapters)
      .where(and(eq(chapters.id, entry.id), eq(chapters.storyId, story.id)));

    if (current) {
      await applyChapterContent(tx, entry.id, { title: entry.title, content });
    } else {
      // The chapter was deleted since: bring it back at the end, as a draft.
      const [{ last }] = await tx
        .select({ last: max(chapters.position) })
        .from(chapters)
        .where(eq(chapters.storyId, story.id));
      const text = docToText(content);
      await tx.insert(chapters).values({
        id: entry.id,
        storyId: story.id,
        position: (last ?? 0) + 1,
        title: entry.title,
        content,
        contentText: text,
        wordCount: countWords(text),
        status: "draft",
      });
    }
    await tx.update(stories).set({ updatedAt: new Date() }).where(eq(stories.id, story.id));
    return { chapterId: entry.id, backupNumber: backup.number };
  });
}

// ---------------------------------------------------------------------------
// Public history (readers)
// ---------------------------------------------------------------------------

/** Published versions of a public story, newest first. */
export async function listPublishedVersions(viewer: Actor, username: string, slug: string) {
  const [row] = await db
    .select({ story: stories, authorName: users.name, authorUsername: users.username })
    .from(stories)
    .innerJoin(users, eq(users.id, stories.authorId))
    .where(and(eq(users.username, username.toLowerCase()), eq(stories.slug, slug)))
    .limit(1);
  if (!row) return null;
  const isOwner = viewer?.id === row.story.authorId;
  const isPublic = row.story.status === "published" || row.story.status === "unlisted";
  if (!isPublic && !isOwner) return null;

  const versions = await db
    .select({
      number: storyVersions.number,
      message: storyVersions.message,
      wordCount: storyVersions.wordCount,
      chapterCount: storyVersions.chapterCount,
      createdAt: storyVersions.createdAt,
      chapters: storyVersions.chapters,
    })
    .from(storyVersions)
    .where(and(eq(storyVersions.storyId, row.story.id), eq(storyVersions.kind, "published")))
    .orderBy(desc(storyVersions.number));

  // Describe each published version relative to the previous one.
  const ascending = [...versions].reverse();
  const described = ascending.map((v, i) => {
    const previous = ascending[i - 1];
    const summary = previous
      ? compareStates(
          { meta: EMPTY_META, chapters: previous.chapters },
          { meta: EMPTY_META, chapters: v.chapters },
        )
      : null;
    return {
      number: v.number,
      message: v.message,
      wordCount: v.wordCount,
      chapterCount: v.chapterCount,
      createdAt: v.createdAt,
      added: summary ? summary.chapters.filter((c) => c.change === "added").length : v.chapterCount,
      edited: summary ? summary.chapters.filter((c) => c.change === "edited").length : 0,
      removed: summary ? summary.chapters.filter((c) => c.change === "removed").length : 0,
    };
  });

  return {
    story: {
      id: row.story.id,
      title: row.story.title,
      slug: row.story.slug,
      authorName: row.authorName,
      authorUsername: row.authorUsername ?? "",
    },
    versions: described.reverse(),
    isOwner,
  };
}

const EMPTY_META: VersionMeta = {
  title: "",
  description: "",
  genreSlug: null,
  language: "",
  coverKey: null,
  tags: [],
};

/** Latest published version number and date for a story (or null). */
export async function latestPublishedVersion(storyId: string) {
  const [row] = await db
    .select({ number: storyVersions.number, createdAt: storyVersions.createdAt })
    .from(storyVersions)
    .where(and(eq(storyVersions.storyId, storyId), eq(storyVersions.kind, "published")))
    .orderBy(desc(storyVersions.number))
    .limit(1);
  return row ?? null;
}

/** Parses a version number from a URL segment or query string. */
export function parseVersionNumber(value: unknown): number | null {
  const result = versionNumberSchema.safeParse(value);
  return result.success ? result.data : null;
}
