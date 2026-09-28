/**
 * Chapters: writing, ordering, publishing and reading.
 */
import { and, asc, desc, eq, gt, lt, max, sql } from "drizzle-orm";
import { z } from "zod";
import { db } from "@/server/db";
import { chapters, genres, stories, users } from "@/server/db/schema";
import { renderDocToHtml } from "@/lib/content/render";
import { sanitizeDoc } from "@/lib/content/sanitize";
import { countWords, docToText } from "@/lib/content/text";
import { EMPTY_DOC, type DocNode } from "@/lib/content/types";
import { fileUrl } from "@/lib/files";
import { ConflictError, NotFoundError, type Actor } from "./errors";
import { getEditableStory } from "./stories";
import { recordVersion } from "./versions";
import { parseInput } from "./validation";

const publishMessageSchema = z
  .string()
  .trim()
  .max(500, "Keep the description under 500 characters.");

const chapterTitleSchema = z
  .string()
  .trim()
  .max(160, "Keep the chapter title under 160 characters.");

async function getEditableChapter(actor: Actor, chapterId: string) {
  if (!z.string().uuid().safeParse(chapterId).success) throw new NotFoundError("Chapter");
  const [chapter] = await db.select().from(chapters).where(eq(chapters.id, chapterId)).limit(1);
  if (!chapter) throw new NotFoundError("Chapter");
  const story = await getEditableStory(actor, chapter.storyId);
  return { chapter, story };
}

export async function addChapter(actor: Actor, storyId: string, input: { title?: string } = {}) {
  const story = await getEditableStory(actor, storyId);
  return db.transaction(async (tx) => {
    const [{ last }] = await tx
      .select({ last: max(chapters.position) })
      .from(chapters)
      .where(eq(chapters.storyId, story.id));
    const position = (last ?? 0) + 1;
    const title = parseInput(chapterTitleSchema, input.title ?? "") || `Chapter ${position}`;
    const [chapter] = await tx
      .insert(chapters)
      .values({ storyId: story.id, position, title, content: EMPTY_DOC })
      .returning();
    await tx.update(stories).set({ updatedAt: new Date() }).where(eq(stories.id, story.id));
    return chapter;
  });
}

/** Chapter plus the context the editor needs. */
export async function getChapterForEditor(actor: Actor, chapterId: string) {
  const { chapter, story } = await getEditableChapter(actor, chapterId);
  const [siblings, [author]] = await Promise.all([
    db
      .select({
        id: chapters.id,
        position: chapters.position,
        title: chapters.title,
        status: chapters.status,
      })
      .from(chapters)
      .where(eq(chapters.storyId, story.id))
      .orderBy(asc(chapters.position)),
    db.select({ username: users.username }).from(users).where(eq(users.id, story.authorId)),
  ]);
  return { chapter, story, siblings, authorUsername: author?.username ?? "" };
}

const saveSchema = z.object({
  title: chapterTitleSchema.optional(),
  content: z.unknown(),
  expectedRevision: z.number().int().min(0),
});

/**
 * Saves chapter content. The client sends the revision it started from; if
 * another tab or device saved in the meantime the save is rejected instead of
 * silently overwriting newer work.
 */
export async function saveChapter(
  actor: Actor,
  chapterId: string,
  input: { title?: string; content: unknown; expectedRevision: number },
) {
  const { chapter } = await getEditableChapter(actor, chapterId);
  const data = parseInput(saveSchema, input);
  const content = sanitizeDoc(data.content);
  const text = docToText(content);

  const [updated] = await db
    .update(chapters)
    .set({
      content,
      contentText: text,
      wordCount: countWords(text),
      revision: sql`${chapters.revision} + 1`,
      ...(data.title !== undefined ? { title: data.title } : {}),
    })
    .where(and(eq(chapters.id, chapter.id), eq(chapters.revision, data.expectedRevision)))
    .returning({
      revision: chapters.revision,
      wordCount: chapters.wordCount,
      updatedAt: chapters.updatedAt,
    });

  if (!updated) {
    throw new ConflictError(
      "This chapter was changed somewhere else (another tab or device). Reload to get the latest version.",
    );
  }
  await db.update(stories).set({ updatedAt: new Date() }).where(eq(stories.id, chapter.storyId));
  return updated;
}

export async function renameChapter(actor: Actor, chapterId: string, title: string) {
  const { chapter } = await getEditableChapter(actor, chapterId);
  const clean = parseInput(chapterTitleSchema, title) || `Chapter ${chapter.position}`;
  await db.update(chapters).set({ title: clean }).where(eq(chapters.id, chapter.id));
}

/**
 * Publishes or unpublishes a chapter from the chapter list. Publishing goes
 * through `publishChapter` so readers get the current text and the story
 * history records it.
 */
export async function setChapterStatus(
  actor: Actor,
  chapterId: string,
  status: "draft" | "published",
) {
  parseInput(z.enum(["draft", "published"]), status);
  if (status === "published") return publishChapter(actor, chapterId, { publishStory: false });
  const { chapter } = await getEditableChapter(actor, chapterId);
  await db.update(chapters).set({ status: "draft" }).where(eq(chapters.id, chapter.id));
}

/**
 * Publishes a chapter's current text and, optionally, the story it belongs
 * to. This is the "Publish" / "Publish changes" button in the editor.
 * Readers keep seeing the last published text until the writer publishes
 * again, and every publish is recorded as a version in the story history.
 */
