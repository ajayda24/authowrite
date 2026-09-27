# Contributing to Authowrite

Thanks for helping build an open home for stories. Code, design, docs, translations and bug reports
all count as contributions.

## Principles to keep in mind

1. **Writers own their content.** Never add anything that locks stories in.
2. **Simple for normal people.** Git-like ideas stay under the hood. Avoid technical words in the
   writer and reader UI ("history", not "commits"; "story details", not "metadata").
3. **Calm, editorial design.** Strong typography, whitespace, subtle borders. No gradients,
   glassmorphism or gratuitous animation.
4. **Boring technology.** Prefer existing dependencies and PostgreSQL features over new services.
5. **One version at a time.** Check the roadmap. Features from future versions need discussion first.

## Getting started

```bash
pnpm install
cp .env.example .env
docker compose up -d db     # or use your own PostgreSQL
pnpm db:migrate && pnpm db:seed
pnpm dev
```

## Before opening a pull request

```bash
pnpm lint && pnpm typecheck && pnpm test
pnpm build && pnpm test:e2e   # for UI or flow changes
```

- **Domain logic goes in `src/server/services`,** with authorization checks and unit tests. Pages
  and actions stay thin.
- **Schema changes:** edit `src/server/db/schema`, then run `pnpm db:generate` and commit the SQL.
  Never edit a migration that has been released.
- **Content format changes:** update both `src/lib/content/extensions.ts` and
  `src/lib/content/sanitize.ts`, plus `docs/content-format.md`.
- **Accessibility:** keyboard reachable, labelled controls, visible focus, AA contrast. The E2E
  suite runs axe on key pages.
- **Significant decisions:** add an ADR in `docs/adr`.
- Update `CHANGELOG.md` under "Unreleased".

## Commit messages

Use the imperative mood ("Add chapter reordering") with a short body explaining _why_.

## Licensing

By contributing, you agree that your contributions are licensed under the AGPL-3.0.
