# 0005. Storage behind a small driver interface

- Status: Accepted
- Date: 2026-09-27

## Context

Self-hosters use anything from a single VPS disk to S3, R2 or MinIO. Later versions may add
IPFS or other decentralized storage.

## Decision

Define `StorageDriver { put, get, delete }` with `local` and `s3` implementations, chosen with
`STORAGE_DRIVER`. All files are served through `/api/files/<key>`, whatever the driver.

## Consequences

- Content never embeds provider-specific URLs, so storage can be migrated by copying objects.
- Serving through the app costs some bandwidth. A CDN in front of `/api/files` (immutable caching
  headers are already set) or signed direct URLs can be added in V13.
