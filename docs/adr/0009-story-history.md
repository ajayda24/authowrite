# 0009. Story history: immutable versions over content-addressed chapter text

- Status: Accepted
- Date: 2026-09-28

## Context

V2 adds "Story History": writers need to save versions, see what was published, compare versions
and restore older ones, without learning Git. Readers need a clear record of published updates.
V1 also had a gap: edits to a published chapter went live the moment they were saved.

## Decision

1. **Versions are immutable snapshots.** `story_versions` stores, per story, a sequential `number`,
   a `kind` (`saved` by the writer, `published` on every publish, `automatic` backups), an optional
   description, the author, the story details (`meta`) and an ordered list of chapters.
2. **Chapter text is content-addressed.** Each chapter entry points to a SHA-256 hash in
   `content_blobs`, which holds each unique document once. Saving a version where most chapters are
   unchanged costs almost nothing, much like Git's object store. Chapters keep their ids across
   versions, so renamed or moved chapters are still recognised.
3. **Published text is separate from the draft.** Publishing copies the chapter's text into
   `chapters.published_*`. Readers always see that copy. Edits stay private until the writer
   publishes again ("Publish changes"). `published_revision` makes unpublished edits detectable.
4. **Restores are never destructive.** Restoring a whole story or one chapter first records an
   `automatic` version of the current state, inside the same transaction. It changes the writer's
   draft only, bumps chapter revisions so open editors reload instead of overwriting, and leaves
   what readers see alone until the writer publishes.
5. **Comparison is structural in V2.** Versions are compared by chapter id and content hash:
   chapters added, removed, edited, renamed or moved; word counts; story details. Line-by-line
   text diffs are V3.

## Consequences

- History and content can't disagree: versions are written in the same transaction as the change
  they describe.
- Readers' view changes only on an explicit publish, a prerequisite for branches, suggestions and
  review later.
- Blobs are never deleted yet. A cleanup of unreferenced blobs can be added when storage matters,
  because every reference lives in `story_versions.chapters`.
- Deleting a story deletes its versions (cascade), consistent with "writers own their work".
