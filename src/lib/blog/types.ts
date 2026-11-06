// The blog's data shapes and the one interface every content source implements.
// Pages only ever talk to `BlogSource`, so the content can move (files in the
// repo today, a database or CMS later) without touching any page.

export interface PostSummary {
  slug: string;
  title: string;
  description: string;
  /** ISO date, e.g. "2026-11-06". */
  date: string;
  /** Optional cover image (absolute URL or /path). */
  image?: string;
}

export interface Post extends PostSummary {
  /** Sanitised HTML, safe to render. */
  html: string;
}

export interface BlogSource {
  /** Published posts, newest first. */
  listPosts(): Promise<PostSummary[]>;
  /** One published post, or null if there's no such slug (or it's a draft). */
  getPost(slug: string): Promise<Post | null>;
}
