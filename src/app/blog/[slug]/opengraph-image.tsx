import { OG_SIZE, renderOg } from "@/lib/og";
import { blog, postStaticParams } from "@/lib/blog";

export const alt = "BusyHamster blog post";
export const size = OG_SIZE;
export const contentType = "image/png";

export const generateStaticParams = postStaticParams;

export default async function Image({ params }: { params: Promise<{ slug: string }> }) {
  const post = await blog.getPost((await params).slug);
  return renderOg({ title: post?.title ?? "BusyHamster blog", eyebrow: "Blog" });
}
