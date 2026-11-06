import type { MetadataRoute } from "next";
import { SITE_URL } from "@/lib/site";
import { TIMER_PAGES } from "@/lib/timer-pages";
import { blog } from "@/lib/blog";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const posts = await blog.listPosts();
  return [
    { url: SITE_URL, changeFrequency: "monthly", priority: 1 },
    ...TIMER_PAGES.map((p) => ({
      url: `${SITE_URL}/timer/${p.slug}`,
      changeFrequency: "monthly" as const,
      priority: 0.8,
    })),
    { url: `${SITE_URL}/blog`, changeFrequency: "weekly", priority: 0.6 },
    ...posts.map((p) => ({
      url: `${SITE_URL}/blog/${p.slug}`,
      lastModified: p.date,
      changeFrequency: "yearly" as const,
      priority: 0.5,
    })),
    { url: `${SITE_URL}/about`, changeFrequency: "yearly", priority: 0.5 },
  ];
}
