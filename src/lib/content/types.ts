/**
 * The canonical chapter format is a ProseMirror / TipTap JSON document limited
 * to the nodes and marks below. See docs/content-format.md.
 */

export type MarkType = "bold" | "italic" | "underline" | "strike" | "link";

export interface Mark {
  type: MarkType;
  attrs?: { href?: string };
}

export type BlockType =
  | "paragraph"
  | "heading"
  | "blockquote"
  | "bulletList"
  | "orderedList"
  | "listItem"
  | "horizontalRule"
  | "image"
  | "hardBreak"
  | "text";

export interface ContentNode {
  type: BlockType;
  attrs?: Record<string, string | number | null>;
  content?: ContentNode[];
  marks?: Mark[];
  text?: string;
}

export interface DocNode {
  type: "doc";
  content: ContentNode[];
}

export const EMPTY_DOC: DocNode = { type: "doc", content: [{ type: "paragraph" }] };
