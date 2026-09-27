# 0001. One Next.js application

- Status: Accepted
- Date: 2026-09-27

## Context

Authowrite must be easy to self-host by individuals and small communities. Separate frontend and
API services, queues or caches add moving parts that most instances don't need.

## Decision

Build a single Next.js (App Router) application. Pages are Server Components, mutations are Server
Actions, and a few Route Handlers cover uploads, files, auth and health. Domain logic lives in
framework-independent services (`src/server/services`), so a public API or federation layer can be
added later without a rewrite.

## Consequences

- One container, one database, one object store. `docker compose up` is enough.
- Horizontal scaling works (stateless app), but the in-process rate limiter must be replaced with a
  shared store when running several replicas.
- The service layer keeps us from coupling domain rules to Next.js.
