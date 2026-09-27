/**
 * Server-side sanitizer for chapter documents.
 *
 * Every document coming from a client is rebuilt from scratch using a strict
 * whitelist of nodes, marks and attributes. Anything unknown is dropped (or,
 * for unknown containers, unwrapped so the writer's text is not lost). The
 * result is safe to store and to render with `renderDocToHtml`.
 */
import type { BlockType, ContentNode, DocNode, Mark, MarkType } from "./types";

const MAX_DEPTH = 12;
const MAX_NODES = 50_000;
const MAX_TEXT_LENGTH = 1_000_000;

const BLOCK_CONTAINERS = new Set<BlockType>(["blockquote", "bulletList", "orderedList", "listItem"]);
const TEXT_BLOCKS = new Set<BlockType>(["paragraph", "heading"]);
const SIMPLE_MARKS = new Set<MarkType>(["bold", "italic", "underline", "strike"]);

/** Returns true for URLs that are safe to use in a link. */
export function isSafeHref(href: unknown): href is string {
  if (typeof href !== "string") return false;
  const value = href.trim();
  if (value.length === 0 || value.length > 2048) return false;
  // Site-relative paths (but not protocol-relative "//host").
  if (value.startsWith("/") && !value.startsWith("//")) return true;
  try {
    const url = new URL(value);
    return ["http:", "https:", "mailto:"].includes(url.protocol);
  } catch {
    return false;
  }
}

/** Returns true for image sources we are willing to render. */
export function isSafeImageSrc(src: unknown): src is string {
  if (typeof src !== "string") return false;
  const value = src.trim();
  if (value.startsWith("/api/files/") && !value.includes("..")) return true;
  try {
    return new URL(value).protocol === "https:";
  } catch {
    return false;
  }
}

interface Budget {
  nodes: number;
  text: number;
}

function sanitizeMarks(marks: unknown): Mark[] | undefined {
  if (!Array.isArray(marks)) return undefined;
  const out: Mark[] = [];
  const seen = new Set<string>();
  for (const mark of marks) {
    if (!mark || typeof mark !== "object") continue;
    const type = (mark as { type?: unknown }).type;
    if (typeof type !== "string" || seen.has(type)) continue;
    if (SIMPLE_MARKS.has(type as MarkType)) {
      out.push({ type: type as MarkType });
      seen.add(type);
    } else if (type === "link") {
      const href = (mark as { attrs?: { href?: unknown } }).attrs?.href;
      if (isSafeHref(href)) {
        out.push({ type: "link", attrs: { href: href.trim() } });
        seen.add(type);
      }
    }
  }
  return out.length > 0 ? out : undefined;
}

function sanitizeInline(nodes: unknown, budget: Budget): ContentNode[] {
  if (!Array.isArray(nodes)) return [];
  const out: ContentNode[] = [];
  for (const node of nodes) {
    if (!node || typeof node !== "object") continue;
    if (++budget.nodes > MAX_NODES) break;
    const n = node as Record<string, unknown>;
    if (n.type === "text" && typeof n.text === "string" && n.text.length > 0) {
      const remaining = MAX_TEXT_LENGTH - budget.text;
      if (remaining <= 0) break;
      const text = n.text.slice(0, remaining);
      budget.text += text.length;
      const marks = sanitizeMarks(n.marks);
      out.push(marks ? { type: "text", text, marks } : { type: "text", text });
    } else if (n.type === "hardBreak") {
      out.push({ type: "hardBreak" });
    } else if (Array.isArray(n.content)) {
      // Unknown inline wrapper: keep its text.
      out.push(...sanitizeInline(n.content, budget));
    }
  }
  return out;
}

function sanitizeBlocks(nodes: unknown, budget: Budget, depth: number): ContentNode[] {
  if (!Array.isArray(nodes) || depth > MAX_DEPTH) return [];
  const out: ContentNode[] = [];
  for (const node of nodes) {
    if (!node || typeof node !== "object") continue;
    if (++budget.nodes > MAX_NODES) break;
    const n = node as Record<string, unknown>;
    const type = n.type as BlockType;
    const attrs = (n.attrs ?? {}) as Record<string, unknown>;

    if (TEXT_BLOCKS.has(type)) {
      const content = sanitizeInline(n.content, budget);
      const block: ContentNode = { type };
      if (type === "heading") {
        const level = Number(attrs.level);
        block.attrs = { level: level >= 2 && level <= 4 ? level : 2 };
      }
      if (content.length > 0) block.content = content;
      out.push(block);
    } else if (type === "horizontalRule") {
      out.push({ type: "horizontalRule" });
    } else if (type === "image") {
      if (isSafeImageSrc(attrs.src)) {
        const alt = typeof attrs.alt === "string" ? attrs.alt.slice(0, 500) : "";
        out.push({ type: "image", attrs: { src: attrs.src.trim(), alt } });
      }
    } else if (BLOCK_CONTAINERS.has(type)) {
      let children = sanitizeBlocks(n.content, budget, depth + 1);
      if (type === "bulletList" || type === "orderedList") {
        // Lists may only contain list items.
        children = children.map((c) =>
          c.type === "listItem" ? c : { type: "listItem", content: [c] },
        );
      } else if (type === "listItem") {
        // List items must start with a paragraph.
        if (children.length === 0 || children[0].type !== "paragraph") {
          children.unshift({ type: "paragraph" });
        }
      }
      if (children.length === 0) continue;
      const block: ContentNode = { type, content: children };
      if (type === "orderedList") {
        const start = Number(attrs.start);
        if (Number.isInteger(start) && start > 1 && start < 100_000) block.attrs = { start };
      }
      out.push(block);
    } else if (n.type === "text" || n.type === "hardBreak") {
      // Stray inline content at block level: wrap it in a paragraph.
      const content = sanitizeInline([n], budget);
      if (content.length > 0) out.push({ type: "paragraph", content });
    } else if (Array.isArray(n.content)) {
      // Unknown container: unwrap it so the text is preserved.
      out.push(...sanitizeBlocks(n.content, budget, depth + 1));
    }
  }
  return out;
}

export function sanitizeDoc(input: unknown): DocNode {
  const budget: Budget = { nodes: 0, text: 0 };
  const raw = input && typeof input === "object" ? (input as { content?: unknown }).content : [];
  const content = sanitizeBlocks(raw, budget, 0);
  return { type: "doc", content: content.length > 0 ? content : [{ type: "paragraph" }] };
}
