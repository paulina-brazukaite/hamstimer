// BlogSource backed by Markdown files in content/blog, committed to the repo.
// Add a post: create content/blog/<slug>.md, commit, push. Vercel rebuilds.

import { readFile, readdir } from "node:fs/promises";
import { join } from "node:path";
import { SLUG_PATTERN, parsePostFile } from "./post-file";
import { renderPostBody } from "./render";
import type { BlogSource, Post, PostSummary } from "./types";

const DIR = join(process.cwd(), "content/blog");

// 'use cache': with Cache Components on, reading files is "uncached data".
// Caching it lets Next build the blog pages as static HTML.
async function readAll(): Promise<Post[]> {
  "use cache";
  let names: string[] = [];
  try {
    names = await readdir(DIR);
  } catch {
    return []; // no content/blog folder yet
  }
  const posts: Post[] = [];
  for (const name of names) {
    const slug = name.replace(/\.md$/, "");
    if (!name.endsWith(".md") || !SLUG_PATTERN.test(slug)) continue;
    const file = parsePostFile(await readFile(join(DIR, name), "utf8"));
    if (!file || file.meta.draft) continue;
    const { title, description, date, image } = file.meta;
    posts.push({ slug, title, description, date, image, html: renderPostBody(file.body) });
  }
  return posts.sort((a, b) => b.date.localeCompare(a.date));
}

export const fileSource: BlogSource = {
  async listPosts(): Promise<PostSummary[]> {
    return (await readAll()).map(({ slug, title, description, date, image }) => ({
      slug,
      title,
      description,
      date,
      image,
    }));
  },
  async getPost(slug: string): Promise<Post | null> {
    return (await readAll()).find((p) => p.slug === slug) ?? null;
  },
};
