/**
 * Discovery: latest, popular, filters and search.
 *
 * Deliberately simple and transparent — no personalised recommendations in
 * V1. "Popular" is a documented formula over the last 30 days.
 */
import { and, asc, desc, eq, ilike, or, sql, type SQL } from "drizzle-orm";
import { z } from "zod";
import { db } from "@/server/db";
import { stories, storyTags, tags, users, genres } from "@/server/db/schema";
import { storySummaryFields, toStorySummary, type StorySummary } from "./summaries";

export const PAGE_SIZE = 18;

/** Stories anyone can find: published, with at least one published chapter. */
export const isDiscoverable = sql`${stories.status} = 'published' and exists (select 1 from chapters c where c.story_id = ${stories.id} and c.status = 'published')`;

/**
 * Popularity score:
 *   3 × likes in the last 30 days
 * + 2 × bookmarks in the last 30 days
 * + views / 10
 */
export const popularityScore = sql<number>`(
  3 * (select count(*) from story_likes l where l.story_id = ${stories.id} and l.created_at > now() - interval '30 days')
  + 2 * (select count(*) from bookmarks b where b.story_id = ${stories.id} and b.created_at > now() - interval '30 days')
  + ${stories.viewCount} / 10.0
)`;

const listSchema = z.object({
  sort: z.enum(["latest", "popular"]).catch("latest"),
  genre: z.string().max(40).optional().catch(undefined),
  language: z.string().max(20).optional().catch(undefined),
  tag: z.string().max(40).optional().catch(undefined),
  page: z.coerce.number().int().min(1).max(500).catch(1),
});

export interface ListStoriesOptions {
  sort?: string;
  genre?: string;
  language?: string;
  tag?: string;
  page?: number | string;
}

export async function listStories(options: ListStoriesOptions = {}): Promise<{
  stories: StorySummary[];
  page: number;
  hasMore: boolean;
}> {
  const { sort, genre, language, tag, page } = listSchema.parse(options);
  const filters: SQL[] = [isDiscoverable];
  if (genre) filters.push(eq(stories.genreSlug, genre));
  if (language) filters.push(eq(stories.language, language));
  if (tag) {
    filters.push(
      sql`exists (select 1 from ${storyTags} st join ${tags} t on t.id = st.tag_id where st.story_id = ${stories.id} and t.name = ${tag})`,
    );
  }

  const rows = await db
    .select(storySummaryFields)
    .from(stories)
    .innerJoin(users, eq(users.id, stories.authorId))
    .where(and(...filters))
    .orderBy(
      ...(sort === "popular"
        ? [desc(popularityScore), desc(stories.publishedAt)]
        : [desc(stories.publishedAt), desc(stories.id)]),
    )
    .limit(PAGE_SIZE + 1)
    .offset((page - 1) * PAGE_SIZE);

  return {
    stories: rows.slice(0, PAGE_SIZE).map(toStorySummary),
    page,
    hasMore: rows.length > PAGE_SIZE,
  };
}

/** Full-text search over story titles and descriptions. */
export async function searchStories(query: string, limit = 24): Promise<StorySummary[]> {
  const q = query.trim().slice(0, 200);
  if (!q) return [];
  const tsQuery = sql`websearch_to_tsquery('simple', ${q})`;
  const prefix = `%${q.replace(/[%_\\]/g, "\\$&")}%`;
  const rows = await db
    .select(storySummaryFields)
    .from(stories)
    .innerJoin(users, eq(users.id, stories.authorId))
    .where(and(isDiscoverable, or(sql`${stories.search} @@ ${tsQuery}`, ilike(stories.title, prefix))))
    .orderBy(desc(sql`ts_rank(${stories.search}, ${tsQuery})`), desc(stories.publishedAt))
    .limit(limit);
  return rows.map(toStorySummary);
}

export async function searchAuthors(query: string, limit = 12) {
  const q = query.trim().slice(0, 100);
  if (!q) return [];
  const pattern = `%${q.replace(/[%_\\]/g, "\\$&")}%`;
  return db
    .select({
      id: users.id,
      name: users.name,
      username: users.username,
      image: users.image,
      bio: users.bio,
    })
    .from(users)
    .where(and(sql`${users.username} is not null`, or(ilike(users.username, pattern), ilike(users.name, pattern))))
    .orderBy(asc(users.username))
    .limit(limit);
}

export async function searchTags(query: string, limit = 12) {
  const q = query.trim().toLowerCase().replace(/^#/, "").slice(0, 40);
  if (!q) return [];
  return db
    .select({ name: tags.name })
    .from(tags)
    .where(ilike(tags.name, `%${q.replace(/[%_\\]/g, "\\$&")}%`))
    .orderBy(asc(tags.name))
    .limit(limit);
}

/** Tags used by discoverable stories, most used first. */
export async function popularTags(limit = 20) {
  return db
    .select({ name: tags.name, uses: sql<number>`count(*)::int` })
    .from(storyTags)
    .innerJoin(tags, eq(tags.id, storyTags.tagId))
    .innerJoin(stories, eq(stories.id, storyTags.storyId))
    .where(isDiscoverable)
    .groupBy(tags.name)
    .orderBy(desc(sql`count(*)`), asc(tags.name))
    .limit(limit);
}

/** Genres with how many discoverable stories they contain. */
export async function genresWithCounts() {
  return db
    .select({
      slug: genres.slug,
      name: genres.name,
      stories: sql<number>`(select count(*)::int from ${stories} where ${stories.genreSlug} = ${genres.slug} and ${isDiscoverable})`,
    })
    .from(genres)
    .orderBy(asc(genres.position));
}

/** Languages that have at least one discoverable story. */
export async function availableLanguages() {
  return db
    .select({ code: stories.language, stories: sql<number>`count(*)::int` })
    .from(stories)
    .where(isDiscoverable)
    .groupBy(stories.language)
    .orderBy(desc(sql`count(*)`));
}
