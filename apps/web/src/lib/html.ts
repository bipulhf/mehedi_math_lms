import DOMPurify from "isomorphic-dompurify";

const allowedTags = [
  "p",
  "br",
  "strong",
  "b",
  "em",
  "i",
  "u",
  "s",
  "h1",
  "h2",
  "h3",
  "ul",
  "ol",
  "li",
  "blockquote",
  "a"
];

const allowedAttributes = ["href", "target", "rel"];

export function sanitizeHtml(html: string): string {
  return DOMPurify.sanitize(html, {
    ALLOWED_ATTR: allowedAttributes,
    ALLOWED_TAGS: allowedTags,
    KEEP_CONTENT: true
  });
}

export function stripHtml(html: string): string {
  return DOMPurify.sanitize(html, { ALLOWED_TAGS: [] });
}

export function isEmptyHtml(html: string): boolean {
  return stripHtml(html).trim().length === 0;
}
