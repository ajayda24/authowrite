import "server-only";
import { drizzle } from "drizzle-orm/node-postgres";
import type { PgDatabase, PgQueryResultHKT } from "drizzle-orm/pg-core";
import { Pool } from "pg";
import { env } from "@/server/env";
import * as schema from "./schema";

export type Database = PgDatabase<PgQueryResultHKT, typeof schema>;

const globalForDb = globalThis as unknown as { __authowriteDb?: Database; __authowritePool?: Pool };

function createDb(): Database {
  const pool =
    globalForDb.__authowritePool ?? new Pool({ connectionString: env.DATABASE_URL, max: 10 });
  if (env.NODE_ENV !== "production") globalForDb.__authowritePool = pool;
  return drizzle(pool, { schema });
}

/** Shared database handle. Reused across hot reloads in development. */
export const db: Database = globalForDb.__authowriteDb ?? createDb();
if (env.NODE_ENV !== "production") globalForDb.__authowriteDb = db;

export { schema };
