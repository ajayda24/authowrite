/**
 * Story history ("versions"). See docs/adr/0009-story-history.md.
 *
 * A version is an immutable snapshot of a story: its details plus an ordered
 * list of chapters. Chapter text is stored once per unique content in
 * `content_blobs` (keyed by SHA-256), like Git's object store, so unchanged
 * chapters cost nothing when a new version is saved.
 */
import {
  index,
  integer,
  jsonb,
  pgEnum,
  pgTable,
  text,
  timestamp,
  uniqueIndex,
  uuid,
} from "drizzle-orm/pg-core";
import type { DocNode } from "@/lib/content/types";
import { users } from "./auth";
import { stories } from "./stories";

/**
 * - `saved`: the writer saved a version by hand
 * - `published`: recorded automatically when something was published
 * - `automatic`: a safety backup, e.g. taken before restoring an older version
 */
export const versionKind = pgEnum("version_kind", ["saved", "published", "automatic"]);
export type VersionKind = (typeof versionKind.enumValues)[number];

export const contentBlobs = pgTable("content_blobs", {
  hash: text("hash").primaryKey(),
  content: jsonb("content").$type<DocNode>().notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

/** Story details captured in a version. */
export interface VersionMeta {
  title: string;
  description: string;
  genreSlug: string | null;
  language: string;
  coverKey: string | null;
  tags: string[];
}

/** One chapter as captured in a version. */
export interface VersionChapter {
  /** The chapter's id at the time, so changes can be tracked across versions. */
  id: string;
  position: number;
  title: string;
  status: "draft" | "published";
  /** SHA-256 of the chapter content in `content_blobs`. */
  blob: string;
  wordCount: number;
}

export const storyVersions = pgTable(
  "story_versions",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    storyId: uuid("story_id")
      .notNull()
      .references(() => stories.id, { onDelete: "cascade" }),
    /** 1, 2, 3… per story. Shown to writers as "Version N". */
    number: integer("number").notNull(),
    kind: versionKind("kind").notNull(),
    /** The writer's description of what changed (may be empty). */
    message: text("message").notNull().default(""),
    authorId: text("author_id").references(() => users.id, { onDelete: "set null" }),
    meta: jsonb("meta").$type<VersionMeta>().notNull(),
    chapters: jsonb("chapters").$type<VersionChapter[]>().notNull(),
    wordCount: integer("word_count").notNull().default(0),
    chapterCount: integer("chapter_count").notNull().default(0),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    uniqueIndex("story_versions_story_number_idx").on(t.storyId, t.number),
    index("story_versions_story_kind_idx").on(t.storyId, t.kind),
  ],
);
