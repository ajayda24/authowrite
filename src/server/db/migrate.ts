/**
 * Applies pending SQL migrations from ./drizzle. Used by `pnpm db:migrate`
 * and by the Docker entrypoint before the server starts.
 */
import "dotenv/config";
import path from "node:path";
import { drizzle } from "drizzle-orm/node-postgres";
import { migrate } from "drizzle-orm/node-postgres/migrator";
import { Pool } from "pg";

async function main() {
  const url =
    process.env.DATABASE_URL ?? "postgres://authowrite:authowrite@localhost:5432/authowrite";
  const pool = new Pool({ connectionString: url, max: 1 });
  const migrationsFolder = process.env.MIGRATIONS_DIR ?? path.join(process.cwd(), "drizzle");
  console.log(`Applying migrations from ${migrationsFolder}…`);
  await migrate(drizzle(pool), { migrationsFolder });
  await pool.end();
  console.log("Database is up to date.");
}

main().catch((error) => {
  console.error("Migration failed:", error);
  process.exit(1);
});
