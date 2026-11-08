// The one place that decides where blog content comes from.
// To move to a database or CMS: write another BlogSource and change this line.
import { fileSource } from "./file-source";

export const blog = fileSource;

// Cache Components fails the build if generateStaticParams returns nothing, so
// with no posts this hands back one slug that matches no post and renders a 404.
export async function postStaticParams() {
  const posts = await blog.listPosts();
  return posts.length > 0 ? posts.map((p) => ({ slug: p.slug })) : [{ slug: "no-posts" }];
}
export type { BlogSource, Post, PostSummary } from "./types";
