/**
 * Stories: creation, settings, publishing and the public story page.
 *
 * All reads and writes of stories go through this module so authorization is
 * enforced in one place (see docs/architecture.md).
 */
import { and, asc, count, desc, eq, inArray, max, sql } from "drizzle-orm";
import { z } from "zod";
import { db } from "@/server/db";
import {
  bookmarks,
  chapters,
  comments,
  follows,
  genres,
  readingProgress,
  stories,
  storyLikes,
  storyTags,
  tags,
  users,
  type StoryStatus,
} from "@/server/db/schema";
import { EMPTY_DOC } from "@/lib/content/types";
import { fileUrl } from "@/lib/files";
import { slugify, uniqueSlug } from "@/lib/slug";
import {
  ForbiddenError,
  NotFoundError,
  ValidationError,
  requireActor,
  type Actor,
} from "./errors";
import { parseInput, titleSchema } from "./validation";

export type Story = typeof stories.$inferSelect;

const MAX_TAGS = 8;

/** Normalizes a free-form tag: lower-case, words joined with "-". */
export function normalizeTag(input: string): string {
  return input
    .normalize("NFKC")
    .toLowerCase()
    .trim()
    .replace(/^#/, "")
    .replace(/[^\p{L}\p{N}\p{M}]+/gu, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 32);
}

async function slugTaken(authorId: string, slug: string, exceptId?: string): Promise<boolean> {
  const rows = await db
    .select({ id: stories.id })
    .from(stories)
    .where(and(eq(stories.authorId, authorId), eq(stories.slug, slug)))
    .limit(1);
  return rows.length > 0 && rows[0].id !== exceptId;
}

/** Loads a story and checks that `actor` may edit it. */
export async function getEditableStory(actor: Actor, storyId: string): Promise<Story> {
  const user = requireActor(actor);
  if (!z.string().uuid().safeParse(storyId).success) throw new NotFoundError("Story");
  const [story] = await db.select().from(stories).where(eq(stories.id, storyId)).limit(1);
  if (!story) throw new NotFoundError("Story");
  if (story.authorId !== user.id) throw new ForbiddenError();
  return story;
}

// ---------------------------------------------------------------------------
// Writing
// ---------------------------------------------------------------------------

export async function createStory(actor: Actor, input: { title: string }) {
  const user = requireActor(actor);
  const title = parseInput(titleSchema, input.title);
  const slug = await uniqueSlug(slugify(title), (s) => slugTaken(user.id, s));

  return db.transaction(async (tx) => {
    const [story] = await tx
      .insert(stories)
      .values({ authorId: user.id, title, slug })
      .returning();
    const [chapter] = await tx
      .insert(chapters)
      .values({ storyId: story.id, position: 1, title: "Chapter 1", content: EMPTY_DOC })
      .returning({ id: chapters.id });
    return { story, firstChapterId: chapter.id };
  });
}

const updateStorySchema = z.object({
  title: titleSchema,
  description: z.string().trim().max(2000, "Keep the description under 2000 characters."),
  genreSlug: z.string().trim().max(40).nullable(),
  language: z
    .string()
    .trim()
    .regex(/^[a-zA-Z]{2,3}(-[a-zA-Z0-9]{2,8})*$/, "Choose a language."),
  tags: z.array(z.string()).max(MAX_TAGS * 2),
  coverKey: z.string().max(300).nullable().optional(),
});

export type UpdateStoryInput = z.input<typeof updateStorySchema>;

export async function updateStory(actor: Actor, storyId: string, input: UpdateStoryInput) {
  const story = await getEditableStory(actor, storyId);
  const data = parseInput(updateStorySchema, input);

  if (data.genreSlug) {
    const [genre] = await db.select().from(genres).where(eq(genres.slug, data.genreSlug));
    if (!genre) throw new ValidationError("Choose a genre from the list.");
  }
  if (data.coverKey && !data.coverKey.startsWith(`u/${story.authorId}/`)) {
    throw new ValidationError("Upload the cover image first.");
  }

  const tagNames = [...new Set(data.tags.map(normalizeTag).filter((t) => t.length > 0))].slice(
    0,
    MAX_TAGS,
  );

  // The URL stays stable once a story has been published.
  let slug = story.slug;
  if (data.title !== story.title && !story.publishedAt) {
    slug = await uniqueSlug(slugify(data.title), (s) => slugTaken(story.authorId, s, story.id));
  }

  await db.transaction(async (tx) => {
    await tx
      .update(stories)
      .set({
        title: data.title,
        slug,
        description: data.description,
        genreSlug: data.genreSlug || null,
        language: data.language.toLowerCase(),
        ...(data.coverKey !== undefined ? { coverKey: data.coverKey } : {}),
      })
      .where(eq(stories.id, story.id));

    await tx.delete(storyTags).where(eq(storyTags.storyId, story.id));
    if (tagNames.length > 0) {
      await tx
        .insert(tags)
        .values(tagNames.map((name) => ({ name })))
        .onConflictDoNothing();
      const tagRows = await tx
        .select({ id: tags.id })
        .from(tags)
        .where(inArray(tags.name, tagNames));
      await tx
        .insert(storyTags)
        .values(tagRows.map((t) => ({ storyId: story.id, tagId: t.id })));
    }
  });

  return { slug };
}

export async function setStoryStatus(actor: Actor, storyId: string, status: StoryStatus) {
  const story = await getEditableStory(actor, storyId);
  parseInput(z.enum(["draft", "published", "unlisted", "archived"]), status);

  if (status === "published" || status === "unlisted") {
    const [{ value }] = await db
      .select({ value: count() })
      .from(chapters)
      .where(and(eq(chapters.storyId, story.id), eq(chapters.status, "published")));
    if (value === 0) {
      throw new ValidationError("Publish at least one chapter before sharing the story.");
    }
  }

  await db
    .update(stories)
    .set({
      status,
      publishedAt:
        (status === "published" || status === "unlisted") && !story.publishedAt
          ? new Date()
          : story.publishedAt,
    })
    .where(eq(stories.id, story.id));
}

export async function deleteStory(actor: Actor, storyId: string) {
  const story = await getEditableStory(actor, storyId);
  await db.delete(stories).where(eq(stories.id, story.id));
}

/** Everything the writer workspace needs for one story. */
export async function getStoryWorkspace(actor: Actor, storyId: string) {
  const story = await getEditableStory(actor, storyId);
  const [chapterRows, tagRows, genreRows, [author]] = await Promise.all([
    db
      .select({
        id: chapters.id,
        position: chapters.position,
        title: chapters.title,
        status: chapters.status,
        wordCount: chapters.wordCount,
        updatedAt: chapters.updatedAt,
        publishedAt: chapters.publishedAt,
      })
      .from(chapters)
      .where(eq(chapters.storyId, story.id))
      .orderBy(asc(chapters.position)),
    db
      .select({ name: tags.name })
      .from(storyTags)
      .innerJoin(tags, eq(tags.id, storyTags.tagId))
      .where(eq(storyTags.storyId, story.id))
      .orderBy(asc(tags.name)),
    db.select().from(genres).orderBy(asc(genres.position)),
    db
      .select({ username: users.username })
      .from(users)
      .where(eq(users.id, story.authorId)),
  ]);

  return {
    story: { ...story, coverUrl: fileUrl(story.coverKey), tags: tagRows.map((t) => t.name) },
    authorUsername: author?.username ?? "",
    chapters: chapterRows,
    genres: genreRows,
  };
}

/** The signed-in writer's stories, most recently edited first. */
export async function listMyStories(actor: Actor) {
  const user = requireActor(actor);
  const chapterStats = db
    .select({
      storyId: chapters.storyId,
      chapterCount: count().as("chapter_count"),
      wordCount: sql<number>`coalesce(sum(${chapters.wordCount}), 0)::int`.as("word_count"),
      lastEdited: max(chapters.updatedAt).as("last_edited"),
    })
    .from(chapters)
    .groupBy(chapters.storyId)
    .as("chapter_stats");

  const rows = await db
    .select({
      id: stories.id,
      slug: stories.slug,
      title: stories.title,
      status: stories.status,
      coverKey: stories.coverKey,
      updatedAt: stories.updatedAt,
      chapterCount: sql<number>`coalesce(${chapterStats.chapterCount}, 0)::int`,
      wordCount: sql<number>`coalesce(${chapterStats.wordCount}, 0)::int`,
      lastEdited: sql<Date>`greatest(${stories.updatedAt}, ${chapterStats.lastEdited})`,
    })
    .from(stories)
    .leftJoin(chapterStats, eq(chapterStats.storyId, stories.id))
    .where(eq(stories.authorId, user.id))
    .orderBy(desc(sql`greatest(${stories.updatedAt}, ${chapterStats.lastEdited})`));

  return rows.map((r) => ({ ...r, lastEdited: new Date(r.lastEdited), coverUrl: fileUrl(r.coverKey) }));
}

// ---------------------------------------------------------------------------
// Reading
// ---------------------------------------------------------------------------

/**
 * Loads a story by author username and slug for its public page.
 * Drafts and archived stories are only visible to their author.
 */
export async function getPublicStory(viewer: Actor, username: string, slug: string) {
  const [row] = await db
    .select({
      story: stories,
      author: {
        id: users.id,
        name: users.name,
        username: users.username,
        image: users.image,
        bio: users.bio,
      },
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

  const storyId = row.story.id;
  const chapterFilter = isOwner
    ? eq(chapters.storyId, storyId)
    : and(eq(chapters.storyId, storyId), eq(chapters.status, "published"));

  const [chapterRows, tagRows, [likes], [marks], [commentTotal], viewerState] = await Promise.all([
    db
      .select({
        id: chapters.id,
        position: chapters.position,
        title: chapters.title,
        status: chapters.status,
        wordCount: chapters.wordCount,
        publishedAt: chapters.publishedAt,
      })
      .from(chapters)
      .where(chapterFilter)
      .orderBy(asc(chapters.position)),
    db
      .select({ name: tags.name })
      .from(storyTags)
      .innerJoin(tags, eq(tags.id, storyTags.tagId))
      .where(eq(storyTags.storyId, storyId))
      .orderBy(asc(tags.name)),
    db.select({ value: count() }).from(storyLikes).where(eq(storyLikes.storyId, storyId)),
    db.select({ value: count() }).from(bookmarks).where(eq(bookmarks.storyId, storyId)),
    db.select({ value: count() }).from(comments).where(eq(comments.storyId, storyId)),
    viewer ? getViewerStoryState(viewer.id, storyId, row.story.authorId) : null,
  ]);

  return {
    story: { ...row.story, coverUrl: fileUrl(row.story.coverKey), genreName: row.genreName },
    author: row.author,
    tags: tagRows.map((t) => t.name),
    chapters: chapterRows,
    stats: {
      likes: likes.value,
      bookmarks: marks.value,
      comments: commentTotal.value,
      views: row.story.viewCount,
      words: chapterRows
        .filter((c) => c.status === "published")
        .reduce((sum, c) => sum + c.wordCount, 0),
    },
    viewer: viewerState,
    isOwner,
  };
}

async function getViewerStoryState(userId: string, storyId: string, authorId: string) {
  const [liked, bookmarked, following, progress] = await Promise.all([
    db
      .select({ one: sql`1` })
      .from(storyLikes)
      .where(and(eq(storyLikes.userId, userId), eq(storyLikes.storyId, storyId)))
      .limit(1),
    db
      .select({ one: sql`1` })
      .from(bookmarks)
      .where(and(eq(bookmarks.userId, userId), eq(bookmarks.storyId, storyId)))
      .limit(1),
    db
      .select({ one: sql`1` })
      .from(follows)
      .where(and(eq(follows.followerId, userId), eq(follows.followingId, authorId)))
      .limit(1),
    db
      .select({ position: chapters.position, percent: readingProgress.percent })
      .from(readingProgress)
      .innerJoin(chapters, eq(chapters.id, readingProgress.chapterId))
      .where(and(eq(readingProgress.userId, userId), eq(readingProgress.storyId, storyId)))
      .limit(1),
  ]);
  return {
    liked: liked.length > 0,
    bookmarked: bookmarked.length > 0,
    followingAuthor: following.length > 0,
    progress: progress[0] ?? null,
  };
}

/** Increments the view counter of a public story. Callers debounce per visitor. */
export async function recordStoryView(storyId: string) {
  if (!z.string().uuid().safeParse(storyId).success) return;
  await db
    .update(stories)
    .set({ viewCount: sql`${stories.viewCount} + 1`, updatedAt: sql`${stories.updatedAt}` })
    .where(and(eq(stories.id, storyId), inArray(stories.status, ["published", "unlisted"])));
}

export async function listGenres() {
  return db.select().from(genres).orderBy(asc(genres.position));
}
