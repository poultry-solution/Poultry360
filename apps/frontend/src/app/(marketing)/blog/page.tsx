import type { Metadata } from "next";
import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { Badge } from "@/common/components/ui/badge";
import { Button } from "@/common/components/ui/button";
import Navbar from "@/components/landing/Navbar";
import Footer from "@/components/landing/Footer";
import {
  BLOG_SITE_URL,
  estimateReadingTime,
  formatBlogDate,
  getPublishedBlogPosts,
  getReadCountLabel,
  isBlogApiUnavailable,
  type PublicBlogPost,
} from "@/lib/blog";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Poultry Farming Blog for Nepal | Poultry360",
  description:
    "Practical poultry management articles for Nepal covering feed prices, disease alerts, broiler and layer record keeping, and farm operations.",
  alternates: {
    canonical: "/blog",
  },
  openGraph: {
    title: "Poultry Farming Blog for Nepal | Poultry360",
    description:
      "Practical poultry management articles for Nepal covering feed prices, disease alerts, broiler and layer record keeping, and farm operations.",
    url: `${BLOG_SITE_URL}/blog`,
    siteName: "Poultry360",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "Poultry Farming Blog for Nepal | Poultry360",
    description:
      "Practical poultry management articles for Nepal covering feed prices, disease alerts, broiler and layer record keeping, and farm operations.",
  },
};

export default async function BlogIndexPage() {
  let posts: PublicBlogPost[] = [];
  let isUnavailable = false;

  try {
    posts = await getPublishedBlogPosts();
  } catch (error) {
    if (isBlogApiUnavailable(error)) {
      isUnavailable = true;
    } else {
      throw error;
    }
  }

  return (
    <div className="min-h-screen bg-white">
      <Navbar />

      <main>
        <section className="border-b bg-gradient-to-b from-gray-50 to-white">
          <div className="mx-auto max-w-6xl px-4 py-16 lg:px-6 lg:py-24">
            <Badge className="mb-4 bg-primary/10 px-3 py-1 text-primary">Poultry360 Blog</Badge>
            <h1 className="max-w-3xl text-4xl font-bold tracking-tight text-gray-900 lg:text-5xl">
              Poultry farming insights built for Nepal’s real market conditions
            </h1>
            <p className="mt-5 max-w-3xl text-lg leading-8 text-gray-600">
              Feed cost pressure, monsoon disease risk, daily record keeping, and farm-management habits
              that help broiler and layer businesses make faster decisions.
            </p>
          </div>
        </section>

        <section className="mx-auto max-w-6xl px-4 py-14 lg:px-6 lg:py-16">
          {isUnavailable ? (
            <div className="rounded-2xl border border-amber-200 bg-amber-50 p-10 text-center">
              <h2 className="text-xl font-semibold text-gray-900">Blog content is temporarily unavailable</h2>
              <p className="mt-2 text-gray-600">
                The marketing site loaded, but the blog API could not be reached. In local development,
                start the backend on `http://localhost:8081` or set `API_URL_INTERNAL`.
              </p>
            </div>
          ) : posts.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-gray-300 bg-gray-50 p-10 text-center">
              <h2 className="text-xl font-semibold text-gray-900">No blog posts published yet</h2>
              <p className="mt-2 text-gray-600">
                Publish your first article from the Super Admin dashboard and it will appear here automatically.
              </p>
            </div>
          ) : (
            <div className="grid gap-6 lg:grid-cols-2">
              {posts.map((post) => (
                <article
                  key={post.id}
                  className="flex h-full flex-col rounded-3xl border border-gray-200 bg-white p-6 shadow-sm transition-shadow hover:shadow-md"
                >
                  <div className="flex flex-wrap items-center gap-3 text-sm text-gray-500">
                    <span>{formatBlogDate(post.publishedAt)}</span>
                    <span>{post.authorName}</span>
                    <span>{estimateReadingTime(post.contentMarkdown)} min read</span>
                    <span>{getReadCountLabel(post.viewCount)}</span>
                  </div>
                  <h2 className="mt-4 text-2xl font-semibold tracking-tight text-gray-900">
                    <Link href={`/blog/${post.slug}`} className="hover:text-primary">
                      {post.title}
                    </Link>
                  </h2>
                  <p className="mt-4 flex-1 leading-7 text-gray-600">{post.excerpt}</p>
                  <div className="mt-6">
                    <Link
                      href={`/blog/${post.slug}`}
                      className="inline-flex items-center font-medium text-primary"
                    >
                      Read article
                      <ArrowRight className="ml-2 size-4" />
                    </Link>
                  </div>
                </article>
              ))}
            </div>
          )}
        </section>

        <section className="border-t bg-gray-50">
          <div className="mx-auto max-w-6xl px-4 py-14 lg:px-6">
            <div className="rounded-3xl bg-white p-8 shadow-sm ring-1 ring-gray-100">
              <h2 className="text-2xl font-semibold text-gray-900">Turn blog readers into active farm operators</h2>
              <p className="mt-3 max-w-2xl text-gray-600">
                Show readers how they can track mortality, feed use, cash flow, and sales inside one system.
              </p>
              <div className="mt-6 flex flex-wrap gap-3">
                <Button asChild>
                  <Link href="/#features">Explore Poultry360 Features</Link>
                </Button>
                <Button asChild variant="outline">
                  <Link href="/marketplace">Visit Marketplace</Link>
                </Button>
              </div>
            </div>
          </div>
        </section>
      </main>

      <Footer />
    </div>
  );
}
