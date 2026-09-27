# Architecture

Authowrite is a single Next.js application backed by PostgreSQL and an object store. It is
intentionally a **boring monolith** ([ADR 0001](adr/0001-nextjs-monolith.md)): one deployable, one
database, no queues or caches until they are needed.

```
Browser ──► Next.js (App Router)
              ├─ Server Components (pages)      ─┐
              ├─ Server Actions (mutations)      ├─► server/services/*  ──► PostgreSQL (Drizzle)
              └─ Route handlers (/api/*)        ─┘            │
                                                              └──────► StorageDriver (local | S3)
```

## Layers

| Layer          | Location                         | Responsibility                                                          |
| -------------- | -------------------------------- | ----------------------------------------------------------------------- |
| Routes & UI    | `src/app`, `src/components`      | Rendering, forms, client interactivity. No SQL.                         |
| Server Actions | `src/server/actions`             | Resolve the viewer, call a service, revalidate, return `{ ok, error }`. |
| Services       | `src/server/services`            | **All domain logic and authorization.** Take an explicit `actor`.       |
| Data           | `src/server/db`                  | Drizzle schema, SQL migrations, migrator, seed.                         |
| Infrastructure | `src/server/{auth,storage,mail}` | Better Auth, storage drivers, email.                                    |
| Shared         | `src/lib`                        | Framework-free code used by server and client (content format, slugs).  |

### The service rule

UI code and Server Actions never query the database directly. Every read and write goes through a
service function whose first argument is the acting user (`Actor = { id } | null`). This gives us:

- **One place for authorization.** E.g. `getEditableStory()` is the only way to load a story for
  writing, and it throws `ForbiddenError` for anyone but the author.
- **A future API for free.** A REST/JSON API (V9) or an ActivityPub inbox can call the same
  services. Nothing about them depends on Next.js.
- **Testability.** Services are tested against a real PostgreSQL (PGlite, in-process) without a
  browser — see `tests/unit/services.test.ts`.

Services throw typed domain errors (`NotFoundError`, `ForbiddenError`, `ValidationError`,
`ConflictError`, …). Actions convert them into user-facing messages; pages convert 403/404 into a
404 so private work isn't revealed.

## Data model (V1)

```
users ─┬─< stories ─┬─< chapters         (content: ProseMirror JSON)
       │            ├─< story_tags >── tags
       │            ├─< story_likes, bookmarks, comments
       │            └── genres
       ├─< follows (follower → following)
       ├─< reading_progress (one row per user × story)
       └─< uploads (tracked storage keys)
sessions, accounts, verifications — Better Auth
```

- IDs are UUIDs for domain tables (users use Better Auth's string IDs).
- `stories.status` is a single enum (`draft | published | unlisted | archived`) that covers both
  publishing state and visibility ([ADR 0007](adr/0007-single-story-status.md)).
- `chapters.revision` enables optimistic concurrency for autosave: a save only succeeds if the
  client started from the latest revision.
- Search uses a generated `tsvector` column with the language-neutral `simple` configuration and a
  GIN index ([ADR 0006](adr/0006-postgres-full-text-search.md)).

### Designed for what comes next

V1 deliberately doesn't implement versioning, but the model is shaped for it:

- **V2 history:** a story is metadata + an ordered list of self-contained chapter documents, so a
  snapshot is simply a copy of `{story fields, chapters[]}` into a `story_versions` table.
  `chapters.revision` already counts edits.
- **V3 branches/forks:** stories are addressed by `(author, slug)` and by UUID, so a fork can be a
  new story row with a `forked_from` reference without changing URLs.
- **V6 export:** content is stored in an open JSON format that maps cleanly to Markdown and HTML
  ([content-format.md](content-format.md)).
- **V9 federation:** services map naturally onto ActivityPub concepts (users → actors, stories and
  chapters → objects, follows → Follow, likes → Like, comments → Note replies).

## Content pipeline

1. The editor (TipTap) produces ProseMirror JSON.
2. On save, the server **rebuilds** the document from a whitelist (`src/lib/content/sanitize.ts`):
   unknown nodes are dropped or unwrapped, links must be `http(s)`/`mailto`/site-relative, images
   must be uploads or `https`.
3. The plain-text projection and word count are derived (`Intl.Segmenter`, works for all scripts).
4. The reader renders HTML with a tiny whitelist renderer (`src/lib/content/render.ts`) that
   escapes everything. No raw HTML is ever stored or rendered.

## Authentication

[Better Auth](adr/0003-better-auth.md) with email/password, database sessions, password reset by
email and built-in rate limiting on auth endpoints. GitHub/Google sign-in turn on automatically when
their credentials are configured. `getViewer()` (per-request memoized) is the only way pages learn
who is signed in.

## Storage

`StorageDriver` has three methods (`put`, `get`, `delete`). Drivers: local filesystem (default) and
S3-compatible. All files are served through `/api/files/*`, so URLs are identical whichever driver
is used and instances can migrate storage without rewriting content
([ADR 0005](adr/0005-storage-drivers.md)). Uploads are validated by magic bytes, limited to 5 MB,
and stored under random, never-reused keys (served with immutable caching).

## Security notes

- Server Actions are protected by Next.js' built-in Origin check; the upload endpoint checks Origin
  against Host itself. Auth cookies are `SameSite=Lax`.
- Authorization lives in services and is covered by tests (ownership, private drafts, comment
  deletion rights).
- User content is sanitized on write and escaped on render. Uploaded files are served with
  `nosniff` and a sandboxing CSP.
- Rate limits: Better Auth on sign-in/sign-up/password reset (production), plus an in-process limiter
  on comments and uploads. Replace with a shared store for multi-instance deployments (V13).
- Baseline security headers are set in `next.config.ts`.
