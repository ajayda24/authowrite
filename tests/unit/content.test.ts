import { describe, expect, it } from "vitest";
import { renderDocToHtml } from "@/lib/content/render";
import { isSafeHref, isSafeImageSrc, sanitizeDoc } from "@/lib/content/sanitize";
import { countWords, docToText, excerpt } from "@/lib/content/text";

describe("sanitizeDoc", () => {
  it("keeps supported structure", () => {
    const input = {
      type: "doc",
      content: [
        { type: "heading", attrs: { level: 2 }, content: [{ type: "text", text: "Rain" }] },
        {
          type: "paragraph",
          content: [
            { type: "text", text: "It ", marks: [{ type: "bold" }] },
            { type: "text", text: "fell", marks: [{ type: "italic" }, { type: "underline" }] },
          ],
        },
        {
          type: "blockquote",
          content: [{ type: "paragraph", content: [{ type: "text", text: "q" }] }],
        },
        {
          type: "bulletList",
          content: [
            {
              type: "listItem",
              content: [{ type: "paragraph", content: [{ type: "text", text: "a" }] }],
            },
          ],
        },
        { type: "horizontalRule" },
        { type: "image", attrs: { src: "/api/files/u/1/2026-09/x.png", alt: "Cover" } },
      ],
    };
    expect(sanitizeDoc(input)).toEqual(input);
  });

  it("drops javascript: links but keeps the text", () => {
    const out = sanitizeDoc({
      type: "doc",
      content: [
        {
          type: "paragraph",
          content: [
            {
              type: "text",
              text: "click",
              marks: [{ type: "link", attrs: { href: "javascript:alert(1)" } }],
            },
          ],
        },
      ],
    });
    expect(out.content[0].content?.[0]).toEqual({ type: "text", text: "click" });
  });

  it("removes unknown nodes, unsafe images and attributes", () => {
    const out = sanitizeDoc({
      type: "doc",
      content: [
        { type: "script", text: "alert(1)" },
        { type: "image", attrs: { src: "javascript:alert(1)" } },
        { type: "image", attrs: { src: "http://insecure.example/x.png" } },
        {
          type: "paragraph",
          attrs: { onclick: "alert(1)", style: "x" },
          content: [{ type: "text", text: "ok" }],
        },
      ],
    });
    expect(out).toEqual({
      type: "doc",
      content: [{ type: "paragraph", content: [{ type: "text", text: "ok" }] }],
    });
  });

  it("unwraps unknown containers so text survives", () => {
    const out = sanitizeDoc({
      type: "doc",
      content: [
        {
          type: "callout",
          content: [{ type: "paragraph", content: [{ type: "text", text: "kept" }] }],
        },
      ],
    });
    expect(docToText(out)).toBe("kept");
  });

  it("clamps heading levels and always returns a non-empty doc", () => {
    expect(
      sanitizeDoc({ type: "doc", content: [{ type: "heading", attrs: { level: 1 } }] }).content[0]
        .attrs,
    ).toEqual({ level: 2 });
    expect(sanitizeDoc(null)).toEqual({ type: "doc", content: [{ type: "paragraph" }] });
    expect(sanitizeDoc("<script>")).toEqual({ type: "doc", content: [{ type: "paragraph" }] });
  });
});

describe("renderDocToHtml", () => {
  it("escapes text and attributes", () => {
    const html = renderDocToHtml(
      sanitizeDoc({
        type: "doc",
        content: [
          { type: "paragraph", content: [{ type: "text", text: "<img src=x onerror=alert(1)>" }] },
          { type: "image", attrs: { src: "https://example.com/a.png", alt: '"><script>' } },
        ],
      }),
    );
    expect(html).not.toContain("<script>");
    expect(html).not.toContain("<img src=x");
    expect(html).toContain("&lt;img src=x onerror=alert(1)&gt;");
    expect(html).toContain('alt="&quot;&gt;&lt;script&gt;"');
  });

  it("renders external links safely", () => {
    const html = renderDocToHtml(
      sanitizeDoc({
        type: "doc",
        content: [
          {
            type: "paragraph",
            content: [
              {
                type: "text",
                text: "site",
                marks: [{ type: "link", attrs: { href: "https://example.com" } }],
              },
            ],
          },
        ],
      }),
    );
    expect(html).toBe(
      '<p><a href="https://example.com" target="_blank" rel="noopener noreferrer nofollow ugc">site</a></p>',
    );
  });
});

describe("url checks", () => {
  it.each([
    ["https://example.com", true],
    ["mailto:a@b.c", true],
    ["/stories", true],
    ["//evil.com", false],
    ["javascript:alert(1)", false],
    ["data:text/html,hi", false],
    [" JAVASCRIPT:alert(1)", false],
  ])("href %s → %s", (href, ok) => expect(isSafeHref(href)).toBe(ok));

  it("only allows uploaded or https images", () => {
    expect(isSafeImageSrc("/api/files/u/1/2026-09/a.png")).toBe(true);
    expect(isSafeImageSrc("/api/files/../secret")).toBe(false);
    expect(isSafeImageSrc("data:image/png;base64,AAA")).toBe(false);
  });
});

describe("text helpers", () => {
  it("counts words in English and Malayalam", () => {
    expect(countWords("The rain came early that year.")).toBe(6);
    expect(countWords("മഴ വന്നു")).toBe(2);
    expect(countWords("   ")).toBe(0);
  });

  it("cuts excerpts at word boundaries", () => {
    expect(excerpt("one two three four five", 12)).toBe("one two…");
    expect(excerpt("short", 12)).toBe("short");
  });
});
