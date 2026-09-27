# 0007. One status field for publishing and visibility

- Status: Accepted
- Date: 2026-09-27

## Context

The V1 spec lists both "visibility" and "publishing status" (Draft, Published, Unlisted,
Archived). Two fields would allow meaningless combinations such as "draft + public".

## Decision

A single `stories.status` enum: `draft` (only the author), `published` (listed and readable),
`unlisted` (readable by link, not listed), `archived` (hidden, restorable). Chapters have their own
`draft | published` status. A story can only become published or unlisted once at least one chapter
is published.

## Consequences

- Simple UI: one "Who can read this story?" choice with plain-language descriptions.
- Collaboration-era visibility (e.g. "collaborators only") can be added as new enum values.
