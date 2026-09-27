import type { ContentNode, DocNode } from "./types";

const BLOCK_SEPARATOR = "\n\n";

function nodeText(node: ContentNode): string {
  if (node.type === "text") return node.text ?? "";
  if (node.type === "hardBreak") return "\n";
  if (node.type === "image") return "";
  const children = node.content ?? [];
  const isInlineContainer = node.type === "paragraph" || node.type === "heading";
  return children.map(nodeText).join(isInlineContainer ? "" : BLOCK_SEPARATOR);
}

/** Plain-text projection of a document (paragraphs separated by blank lines). */
export function docToText(doc: DocNode): string {
  return doc.content
    .map(nodeText)
    .filter((t) => t.trim().length > 0)
    .join(BLOCK_SEPARATOR);
}

const segmenter =
  typeof Intl !== "undefined" && "Segmenter" in Intl
    ? new Intl.Segmenter(undefined, { granularity: "word" })
    : null;

/**
 * Counts words in any script. Uses Intl.Segmenter so languages without
 * spaces, or with complex scripts such as Malayalam, are counted sensibly.
 */
export function countWords(text: string): number {
  if (!text.trim()) return 0;
  if (!segmenter) return text.trim().split(/\s+/).length;
  let count = 0;
  for (const segment of segmenter.segment(text)) if (segment.isWordLike) count++;
  return count;
}

/** Short excerpt, cut at a word boundary. */
export function excerpt(text: string, maxLength = 220): string {
  const clean = text.replace(/\s+/g, " ").trim();
  if (clean.length <= maxLength) return clean;
  const cut = clean.slice(0, maxLength);
  const lastSpace = cut.lastIndexOf(" ");
  return `${cut.slice(0, lastSpace > maxLength * 0.5 ? lastSpace : maxLength).trimEnd()}…`;
}

/** Rough reading time in minutes (230 wpm), at least 1. */
export function readingMinutes(wordCount: number): number {
  return Math.max(1, Math.round(wordCount / 230));
}
