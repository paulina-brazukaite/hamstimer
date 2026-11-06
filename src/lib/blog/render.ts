// Markdown → safe HTML. Runs at build time only (posts are static pages).
//
// Everything in content/blog is sanitised here, whoever wrote it, so a post
// (pasted HTML, a future CMS import) can never run scripts on the site.

import { marked } from "marked";
import sanitizeHtml from "sanitize-html";

const OPTIONS: sanitizeHtml.IOptions = {
  allowedTags: [
    "h2", "h3", "h4", "p", "br", "hr", "a", "strong", "em", "b", "i", "s", "u", "mark",
    "ul", "ol", "li", "blockquote", "code", "pre", "img", "figure", "figcaption",
    "table", "thead", "tbody", "tr", "th", "td", "sup", "sub",
  ],
  allowedAttributes: {
    a: ["href", "title", "rel", "target"],
    img: ["src", "alt", "title", "width", "height", "loading", "decoding"],
    th: ["colspan", "rowspan"],
    td: ["colspan", "rowspan"],
  },
  allowedSchemes: ["http", "https", "mailto"],
  transformTags: {
    // The page already has the post title as its <h1>.
    h1: "h2",
    a: (tagName, attribs) => {
      const external = /^https?:\/\//.test(attribs.href ?? "");
      return {
        tagName,
        attribs: external ? { ...attribs, rel: "noopener noreferrer", target: "_blank" } : attribs,
      };
    },
    img: (tagName, attribs) => ({ tagName, attribs: { ...attribs, loading: "lazy", decoding: "async" } }),
  },
};

export function renderPostBody(markdownOrHtml: string): string {
  return sanitizeHtml(marked.parse(markdownOrHtml, { async: false }), OPTIONS);
}
