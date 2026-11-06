import { OG_SIZE, renderOg } from "@/lib/og";
import { blog } from "@/lib/blog";

export const alt = "Nextline blog post";
export const size = OG_SIZE;
export const contentType = "image/png";

export async function generateStaticParams() {
  return (await blog.listPosts()).map((p) => ({ slug: p.slug }));
}

export default async function Image({ params }: { params: Promise<{ slug: string }> }) {
  const post = await blog.getPost((await params).slug);
  return renderOg({ title: post?.title ?? "Nextline blog", eyebrow: "Blog" });
}
