<!-- BEGIN:nextjs-agent-rules -->

# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->

# Authowrite project notes

- Read `docs/architecture.md` first. All domain logic and authorization lives in
  `src/server/services`; pages and server actions must not query the database directly.
- Schema changes: edit `src/server/db/schema`, run `pnpm db:generate`, commit the SQL in `drizzle/`.
- Checks: `pnpm lint && pnpm typecheck && pnpm test`; E2E needs a build (`pnpm build`, then `pnpm test:e2e`).
- Keep writer/reader UI free of technical (Git) terminology.
- Build one roadmap version at a time (see README).
