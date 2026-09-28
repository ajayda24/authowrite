/**
 * Compares two states of a story (two versions, or a version and the current
 * draft) and describes the differences in writer-friendly terms.
 *
 * Chapters are matched by id, so a chapter that was renamed or moved is still
 * recognised as the same chapter. Text changes are detected by content hash;
 * the line-by-line text comparison arrives in V3.
 */

export interface HistoryChapter {
  id: string;
  position: number;
  title: string;
  status: "draft" | "published";
  /** Content hash. Equal hashes mean identical text. */
  blob: string;
  wordCount: number;
}

export interface HistoryMeta {
  title: string;
  description: string;
  genreSlug: string | null;
  language: string;
  coverKey: string | null;
  tags: string[];
}

export interface HistoryState {
  meta: HistoryMeta;
  chapters: HistoryChapter[];
}

export type ChapterChangeKind = "added" | "removed" | "edited" | "unchanged";

export interface ChapterChange {
  id: string;
  change: ChapterChangeKind;
  title: string;
  previousTitle: string | null;
  renamed: boolean;
  moved: boolean;
  position: number;
  previousPosition: number | null;
  wordsBefore: number;
  wordsAfter: number;
}

export type MetaField = "title" | "description" | "genre" | "language" | "cover" | "tags";

export interface MetaChange {
  field: MetaField;
  before: string;
  after: string;
  /** For tags: which were added and removed. */
  added?: string[];
  removed?: string[];
}

export interface StoryComparison {
  chapters: ChapterChange[];
  meta: MetaChange[];
  wordsBefore: number;
  wordsAfter: number;
  /** True when nothing at all differs. */
  identical: boolean;
}

function totalWords(state: HistoryState): number {
  return state.chapters.reduce((sum, c) => sum + c.wordCount, 0);
}

function compareMeta(before: HistoryMeta, after: HistoryMeta): MetaChange[] {
  const changes: MetaChange[] = [];
  const simple: [MetaField, string, string][] = [
    ["title", before.title, after.title],
    ["description", before.description, after.description],
    ["genre", before.genreSlug ?? "", after.genreSlug ?? ""],
    ["language", before.language, after.language],
    ["cover", before.coverKey ?? "", after.coverKey ?? ""],
  ];
  for (const [field, b, a] of simple) {
    if (b !== a) changes.push({ field, before: b, after: a });
  }
  const beforeTags = new Set(before.tags);
  const afterTags = new Set(after.tags);
  const added = after.tags.filter((t) => !beforeTags.has(t));
  const removed = before.tags.filter((t) => !afterTags.has(t));
  if (added.length > 0 || removed.length > 0) {
    changes.push({
      field: "tags",
      before: before.tags.join(", "),
      after: after.tags.join(", "),
      added,
      removed,
    });
  }
  return changes;
}

/** Relative order of the chapters two states have in common. */
function commonOrder(ids: string[], shared: Set<string>): Map<string, number> {
  const order = new Map<string, number>();
  for (const id of ids) if (shared.has(id)) order.set(id, order.size);
  return order;
}

export function compareStates(before: HistoryState, after: HistoryState): StoryComparison {
  const beforeById = new Map(before.chapters.map((c) => [c.id, c]));
  const afterById = new Map(after.chapters.map((c) => [c.id, c]));
  const shared = new Set(before.chapters.filter((c) => afterById.has(c.id)).map((c) => c.id));

  // A chapter only counts as "moved" if its order relative to the other
  // surviving chapters changed, not merely because one was added before it.
  const beforeOrder = commonOrder(
    [...before.chapters].sort((a, b) => a.position - b.position).map((c) => c.id),
    shared,
  );
  const afterOrder = commonOrder(
    [...after.chapters].sort((a, b) => a.position - b.position).map((c) => c.id),
    shared,
  );

  const changes: ChapterChange[] = [];
  for (const chapter of [...after.chapters].sort((a, b) => a.position - b.position)) {
    const previous = beforeById.get(chapter.id);
    if (!previous) {
      changes.push({
        id: chapter.id,
        change: "added",
        title: chapter.title,
        previousTitle: null,
        renamed: false,
        moved: false,
        position: chapter.position,
        previousPosition: null,
        wordsBefore: 0,
        wordsAfter: chapter.wordCount,
      });
      continue;
    }
    changes.push({
      id: chapter.id,
      change: previous.blob === chapter.blob ? "unchanged" : "edited",
      title: chapter.title,
      previousTitle: previous.title,
      renamed: previous.title !== chapter.title,
      moved: beforeOrder.get(chapter.id) !== afterOrder.get(chapter.id),
      position: chapter.position,
      previousPosition: previous.position,
      wordsBefore: previous.wordCount,
      wordsAfter: chapter.wordCount,
    });
  }

  // Removed chapters are listed after the rest, in their original order.
  for (const chapter of [...before.chapters].sort((a, b) => a.position - b.position)) {
    if (afterById.has(chapter.id)) continue;
    changes.push({
      id: chapter.id,
      change: "removed",
      title: chapter.title,
      previousTitle: chapter.title,
      renamed: false,
      moved: false,
      position: chapter.position,
      previousPosition: chapter.position,
      wordsBefore: chapter.wordCount,
      wordsAfter: 0,
    });
  }

  const meta = compareMeta(before.meta, after.meta);
  const identical =
    meta.length === 0 &&
    changes.every((c) => c.change === "unchanged" && !c.renamed && !c.moved);

  return {
    chapters: changes,
    meta,
    wordsBefore: totalWords(before),
    wordsAfter: totalWords(after),
    identical,
  };
}
