/**
 * Likes, bookmarks, follows, comments and reading progress.
 */
import { and, asc, desc, eq, sql } from "drizzle-orm";
import { z } from "zod";
import { db } from "@/server/db";
import {
  bookmarks,
  chapters,
  comments,
  follows,
  readingProgress,
  stories,
  storyLikes,
  users,
} from "@/server/db/schema";
import { assertRateLimit } from "@/server/rate-limit";
import { ForbiddenError, NotFoundError, ValidationError, requireActor, type Actor } from "./errors";
import { parseInput } from "./validation";
import { storySummaryFields, type StorySummaryRow, toStorySummary } from "./summaries";

/** A story the viewer can interact with (public, or their own). */
async function getInteractableStory(actor: Actor, storyId: string) {
  if (!z.string().uuid().safeParse(storyId).success) throw new NotFoundError("Story");
  const [story] = await db
    .select({ id: stories.id, authorId: stories.authorId, status: stories.status })
    .from(stories)
    .where(eq(stories.id, storyId))
    .limit(1);
  const visible =
    story &&
    (story.status === "published" ||
      story.status === "unlisted" ||
      story.authorId === actor?.id);
  if (!visible) throw new NotFoundError("Story");
  return story;
}

export async function setLike(actor: Actor, storyId: string, liked: boolean) {
  const user = requireActor(actor);
  const story = await getInteractableStory(user, storyId);
  if (liked) {
    await db.insert(storyLikes).values({ userId: user.id, storyId: story.id }).onConflictDoNothing();
  } else {
    await db
      .delete(storyLikes)
      .where(and(eq(storyLikes.userId, user.id), eq(storyLikes.storyId, story.id)));
  }
}

export async function setBookmark(actor: Actor, storyId: string, bookmarked: boolean) {
  const user = requireActor(actor);
  const story = await getInteractableStory(user, storyId);
  if (bookmarked) {
    await db.insert(bookmarks).values({ userId: user.id, storyId: story.id }).onConflictDoNothing();
  } else {
    await db
      .delete(bookmarks)
      .where(and(eq(bookmarks.userId, user.id), eq(bookmarks.storyId, story.id)));
  }
}

export async function setFollow(actor: Actor, targetUserId: string, following: boolean) {
  const user = requireActor(actor);
  if (user.id === targetUserId) throw new ValidationError("You can't follow yourself.");
  const [target] = await db
    .select({ id: users.id })
    .from(users)
    .where(eq(users.id, targetUserId))
    .limit(1);
  if (!target) throw new NotFoundError("Author");
  if (following) {
    await db
      .insert(follows)
      .values({ followerId: user.id, followingId: target.id })
      .onConflictDoNothing();
  } else {
    await db
      .delete(follows)
      .where(and(eq(follows.followerId, user.id), eq(follows.followingId, target.id)));
  }
}

export async function listBookmarks(actor: Actor) {
  const user = requireActor(actor);
  const rows: StorySummaryRow[] = await db
    .select(storySummaryFields)
    .from(bookmarks)
    .innerJoin(stories, eq(stories.id, bookmarks.storyId))
    .innerJoin(users, eq(users.id, stories.authorId))
    .where(
      and(
        eq(bookmarks.userId, user.id),
        sql`(${stories.status} in ('published', 'unlisted') or ${stories.authorId} = ${user.id})`,
      ),
    )
    .orderBy(desc(bookmarks.createdAt));
  return rows.map(toStorySummary);
}

// ---------------------------------------------------------------------------
// Comments
// ---------------------------------------------------------------------------

const commentSchema = z
  .string()
  .trim()
  .min(1, "Write something first.")
  .max(5000, "Keep comments under 5000 characters.");

