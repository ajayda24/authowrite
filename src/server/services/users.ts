/**
 * Public profiles and profile settings.
 */
import { and, count, desc, eq, sql } from "drizzle-orm";
import { z } from "zod";
import { db } from "@/server/db";
import { follows, stories, users } from "@/server/db/schema";
import { isUploadUrl } from "@/lib/files";
import { normalizeUsername, validateUsername } from "@/lib/usernames";
import { ConflictError, ValidationError, requireActor, type Actor } from "./errors";
import { isDiscoverable } from "./discovery";
import { storySummaryFields, toStorySummary } from "./summaries";
import { parseInput } from "./validation";

export async function getProfile(viewer: Actor, username: string) {
  const [user] = await db
    .select({
      id: users.id,
      name: users.name,
      username: users.username,
      image: users.image,
      bio: users.bio,
      createdAt: users.createdAt,
    })
    .from(users)
    .where(eq(users.username, username.toLowerCase()))
    .limit(1);
  if (!user) return null;

  const isSelf = viewer?.id === user.id;
  const [[followers], [following], storyRows, viewerFollows] = await Promise.all([
    db.select({ value: count() }).from(follows).where(eq(follows.followingId, user.id)),
    db.select({ value: count() }).from(follows).where(eq(follows.followerId, user.id)),
    db
      .select(storySummaryFields)
      .from(stories)
      .innerJoin(users, eq(users.id, stories.authorId))
      .where(and(eq(stories.authorId, user.id), isDiscoverable))
      .orderBy(desc(stories.publishedAt)),
    viewer && !isSelf
      ? db
          .select({ one: sql`1` })
          .from(follows)
          .where(and(eq(follows.followerId, viewer.id), eq(follows.followingId, user.id)))
          .limit(1)
      : Promise.resolve([]),
  ]);

  return {
    user,
    stats: { followers: followers.value, following: following.value },
    stories: storyRows.map(toStorySummary),
    viewerFollows: viewerFollows.length > 0,
    isSelf,
  };
}

const profileSchema = z.object({
  name: z.string().trim().min(1, "Enter your name.").max(80, "Keep your name under 80 characters."),
  username: z.string().trim(),
  bio: z.string().trim().max(500, "Keep your bio under 500 characters."),
  image: z.string().max(300).nullable().optional(),
});

export async function getProfileSettings(actor: Actor) {
  const user = requireActor(actor);
  const [row] = await db
    .select({
      name: users.name,
      username: users.username,
      displayUsername: users.displayUsername,
      bio: users.bio,
      image: users.image,
      email: users.email,
    })
    .from(users)
    .where(eq(users.id, user.id));
  return row;
}

export async function updateProfile(actor: Actor, input: z.input<typeof profileSchema>) {
  const user = requireActor(actor);
  const data = parseInput(profileSchema, input);
  const usernameError = validateUsername(data.username);
  if (usernameError) throw new ValidationError(usernameError);
  const username = normalizeUsername(data.username);

  const [existing] = await db
    .select({ id: users.id })
    .from(users)
    .where(eq(users.username, username))
    .limit(1);
  if (existing && existing.id !== user.id) throw new ConflictError("That username is taken.");

  if (data.image && !isUploadUrl(data.image, user.id)) {
    throw new ValidationError("Upload the picture first.");
  }

  await db
    .update(users)
    .set({
      name: data.name,
      username,
      displayUsername: data.username.trim(),
      bio: data.bio,
      ...(data.image !== undefined ? { image: data.image } : {}),
    })
    .where(eq(users.id, user.id));
  return { username };
}
