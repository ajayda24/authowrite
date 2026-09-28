/**
 * The "story card" projection shared by every list of stories (explore,
 * search, profiles, bookmarks). Queries select `storySummaryFields` from
 * `stories` joined with `users`.
 */
import { sql } from "drizzle-orm";
import { chapters, genres, stories, storyLikes, users } from "@/server/db/schema";
import { fileUrl } from "@/lib/files";

export const storySummaryFields = {
  id: stories.id,
  slug: stories.slug,
  title: stories.title,
  description: stories.description,
  coverKey: stories.coverKey,
  language: stories.language,
  status: stories.status,
  genreSlug: stories.genreSlug,
  publishedAt: stories.publishedAt,
  genreName: sql<
    string | null
  >`(select ${genres.name} from ${genres} where ${genres.slug} = ${stories.genreSlug})`,
  authorName: users.name,
  authorUsername: users.username,
  authorImage: users.image,
  chapterCount: sql<number>`(select count(*)::int from ${chapters} where ${chapters.storyId} = ${stories.id} and ${chapters.status} = 'published')`,
  wordCount: sql<number>`(select coalesce(sum(${chapters.publishedWordCount}), 0)::int from ${chapters} where ${chapters.storyId} = ${stories.id} and ${chapters.status} = 'published')`,
  likeCount: sql<number>`(select count(*)::int from ${storyLikes} where ${storyLikes.storyId} = ${stories.id})`,
};

export interface StorySummaryRow {
  id: string;
  slug: string;
  title: string;
  description: string;
  coverKey: string | null;
  language: string;
  status: string;
  genreSlug: string | null;
  publishedAt: Date | null;
  genreName: string | null;
  authorName: string;
  authorUsername: string | null;
  authorImage: string | null;
  chapterCount: number;
  wordCount: number;
  likeCount: number;
}

export interface StorySummary {
  id: string;
  slug: string;
  title: string;
  description: string;
  coverUrl: string | null;
  language: string;
  status: string;
  genre: { slug: string; name: string } | null;
  publishedAt: Date | null;
  author: { name: string; username: string; image: string | null };
  chapterCount: number;
  wordCount: number;
  likeCount: number;
  href: string;
}

export function toStorySummary(row: StorySummaryRow): StorySummary {
  const username = row.authorUsername ?? "";
  return {
    id: row.id,
    slug: row.slug,
    title: row.title,
    description: row.description,
    coverUrl: fileUrl(row.coverKey),
    language: row.language,
    status: row.status,
    genre: row.genreSlug && row.genreName ? { slug: row.genreSlug, name: row.genreName } : null,
    publishedAt: row.publishedAt,
    author: { name: row.authorName, username, image: row.authorImage },
    chapterCount: row.chapterCount,
    wordCount: row.wordCount,
    likeCount: row.likeCount,
    href: `/${username}/${row.slug}`,
  };
}
