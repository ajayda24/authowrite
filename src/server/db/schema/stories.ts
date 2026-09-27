import { sql } from "drizzle-orm";
import {
  customType,
  index,
  integer,
  jsonb,
  pgEnum,
  pgTable,
  primaryKey,
  text,
  timestamp,
  uniqueIndex,
  uuid,
} from "drizzle-orm/pg-core";
import type { DocNode } from "@/lib/content/types";
import { users } from "./auth";

const tsvector = customType<{ data: string }>({
  dataType() {
    return "tsvector";
  },
});

/**
 * One enum covers both "visibility" and "publishing state" — see
 * docs/adr/0007-single-story-status.md.
 */
export const storyStatus = pgEnum("story_status", ["draft", "published", "unlisted", "archived"]);
export const chapterStatus = pgEnum("chapter_status", ["draft", "published"]);

export type StoryStatus = (typeof storyStatus.enumValues)[number];
export type ChapterStatus = (typeof chapterStatus.enumValues)[number];

export const genres = pgTable("genres", {
  slug: text("slug").primaryKey(),
  name: text("name").notNull(),
  position: integer("position").notNull().default(0),
});

export const stories = pgTable(
  "stories",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    authorId: text("author_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    slug: text("slug").notNull(),
    title: text("title").notNull(),
    description: text("description").notNull().default(""),
    coverKey: text("cover_key"),
    genreSlug: text("genre_slug").references(() => genres.slug, { onDelete: "set null" }),
    /** BCP-47 language tag, e.g. "en", "ml". */
    language: text("language").notNull().default("en"),
    status: storyStatus("status").notNull().default("draft"),
    publishedAt: timestamp("published_at", { withTimezone: true }),
    viewCount: integer("view_count").notNull().default(0),
    /**
     * Full-text search document. Uses the language-neutral `simple`
     * configuration so every language (including Malayalam) is searchable.
     */
    search: tsvector("search").generatedAlwaysAs(
      sql`setweight(to_tsvector('simple', coalesce("title", '')), 'A') || setweight(to_tsvector('simple', coalesce("description", '')), 'B')`,
    ),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow()
      .$onUpdate(() => new Date()),
  },
  (t) => [
    uniqueIndex("stories_author_slug_idx").on(t.authorId, t.slug),
    index("stories_status_published_idx").on(t.status, t.publishedAt.desc()),
    index("stories_genre_idx").on(t.genreSlug),
    index("stories_language_idx").on(t.language),
    index("stories_search_idx").using("gin", t.search),
  ],
);

export const chapters = pgTable(
  "chapters",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    storyId: uuid("story_id")
      .notNull()
      .references(() => stories.id, { onDelete: "cascade" }),
    /** 1-based order within the story. Also used as the chapter number in URLs. */
    position: integer("position").notNull(),
    title: text("title").notNull().default(""),
    /** Canonical content: a sanitized ProseMirror/TipTap JSON document. */
    content: jsonb("content").$type<DocNode>().notNull(),
    /** Plain-text projection of `content`, for search and excerpts. */
    contentText: text("content_text").notNull().default(""),
    wordCount: integer("word_count").notNull().default(0),
    status: chapterStatus("status").notNull().default("draft"),
    publishedAt: timestamp("published_at", { withTimezone: true }),
    /** Incremented on every content save; used for optimistic concurrency. */
    revision: integer("revision").notNull().default(0),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow()
      .$onUpdate(() => new Date()),
  },
  (t) => [index("chapters_story_position_idx").on(t.storyId, t.position)],
);

export const tags = pgTable("tags", {
  id: uuid("id").primaryKey().defaultRandom(),
  name: text("name").notNull().unique(),
});

export const storyTags = pgTable(
  "story_tags",
  {
    storyId: uuid("story_id")
      .notNull()
      .references(() => stories.id, { onDelete: "cascade" }),
    tagId: uuid("tag_id")
      .notNull()
      .references(() => tags.id, { onDelete: "cascade" }),
  },
  (t) => [primaryKey({ columns: [t.storyId, t.tagId] }), index("story_tags_tag_idx").on(t.tagId)],
);

export const uploads = pgTable(
  "uploads",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    key: text("key").notNull().unique(),
    ownerId: text("owner_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    mime: text("mime").notNull(),
    bytes: integer("bytes").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [index("uploads_owner_idx").on(t.ownerId)],
);
