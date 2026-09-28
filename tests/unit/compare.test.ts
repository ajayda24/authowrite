import { describe, expect, it } from "vitest";
import { compareStates, type HistoryState } from "@/lib/history/compare";

const meta = {
  title: "Rain",
  description: "",
  genreSlug: "literary",
  language: "en",
  coverKey: null,
  tags: ["monsoon"],
};

function chapter(
  id: string,
  position: number,
  blob: string,
  title = `Chapter ${id}`,
  wordCount = 100,
) {
  return { id, position, title, status: "published" as const, blob, wordCount };
}

const base: HistoryState = {
  meta,
  chapters: [chapter("a", 1, "h1"), chapter("b", 2, "h2"), chapter("c", 3, "h3")],
};

describe("compareStates", () => {
  it("reports identical states", () => {
    const result = compareStates(base, structuredClone(base));
    expect(result.identical).toBe(true);
    expect(result.chapters.every((c) => c.change === "unchanged")).toBe(true);
  });

  it("detects edited, added and removed chapters with word totals", () => {
    const after: HistoryState = {
      meta,
      chapters: [
        chapter("a", 1, "h1"),
        chapter("b", 2, "h2-new", "Chapter b", 150),
        chapter("d", 3, "h4", "Epilogue", 40),
      ],
    };
    const result = compareStates(base, after);
    expect(result.chapters.map((c) => [c.id, c.change])).toEqual([
      ["a", "unchanged"],
      ["b", "edited"],
      ["d", "added"],
      ["c", "removed"],
    ]);
    expect(result.wordsBefore).toBe(300);
    expect(result.wordsAfter).toBe(290);
    expect(result.identical).toBe(false);
  });

  it("detects renames and real moves, not shifts caused by insertions", () => {
    const inserted: HistoryState = {
      meta,
      chapters: [
        chapter("new", 1, "hn"),
        chapter("a", 2, "h1", "Opening"),
        chapter("b", 3, "h2"),
        chapter("c", 4, "h3"),
      ],
    };
    const result = compareStates(base, inserted);
    const a = result.chapters.find((c) => c.id === "a")!;
    expect(a).toMatchObject({ renamed: true, moved: false, previousTitle: "Chapter a" });
    expect(result.chapters.find((c) => c.id === "b")!.moved).toBe(false);

    const swapped: HistoryState = {
      meta,
      chapters: [chapter("b", 1, "h2"), chapter("a", 2, "h1"), chapter("c", 3, "h3")],
    };
    const moved = compareStates(base, swapped)
      .chapters.filter((c) => c.moved)
      .map((c) => c.id);
    expect(moved.sort()).toEqual(["a", "b"]);
  });

  it("describes story detail changes, including tags", () => {
    const result = compareStates(base, {
      meta: {
        ...meta,
        title: "Monsoon",
        tags: ["monsoon", "family"],
        coverKey: "u/x/2026-09/c.png",
      },
      chapters: base.chapters,
    });
    expect(result.meta.map((m) => m.field)).toEqual(["title", "cover", "tags"]);
    expect(result.meta.find((m) => m.field === "tags")).toMatchObject({
      added: ["family"],
      removed: [],
    });
  });
});
