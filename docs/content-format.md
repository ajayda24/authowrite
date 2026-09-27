# Chapter content format

Each chapter's text is stored as a **ProseMirror/TipTap JSON document** in `chapters.content`.
It's a well-known, documented, open format that's easy to convert to Markdown, HTML or EPUB
([ADR 0004](adr/0004-prosemirror-json-content.md)). The V6 "Open Story Format" export will build on
it.

## Example

```json
{
  "type": "doc",
  "content": [
    { "type": "heading", "attrs": { "level": 2 }, "content": [{ "type": "text", "text": "Rain" }] },
    {
      "type": "paragraph",
      "content": [
        { "type": "text", "text": "The rain came " },
        { "type": "text", "text": "early", "marks": [{ "type": "italic" }] },
        { "type": "text", "text": " that year." }
      ]
    },
    { "type": "horizontalRule" }
  ]
}
```

## Allowed nodes

| Node                        | Attributes                                               | Content                           |
| --------------------------- | -------------------------------------------------------- | --------------------------------- |
| `doc`                       | —                                                        | blocks                            |
| `paragraph`                 | —                                                        | inline                            |
| `heading`                   | `level`: 2–4 (level 1 is reserved for the chapter title) | inline                            |
| `blockquote`                | —                                                        | blocks                            |
| `bulletList`, `orderedList` | `start` (ordered, optional)                              | `listItem`                        |
| `listItem`                  | —                                                        | blocks, starting with a paragraph |
| `horizontalRule`            | —                                                        | — (rendered as a scene break)     |
| `image`                     | `src` (an upload URL or `https://`), `alt`               | —                                 |
| `text`                      | —                                                        | marks                             |
| `hardBreak`                 | —                                                        | —                                 |

## Allowed marks

`bold`, `italic`, `underline`, `strike`, and `link` with `href` restricted to `http:`, `https:`,
`mailto:` or a site-relative path.

## Guarantees

- Documents are sanitized on every save (`src/lib/content/sanitize.ts`). Anything outside this
  specification is removed; unknown containers are unwrapped so text is never lost.
- `chapters.content_text` holds a plain-text projection (blocks separated by blank lines), and
  `word_count` is computed with `Intl.Segmenter`, so every script is counted correctly.
- The editor's extension list (`src/lib/content/extensions.ts`) and the sanitizer must stay in
  sync: anything the editor can produce must survive sanitization.
