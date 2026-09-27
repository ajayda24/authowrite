# 0006. PostgreSQL full-text search

- Status: Accepted
- Date: 2026-09-27

## Context

Readers need to search stories, authors and tags. Dedicated search engines add infrastructure.

## Decision

Use a generated `tsvector` column on `stories` (title weighted above description) with a GIN
index, queried with `websearch_to_tsquery`, plus `ILIKE` fallbacks for partial titles, authors and
tags. The `simple` text-search configuration is used so every language, including Malayalam, is
tokenized without language-specific stemming.

## Consequences

- No extra service to run. Good enough for V1 scale.
- No stemming (e.g. "running" doesn't match "run"). A per-language configuration or an external
  engine can be introduced later behind the discovery service.
