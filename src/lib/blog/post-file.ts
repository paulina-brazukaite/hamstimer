// The on-disk format of a post: content/blog/<slug>.md
//
//   ---
//   title: "Why 50 minutes?"
//   description: "..."
//   date: "2026-11-06"
//   ---
//   Markdown (or HTML, which Markdown passes through) ...
//
// Every front-matter value is written as JSON, so any text (quotes, colons,
// newlines) round-trips safely. Pure functions; tested in post-file.test.ts.

export interface FrontMatter {
  title: string;
  description: string;
  date: string;
  image?: string;
  /** Drafts are kept in the repo but not shown or listed. */
  draft?: boolean;
}

export interface PostFile {
  meta: FrontMatter;
  body: string;
}

export const SLUG_PATTERN = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

export function parsePostFile(text: string): PostFile | null {
  const match = text.replace(/^﻿/, "").match(/^---\r?\n([\s\S]*?)\r?\n---\r?\n?([\s\S]*)$/);
  if (!match) return null;
  const raw: Record<string, unknown> = {};
  for (const line of match[1].split(/\r?\n/)) {
    const i = line.indexOf(":");
    if (i <= 0) continue;
    const key = line.slice(0, i).trim();
    const value = line.slice(i + 1).trim();
    try {
      raw[key] = JSON.parse(value);
    } catch {
      raw[key] = value; // allow unquoted values when a person edits by hand
    }
  }
  if (typeof raw.title !== "string" || !raw.title) return null;
  const str = (v: unknown) => (typeof v === "string" && v ? v : undefined);
  return {
    meta: {
      title: raw.title,
      description: str(raw.description) ?? "",
      date: str(raw.date) ?? "1970-01-01",
      image: str(raw.image),
      draft: raw.draft === true,
    },
    body: match[2],
  };
}

export function serializePostFile({ meta, body }: PostFile): string {
  const lines = Object.entries(meta)
    .filter(([, v]) => v !== undefined && v !== "" && v !== false)
    .map(([k, v]) => `${k}: ${JSON.stringify(v)}`);
  return `---\n${lines.join("\n")}\n---\n${body.trim()}\n`;
}

/** "Why 50 Minutes? (A Guide)" → "why-50-minutes-a-guide" */
export function slugify(text: string): string {
  return text
    .normalize("NFKD")
    .replace(/[̀-ͯ]/g, "") // strip accents: "ą" → "a"
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 80)
    .replace(/-+$/, "");
}
