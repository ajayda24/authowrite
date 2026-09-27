# 0004. ProseMirror JSON as canonical chapter content

- Status: Accepted
- Date: 2026-09-27

## Context

Chapter text must be safe to render, portable, and suitable for future diffs, versions and exports.
The options were HTML, Markdown, or the editor's native JSON.

## Decision

Store each chapter as a sanitized ProseMirror/TipTap JSON document (see
[content-format.md](../content-format.md)). The server rebuilds every document from a strict
whitelist on save and renders HTML with a small escaping renderer. A plain-text projection is kept
for search and word counts.

## Consequences

- Structured content makes paragraph-level diffs (V3) and conversions to Markdown/EPUB (V6)
  straightforward.
- No stored HTML means no stored XSS. The renderer re-checks URLs as defence in depth.
- Editor extensions and the sanitizer must be kept in sync when formatting options are added.
