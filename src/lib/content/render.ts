/**
 * Renders a sanitized document to HTML. Only whitelisted nodes/marks are
 * emitted and all text and attributes are escaped, so this is safe to use with
 * `dangerouslySetInnerHTML` for documents that went through `sanitizeDoc`.
 * As defence in depth, links and images are re-checked here as well.
 */
import { isSafeHref, isSafeImageSrc } from "./sanitize";
import type { ContentNode, DocNode, Mark } from "./types";

export function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function wrapMark(html: string, mark: Mark): string {
  switch (mark.type) {
    case "bold":
      return `<strong>${html}</strong>`;
    case "italic":
      return `<em>${html}</em>`;
    case "underline":
      return `<u>${html}</u>`;
    case "strike":
      return `<s>${html}</s>`;
    case "link": {
      const href = mark.attrs?.href;
      if (!isSafeHref(href)) return html;
      const external = !href.startsWith("/");
      const extra = external ? ' target="_blank" rel="noopener noreferrer nofollow ugc"' : "";
      return `<a href="${escapeHtml(href)}"${extra}>${html}</a>`;
    }
    default:
      return html;
  }
}

function renderNodes(nodes: ContentNode[] | undefined): string {
  return (nodes ?? []).map(renderNode).join("");
}

function renderNode(node: ContentNode): string {
  switch (node.type) {
    case "text": {
      let html = escapeHtml(node.text ?? "");
      for (const mark of node.marks ?? []) html = wrapMark(html, mark);
      return html;
    }
    case "hardBreak":
      return "<br>";
    case "paragraph":
      return `<p>${renderNodes(node.content)}</p>`;
    case "heading": {
      const level = Math.min(4, Math.max(2, Number(node.attrs?.level) || 2));
      return `<h${level}>${renderNodes(node.content)}</h${level}>`;
    }
    case "blockquote":
      return `<blockquote>${renderNodes(node.content)}</blockquote>`;
    case "bulletList":
      return `<ul>${renderNodes(node.content)}</ul>`;
    case "orderedList": {
      const start = Number(node.attrs?.start);
      const attr = Number.isInteger(start) && start > 1 ? ` start="${start}"` : "";
      return `<ol${attr}>${renderNodes(node.content)}</ol>`;
    }
    case "listItem":
      return `<li>${renderNodes(node.content)}</li>`;
    case "horizontalRule":
      return "<hr>";
    case "image": {
      const src = node.attrs?.src;
      if (!isSafeImageSrc(src)) return "";
      const alt = typeof node.attrs?.alt === "string" ? node.attrs.alt : "";
      return `<figure><img src="${escapeHtml(src)}" alt="${escapeHtml(alt)}" loading="lazy" decoding="async"></figure>`;
    }
    default:
      return "";
  }
}

export function renderDocToHtml(doc: DocNode): string {
  return renderNodes(doc.content);
}
