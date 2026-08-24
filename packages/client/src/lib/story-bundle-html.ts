// ──────────────────────────────────────────────
// Story Bundle description HTML sanitization
// ──────────────────────────────────────────────
// Shared DOMPurify configuration for rendering a Story Bundle's HTML
// description safely. Used by the editor preview and the gallery so
// both surfaces render with the exact same allow-list.
import DOMPurify from "dompurify";

/** Allowed HTML tags for story bundle descriptions. */
export const ALLOWED_DESCRIPTION_TAGS = [
  "a",
  "abbr",
  "b",
  "blockquote",
  "br",
  "code",
  "dd",
  "del",
  "div",
  "dl",
  "dt",
  "em",
  "h1",
  "h2",
  "h3",
  "h4",
  "h5",
  "h6",
  "hr",
  "i",
  "img",
  "ins",
  "li",
  "mark",
  "ol",
  "p",
  "pre",
  "s",
  "small",
  "span",
  "strong",
  "sub",
  "sup",
  "table",
  "tbody",
  "td",
  "th",
  "thead",
  "tr",
  "u",
  "ul",
];

/** Sanitize story bundle description HTML for safe rendering. */
export function sanitizeStoryBundleDescription(html: string): string {
  return DOMPurify.sanitize(html, {
    ALLOWED_TAGS: ALLOWED_DESCRIPTION_TAGS,
    ALLOWED_ATTR: [
      "href",
      "target",
      "rel",
      "src",
      "alt",
      "width",
      "height",
      "class",
      "id",
      "style",
      "colspan",
      "rowspan",
      "start",
      "type",
    ],
  });
}
