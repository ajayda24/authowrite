# Changelog

All notable changes are documented here. The format follows
[Keep a Changelog](https://keepachangelog.com/en/1.1.0/), and the project uses
[Semantic Versioning](https://semver.org/).

## [Unreleased]

### Fixed

- Builds no longer fail when environment variables are missing or blank (e.g. on Vercel).
  Configuration is now validated when the server starts, blank values fall back to defaults, and
  invalid settings produce a clear message naming the variable to fix.

### Added

- Vercel support: `APP_URL` defaults to the Vercel production URL, migrations run in
  `vercel-build`, and a warning appears if local file storage is used on Vercel.
- "Deploying to Vercel" section in the self-hosting guide.

## [0.1.0] — 2026-09-27 — V1 Foundation

### Added

- **Accounts:** sign up with name, username, email and password; sign in with email or username;
  password reset by email; profile with avatar, bio and username; optional GitHub/Google sign-in.
- **Stories:** create a story from a title only, then set the description, cover, genre, language,
  tags and visibility (Draft, Published, Unlisted, Archived); delete stories.
- **Chapters:** add, rename, reorder, publish/unpublish and delete chapters.
- **Editor:** distraction-free TipTap editor with headings, bold, italic, underline, strikethrough,
  quotes, lists, links, images, scene breaks, undo/redo; autosave with conflict detection and an
  offline safety net in the browser; one-click publishing.
- **Reader:** literary typography (Literata, Noto Serif Malayalam), font size/font/width controls,
  light, sepia and dark themes, reading progress bar, chapter navigation, "continue reading".
- **Discovery:** home page, Explore with genre/language/tag filters, Latest and Popular (a
  transparent 30-day formula), and search across stories, authors and tags.
- **Social:** likes, bookmarks, following authors, and comments on stories and chapters.
- **Platform:** PostgreSQL + Drizzle with SQL migrations, local or S3-compatible storage, Docker
  Compose setup, health check, security headers, rate limiting on auth, comments and uploads.
- **Quality:** Vitest unit/integration tests on in-process PostgreSQL, Playwright E2E tests with axe
  accessibility checks, GitHub Actions CI.
- **Docs:** architecture, content format, self-hosting guide, and ADRs 0001–0008.
