#!/bin/sh
set -e

if [ -z "$BETTER_AUTH_SECRET" ] || [ "$BETTER_AUTH_SECRET" = "change-me-to-a-long-random-string" ]; then
  echo "WARNING: BETTER_AUTH_SECRET is not set to a unique value. Set one before exposing this instance." >&2
fi

if [ "${SKIP_MIGRATIONS:-false}" != "true" ]; then
  node migrate.mjs
fi

exec node server.js