export async function publishChapter(
  actor: Actor,
  chapterId: string,
  options: { publishStory: boolean; message?: string },
) {
  const { chapter, story } = await getEditableChapter(actor, chapterId);
  const message = parseInput(publishMessageSchema, options.message ?? "");
  const now = new Date();
  const title = chapter.title || `Chapter ${chapter.position}`;
  const wasPublished = chapter.publishedContent !== null;

  await db.transaction(async (tx) => {
    await tx
      .update(chapters)
      .set({
        status: "published",
        publishedAt: chapter.publishedAt ?? now,
        publishedContent: chapter.content,
        publishedTitle: chapter.title,
        publishedWordCount: chapter.wordCount,
        publishedRevision: chapter.revision,
      })
      .where(eq(chapters.id, chapter.id));
    if (options.publishStory && story.status !== "published") {
      await tx
        .update(stories)
        .set({ status: "published", publishedAt: story.publishedAt ?? now })
        .where(eq(stories.id, story.id));
    }
    await recordVersion(tx, {
      storyId: story.id,
      kind: "published",
      message: message || (wasPublished ? `Updated “${title}”` : `Published “${title}”`),
      authorId: story.authorId,
    });
  });
}

export async function moveChapter(actor: Actor, chapterId: string, direction: "up" | "down") {
  const { chapter } = await getEditableChapter(actor, chapterId);
  await db.transaction(async (tx) => {
    const [neighbour] = await tx
      .select()
      .from(chapters)
      .where(
        and(
          eq(chapters.storyId, chapter.storyId),
          direction === "up"
            ? lt(chapters.position, chapter.position)
            : gt(chapters.position, chapter.position),
        ),
      )
      .orderBy(direction === "up" ? desc(chapters.position) : asc(chapters.position))
      .limit(1);
    if (!neighbour) return;
    await tx
      .update(chapters)
      .set({ position: neighbour.position })
      .where(eq(chapters.id, chapter.id));
    await tx
      .update(chapters)
      .set({ position: chapter.position })
      .where(eq(chapters.id, neighbour.id));
  });
}

export async function deleteChapter(actor: Actor, chapterId: string) {
  const { chapter } = await getEditableChapter(actor, chapterId);
  await db.transaction(async (tx) => {
    await tx.delete(chapters).where(eq(chapters.id, chapter.id));
    await tx
      .update(chapters)
      .set({ position: sql`${chapters.position} - 1` })
      .where(and(eq(chapters.storyId, chapter.storyId), gt(chapters.position, chapter.position)));
  });
  return { storyId: chapter.storyId };
}

/**
 * Loads a chapter for the reader. Draft chapters (and chapters of stories
 * that aren't public) are only visible to the author.
 */
export async function getReaderChapter(
  viewer: Actor,
  username: string,
  slug: string,
  position: number,
) {
  if (!Number.isInteger(position) || position < 1) return null;
  const [row] = await db
    .select({
      story: {
        id: stories.id,
        slug: stories.slug,
        title: stories.title,
        status: stories.status,
        language: stories.language,
        authorId: stories.authorId,
        coverKey: stories.coverKey,
      },
      author: { name: users.name, username: users.username, image: users.image },
      genreName: genres.name,
    })
    .from(stories)
    .innerJoin(users, eq(users.id, stories.authorId))
    .leftJoin(genres, eq(genres.slug, stories.genreSlug))
    .where(and(eq(users.username, username.toLowerCase()), eq(stories.slug, slug)))
    .limit(1);
  if (!row) return null;

  const isOwner = viewer?.id === row.story.authorId;
  const isPublic = row.story.status === "published" || row.story.status === "unlisted";
  if (!isPublic && !isOwner) return null;

  const visible = isOwner
    ? eq(chapters.storyId, row.story.id)
    : and(eq(chapters.storyId, row.story.id), eq(chapters.status, "published"));

  // Readers see the published title; the author sees their working title.
  const tocRows = await db
    .select({
      id: chapters.id,
      position: chapters.position,
      title: chapters.title,
      publishedTitle: chapters.publishedTitle,
      status: chapters.status,
    })
    .from(chapters)
    .where(visible)
    .orderBy(asc(chapters.position));
  const toc = tocRows.map(({ publishedTitle, ...c }) => ({
    ...c,
    title: isOwner ? c.title : (publishedTitle ?? c.title),
  }));

  const index = toc.findIndex((c) => c.position === position);
  if (index === -1) return null;

  const [chapter] = await db.select().from(chapters).where(eq(chapters.id, toc[index].id)).limit(1);
  // Readers see the last published text; the author previews their latest draft.
  const showDraft = isOwner || chapter.publishedContent === null;

  return {
    story: { ...row.story, coverUrl: fileUrl(row.story.coverKey), genreName: row.genreName },
    author: row.author,
    chapter: {
      id: chapter.id,
      position: chapter.position,
      title: showDraft ? chapter.title : (chapter.publishedTitle ?? chapter.title),
      status: chapter.status,
      wordCount: showDraft ? chapter.wordCount : chapter.publishedWordCount,
      publishedAt: chapter.publishedAt,
      updatedAt: chapter.updatedAt,
      html: renderDocToHtml(
        sanitizeDoc((showDraft ? chapter.content : chapter.publishedContent) as DocNode),
      ),
    },
    /** The author is looking at edits that readers can't see yet. */
    previewingDraft: isOwner && chapter.revision !== chapter.publishedRevision,
    toc,
    number: index + 1,
    prev: toc[index - 1] ?? null,
    next: toc[index + 1] ?? null,
    isOwner,
  };
}
