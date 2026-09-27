# 0002. Drizzle ORM with committed SQL migrations

- Status: Accepted
- Date: 2026-09-27

## Context

We need type-safe database access, reviewable schema changes, and the option to run migrations
without the app's toolchain (for self-hosters and DBAs).

## Decision

Use Drizzle ORM. The schema is TypeScript (`src/server/db/schema`), and `drizzle-kit generate`
produces plain SQL migrations committed in `drizzle/`. Reference data (genres) is seeded by a
custom SQL migration. The migrator is bundled into the Docker image and runs on start.

## Consequences

- No binary query engine; small runtime footprint; SQL is readable in code review.
- Tests run the real migrations against PGlite (PostgreSQL in WebAssembly), so there's no drift
  between tests and production. CI runs `drizzle-kit check` to catch schema/migration mismatches.
- Prisma was the alternative. It was rejected for its heavier runtime and less transparent
  migrations.
