CREATE TYPE "public"."version_kind" AS ENUM('saved', 'published', 'automatic');--> statement-breakpoint
CREATE TABLE "content_blobs" (
	"hash" text PRIMARY KEY NOT NULL,
	"content" jsonb NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "story_versions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"story_id" uuid NOT NULL,
	"number" integer NOT NULL,
	"kind" "version_kind" NOT NULL,
	"message" text DEFAULT '' NOT NULL,
	"author_id" text,
	"meta" jsonb NOT NULL,
	"chapters" jsonb NOT NULL,
	"word_count" integer DEFAULT 0 NOT NULL,
	"chapter_count" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "chapters" ADD COLUMN "published_content" jsonb;--> statement-breakpoint
ALTER TABLE "chapters" ADD COLUMN "published_title" text;--> statement-breakpoint
ALTER TABLE "chapters" ADD COLUMN "published_word_count" integer DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE "chapters" ADD COLUMN "published_revision" integer;--> statement-breakpoint
ALTER TABLE "story_versions" ADD CONSTRAINT "story_versions_story_id_stories_id_fk" FOREIGN KEY ("story_id") REFERENCES "public"."stories"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "story_versions" ADD CONSTRAINT "story_versions_author_id_users_id_fk" FOREIGN KEY ("author_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "story_versions_story_number_idx" ON "story_versions" USING btree ("story_id","number");--> statement-breakpoint
CREATE INDEX "story_versions_story_kind_idx" ON "story_versions" USING btree ("story_id","kind");--> statement-breakpoint
-- Chapters published before story history existed: what readers see is the
-- current text, so copy it into the new "published" columns.
UPDATE "chapters"
SET "published_content" = "content",
    "published_title" = "title",
    "published_word_count" = "word_count",
    "published_revision" = "revision"
WHERE "status" = 'published';
