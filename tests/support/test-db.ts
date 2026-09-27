/**
 * In-process PostgreSQL (PGlite) for unit/integration tests: real SQL,
 * real migrations, no Docker required.
 */
import path from "node:path";
import { PGlite } from "@electric-sql/pglite";
import { drizzle } from "drizzle-orm/pglite";
import { migrate } from "drizzle-orm/pglite/migrator";
import { sql } from "drizzle-orm";
import * as schema from "@/server/db/schema";

let instance: ReturnType<typeof drizzle<typeof schema>> | null = null;

export async function getTestDb() {
  if (instance) return instance;
  const client = new PGlite();
  const db = drizzle(client, { schema });
  await migrate(db, { migrationsFolder: path.resolve(__dirname, "../../drizzle") });
  instance = db;
  return db;
}

/** Removes all rows except seeded reference data (genres). */
export async function resetDb() {
  const db = await getTestDb();
  await db.execute(
    sql`truncate table users, stories, chapters, tags, story_tags, uploads, story_likes, bookmarks, follows, comments, reading_progress, sessions, accounts, verifications restart identity cascade`,
  );
}
