# ¶ Authowrite

**Write. Publish. Discover.** Authowrite is an open-source home for stories: a calm writing tool
for authors, a literary reading experience for readers, and a platform anyone can host.

> Git for stories, without making writers use Git.

Under the hood, Authowrite is designed like a version-controlled project: it's built to support
history, alternate versions, collaboration and remixing. On the surface it's a quiet place to write
and read, with no technical words anywhere.

**Your story belongs to you.** Stories are stored in an open, documented format, and the
platform is free software you can run yourself.

---

## Status: V1 — Foundation

| For readers                                                       | For writers                                                     | For self-hosters                                     |
| ----------------------------------------------------------------- | --------------------------------------------------------------- | ---------------------------------------------------- |
| Home, Explore (genre, language, tag), Popular, Search             | Sign up → start a story → write → publish in minutes            | `docker compose up`                                  |
| Story pages with cover, chapters, likes, bookmarks, follow, share | Distraction-free editor with autosave and an offline safety net | PostgreSQL + local disk or any S3-compatible storage |
| Immersive reader: typography controls, light/sepia/dark, progress | Chapters: add, reorder, rename, publish/unpublish               | Plain SQL migrations, health check                   |
| Comments, reading history ("Continue reading")                    | Story details: cover, genre, language, tags, visibility         | AGPL-3.0, no third-party trackers or font CDNs       |

See the [CHANGELOG](CHANGELOG.md) for details and the [roadmap](#roadmap) for what's next.

## Quick start

### With Docker (recommended for trying it out)

```bash
git clone https://github.com/ajayda24/authowrite.git
cd authowrite
docker compose up
```

Open <http://localhost:3000> and create an account. Before exposing an instance to the internet,
set `BETTER_AUTH_SECRET` (see [self-hosting](docs/self-hosting.md)).

### On Vercel

Bring a PostgreSQL database and an S3-compatible bucket, set the environment variables, and deploy.
See [Deploying to Vercel](docs/self-hosting.md#deploying-to-vercel).

### For development

Requirements: Node.js 22+, pnpm 10+, PostgreSQL 16+.

```bash
pnpm install
cp .env.example .env          # adjust DATABASE_URL if needed
pnpm db:migrate               # create tables
pnpm db:seed                  # optional: demo authors and stories
pnpm dev                      # http://localhost:3000
```

Demo accounts created by the seed: `meera`, `tomas`, `aiko`, all with password `authowrite-demo`.

No local PostgreSQL? Start just the database with `docker compose up db`.

## Scripts

| Command                                        | What it does                                                                             |
| ---------------------------------------------- | ---------------------------------------------------------------------------------------- |
| `pnpm dev`                                     | Development server                                                                       |
| `pnpm build` / `pnpm start`                    | Production build / run the standalone server                                             |
| `pnpm lint` · `pnpm typecheck` · `pnpm format` | Code quality                                                                             |
| `pnpm test`                                    | Unit and integration tests (Vitest + in-process PostgreSQL via PGlite, no Docker needed) |
| `pnpm test:e2e`                                | End-to-end tests (Playwright) against a running build                                    |
| `pnpm db:generate`                             | Create a migration after changing `src/server/db/schema`                                 |
| `pnpm db:migrate` · `pnpm db:check`            | Apply migrations / verify they match the schema                                          |
| `pnpm db:seed` · `pnpm db:studio`              | Demo data / browse the database                                                          |

## Tech stack

Next.js 16 (App Router, Server Actions) · TypeScript · Tailwind CSS 4 + shadcn/ui-style components
(Radix) · PostgreSQL + Drizzle ORM · Better Auth · TipTap 3 · Vitest · Playwright · Docker.

Architecture overview: [docs/architecture.md](docs/architecture.md). Every significant decision
is recorded in [docs/adr](docs/adr).

## Project layout

```
src/
  app/                 routes: (site) pages, (focus) editor + reader, api/
  components/          ui/ primitives, editor/, reader/, story/, social/, writer/
  lib/                 shared, framework-free code (content format, slugs, utils)
  server/
    services/          ALL domain logic and authorization lives here
    actions/           thin Server Action wrappers around services
    db/                Drizzle schema, migrator, seed
    auth/ storage/ mail/
drizzle/               SQL migrations (committed)
tests/unit, tests/e2e
docs/
```

## Roadmap

Authowrite is built one version at a time. Each version is completed, tested and documented
before the next begins.

- [x] **V1 — Foundation:** writing, publishing, reading, discovery, social basics
- [ ] **V2 — Story history:** snapshots, published versions, compare and restore
- [ ] **V3 — Branches, forks and readable diffs**
- [ ] **V4 — Collaboration:** roles, suggestions, contribution review
- [ ] **V5 — Remix culture:** the Story Tree, attribution for derivatives
- [ ] **V6 — Open Story Format:** Markdown/JSON/HTML/EPUB/PDF/ZIP export
- [ ] **V7 — Git integration:** import/export to Git, GitHub, GitLab
- [ ] **V8 — Self-hosting guide, backups and upgrades** (basic Docker setup already exists)
- [ ] **V9 — Federation-ready API** (ActivityPub later)
- [ ] **V10 — Local-first and offline writing**
- [ ] **V11 — Optional, transparent AI tools** (bring your own model)
- [ ] **V12 — Community:** collections, challenges, translation projects
- [ ] **V13 — Production hardening**

## Contributing

Contributions are welcome. Please read [CONTRIBUTING.md](CONTRIBUTING.md) and our
[Code of Conduct](CODE_OF_CONDUCT.md). Security issues: see [SECURITY.md](SECURITY.md).

## License

[GNU AGPL-3.0](LICENSE). If you run a modified version of Authowrite as a service, you must make
your changes available to its users. Stories belong to their authors, not to this license.
