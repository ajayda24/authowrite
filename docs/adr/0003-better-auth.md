# 0003. Better Auth instead of Auth.js

- Status: Accepted
- Date: 2026-09-27

## Context

V1 requires email/password sign-in with an OAuth-ready design. Auth.js supports email/password only
through its Credentials provider, which forces JWT sessions and leaves password hashing, reset
flows and rate limiting to the application; the project discourages that setup.

## Decision

Use Better Auth (MIT) with its Drizzle adapter: email/password with scrypt hashing, database
sessions, password reset, built-in rate limiting, and the username plugin. GitHub/Google providers
are enabled automatically when credentials are configured.

## Consequences

- Sessions live in PostgreSQL and can be revoked (e.g. on password reset).
- Auth tables (`users`, `sessions`, `accounts`, `verifications`) follow Better Auth's model;
  upgrades must check its migration notes.
- Adding passkeys, 2FA or magic links later is a plugin, not a rewrite.