export async function addComment(
  actor: Actor,
  input: { storyId: string; chapterId?: string | null; body: string },
) {
  const user = requireActor(actor);
  const body = parseInput(commentSchema, input.body);
  const story = await getInteractableStory(user, input.storyId);
  assertRateLimit(`comment:${user.id}`, 10, 60_000);

  if (input.chapterId) {
    const [chapter] = await db
      .select({ id: chapters.id, status: chapters.status })
      .from(chapters)
      .where(and(eq(chapters.id, input.chapterId), eq(chapters.storyId, story.id)))
      .limit(1);
    if (!chapter || (chapter.status !== "published" && story.authorId !== user.id)) {
      throw new NotFoundError("Chapter");
    }
  }

  const [comment] = await db
    .insert(comments)
    .values({ storyId: story.id, chapterId: input.chapterId ?? null, authorId: user.id, body })
    .returning();
  return comment;
}

/** Comment authors and story owners can delete a comment. */
export async function deleteComment(actor: Actor, commentId: string) {
  const user = requireActor(actor);
  if (!z.string().uuid().safeParse(commentId).success) throw new NotFoundError("Comment");
  const [row] = await db
    .select({ id: comments.id, authorId: comments.authorId, storyAuthorId: stories.authorId })
    .from(comments)
    .innerJoin(stories, eq(stories.id, comments.storyId))
    .where(eq(comments.id, commentId))
    .limit(1);
  if (!row) throw new NotFoundError("Comment");
  if (row.authorId !== user.id && row.storyAuthorId !== user.id) throw new ForbiddenError();
  await db.delete(comments).where(eq(comments.id, row.id));
}

export async function listComments(storyId: string, chapterId: string | null) {
  return db
    .select({
      id: comments.id,
      body: comments.body,
      createdAt: comments.createdAt,
      author: { id: users.id, name: users.name, username: users.username, image: users.image },
    })
    .from(comments)
    .innerJoin(users, eq(users.id, comments.authorId))
    .where(
      and(
        eq(comments.storyId, storyId),
        chapterId ? eq(comments.chapterId, chapterId) : sql`${comments.chapterId} is null`,
      ),
    )
    .orderBy(asc(comments.createdAt))
    .limit(500);
}

// ---------------------------------------------------------------------------
// Reading progress
// ---------------------------------------------------------------------------

export async function saveReadingProgress(
  actor: Actor,
  input: { storyId: string; chapterId: string; percent: number },
) {
  const user = requireActor(actor);
  const percent = Math.min(1, Math.max(0, Number(input.percent) || 0));
  const story = await getInteractableStory(user, input.storyId);
  const [chapter] = await db
    .select({ id: chapters.id })
    .from(chapters)
    .where(and(eq(chapters.id, input.chapterId), eq(chapters.storyId, story.id)))
    .limit(1);
  if (!chapter) throw new NotFoundError("Chapter");
  await db
    .insert(readingProgress)
    .values({ userId: user.id, storyId: story.id, chapterId: chapter.id, percent })
    .onConflictDoUpdate({
      target: [readingProgress.userId, readingProgress.storyId],
      set: { chapterId: chapter.id, percent, updatedAt: new Date() },
    });
}

/** Stories the viewer has started, most recent first. */
export async function listContinueReading(actor: Actor, limit = 6) {
  const user = requireActor(actor);
  const rows = await db
    .select({
      ...storySummaryFields,
      progressPosition: chapters.position,
      progressTitle: chapters.title,
      progressPercent: readingProgress.percent,
    })
    .from(readingProgress)
    .innerJoin(stories, eq(stories.id, readingProgress.storyId))
    .innerJoin(users, eq(users.id, stories.authorId))
    .innerJoin(chapters, eq(chapters.id, readingProgress.chapterId))
    .where(
      and(
        eq(readingProgress.userId, user.id),
        sql`${stories.status} in ('published', 'unlisted')`,
      ),
    )
    .orderBy(desc(readingProgress.updatedAt))
    .limit(limit);
  return rows.map((r) => ({
    ...toStorySummary(r),
    progress: { position: r.progressPosition, title: r.progressTitle, percent: r.progressPercent },
  }));
}
