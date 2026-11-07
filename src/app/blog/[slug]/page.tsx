import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { AppHeader } from "@/components/app-header";
import { SiteFooter } from "@/components/site-footer";
import { blog } from "@/lib/blog";
import { formatPostDate } from "@/lib/blog/format";

// Same pattern as /timer/[preset]: every post is prerendered at build time.
export const ensureStatic = "navigation";

export async function generateStaticParams() {
  return (await blog.listPosts()).map((p) => ({ slug: p.slug }));
}

export async function generateMetadata({ params }: PageProps<"/blog/[slug]">): Promise<Metadata> {
  const post = await blog.getPost((await params).slug);
  if (!post) return {};
  const url = `/blog/${post.slug}`;
  return {
    title: post.title,
    description: post.description,
    alternates: { canonical: url },
    openGraph: { type: "article", title: post.title, description: post.description, url, publishedTime: post.date },
  };
}

export default function BlogPostPage({ params }: PageProps<"/blog/[slug]">) {
  return (
    <>
      <div className="flex min-h-svh flex-col">
        <AppHeader links={[{ href: "/blog", label: "Blog" }]} />
        <main className="mx-auto w-full max-w-2xl flex-1 px-6 py-14 sm:py-20">
          {/* URL data inside Suspense keeps client-side navigation instant (see the timer pages). */}
          <Suspense fallback={null}>
            <Article params={params} />
          </Suspense>
        </main>
      </div>
      <SiteFooter />
    </>
  );
}

async function Article({ params }: { params: Promise<{ slug: string }> }) {
  const post = await blog.getPost((await params).slug);
  if (!post) notFound();

  return (
    <article>
      <Link href="/blog" className="text-xs text-faint transition-colors hover:text-fg">
        ← All posts
      </Link>
      <h1 className="mt-6 text-3xl leading-tight font-semibold tracking-tight text-balance sm:text-4xl">
        {post.title}
      </h1>
      <time dateTime={post.date} className="mt-4 block text-xs text-faint">
        {formatPostDate(post.date)}
      </time>
      {post.image && (
        // A plain <img>: cover images may live on any host, so next/image's
        // allow-list doesn't fit. Fixed aspect ratio = no layout shift.
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={post.image}
          alt=""
          fetchPriority="high"
          className="mt-8 aspect-[16/9] w-full rounded-xl border border-line-soft object-cover"
        />
      )}
      {/* Safe: renderPostBody sanitised this HTML at build time. */}
      <div className="post-body mt-10" dangerouslySetInnerHTML={{ __html: post.html }} />
    </article>
  );
}
