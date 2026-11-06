import type { Metadata } from "next";
import Link from "next/link";
import { AppHeader } from "@/components/app-header";
import { SiteFooter } from "@/components/site-footer";
import { blog } from "@/lib/blog";
import { formatPostDate } from "@/lib/blog/format";

export const metadata: Metadata = {
  title: "Blog",
  description: "Notes on focus, breaks and picking work back up, from the people who make Nextline.",
  alternates: { canonical: "/blog" },
  openGraph: { url: "/blog" },
};

// Built once as static HTML; a new post means a new build.
export const ensureStatic = "navigation";

export default async function BlogIndex() {
  const posts = await blog.listPosts();
  return (
    <>
      <div className="flex min-h-svh flex-col">
        <AppHeader links={[{ href: "/", label: "Timer" }]} />
        <main className="mx-auto w-full max-w-2xl flex-1 px-6 py-14 sm:py-20">
          <h1 className="text-2xl font-semibold tracking-tight sm:text-3xl">Blog</h1>
          {posts.length === 0 ? (
            <p className="mt-8 text-muted">No posts yet.</p>
          ) : (
            <ol className="mt-10 border-t border-line-soft">
              {posts.map((p) => (
                <li key={p.slug} className="border-b border-line-soft">
                  <Link href={`/blog/${p.slug}`} className="group block py-6">
                    <time dateTime={p.date} className="font-mono text-xs text-faint">
                      {formatPostDate(p.date)}
                    </time>
                    <h2 className="mt-2 text-lg font-semibold tracking-tight text-fg group-hover:underline group-hover:decoration-line group-hover:underline-offset-4">
                      {p.title}
                    </h2>
                    {p.description && <p className="mt-2 text-[15px] leading-relaxed text-muted">{p.description}</p>}
                  </Link>
                </li>
              ))}
            </ol>
          )}
        </main>
      </div>
      <SiteFooter />
    </>
  );
}
