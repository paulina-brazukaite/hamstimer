import type { MetadataRoute } from "next";
import { SITE_URL } from "@/lib/site";
import { TIMER_PAGES } from "@/lib/timer-pages";

export default function sitemap(): MetadataRoute.Sitemap {
  return [
    { url: SITE_URL, changeFrequency: "monthly", priority: 1 },
    ...TIMER_PAGES.map((p) => ({
      url: `${SITE_URL}/timer/${p.slug}`,
      changeFrequency: "monthly" as const,
      priority: 0.8,
    })),
    { url: `${SITE_URL}/about`, changeFrequency: "yearly", priority: 0.5 },
  ];
}
