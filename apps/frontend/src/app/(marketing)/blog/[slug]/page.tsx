import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, ArrowRight } from "lucide-react";
import { Badge } from "@/common/components/ui/badge";
import { Button } from "@/common/components/ui/button";
import BlogMarkdown from "@/components/blog/BlogMarkdown";
import BlogReadCount from "@/components/blog/BlogReadCount";
import Footer from "@/components/landing/Footer";
import Navbar from "@/components/landing/Navbar";
import {
  BLOG_SITE_URL,
  estimateReadingTime,
  formatBlogDate,
  getBlogCanonicalUrl,
  getPublishedBlogPostBySlug,
  getPublishedBlogPosts,
  isBlogApiUnavailable,
  type PublicBlogPost,
} from "@/lib/blog";

export const dynamic = "force-dynamic";

type BlogArticlePageProps = {
  params: Promise<{ slug: string }>;
};

export async function generateMetadata({
  params,
}: BlogArticlePageProps): Promise<Metadata> {
  const { slug } = await params;
  let post = null;

  try {
    post = await getPublishedBlogPostBySlug(slug);
  } catch (error) {
    if (isBlogApiUnavailable(error)) {
      return {
        title: "Blog | Poultry360",
        description:
          "Poultry farming insights for Nepal covering feed, disease alerts, record keeping, and farm operations.",
        robots: {
          index: false,
          follow: false,
        },
      };
    }

    throw error;
  }

  if (!post) {
    return {
      title: "Blog Post Not Found | Poultry360",
      robots: {
        index: false,
        follow: false,
      },
    };
  }

  const title = post.seoTitle || post.title;
  const description = post.seoDescription || post.excerpt;
  const canonicalPath = `/blog/${post.slug}`;

  return {
    title,
    description,
    alternates: {
      canonical: canonicalPath,
    },
    openGraph: {
      title,
      description,
      url: `${BLOG_SITE_URL}${canonicalPath}`,
      siteName: "Poultry360",
      type: "article",
      publishedTime: post.publishedAt || undefined,
      authors: [post.authorName],
    },
    twitter: {
      card: "summary_large_image",
      title,
      description,
    },
  };
}

export default async function BlogArticlePage({ params }: BlogArticlePageProps) {
  const { slug } = await params;
  let post = null;

  try {
    post = await getPublishedBlogPostBySlug(slug);
  } catch (error) {
    if (isBlogApiUnavailable(error)) {
      return (
        <div className="min-h-screen bg-white">
          <Navbar />
          <main className="mx-auto max-w-4xl px-4 py-16 lg:px-6 lg:py-24">
            <div className="rounded-3xl border border-amber-200 bg-amber-50 p-8">
              <Badge className="bg-amber-100 px-3 py-1 text-amber-900">Blog Unavailable</Badge>
              <h1 className="mt-4 text-3xl font-bold tracking-tight text-gray-900">
                This article could not be loaded right now
              </h1>
              <p className="mt-4 text-gray-700">
                The page rendered, but the blog API is currently unavailable. In local development,
                start the backend on `http://localhost:8081` or set `API_URL_INTERNAL` to a reachable API.
              </p>
              <div className="mt-6 flex flex-wrap gap-3">
                <Button asChild>
                  <Link href="/blog">Back to blog</Link>
                </Button>
                <Button asChild variant="outline">
                  <Link href="/">Go to homepage</Link>
                </Button>
              </div>
            </div>
          </main>
          <Footer />
        </div>
      );
    }

    throw error;
  }

  if (!post) {
    notFound();
  }

  let allPosts: PublicBlogPost[] = [];

  try {
    allPosts = await getPublishedBlogPosts(4);
  } catch (error) {
    if (!isBlogApiUnavailable(error)) {
      throw error;
    }
  }

  const relatedPosts = allPosts.filter((candidate) => candidate.slug !== post.slug).slice(0, 3);
  const canonicalUrl = getBlogCanonicalUrl(`/blog/${post.slug}`);
  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "BlogPosting",
    headline: post.title,
    description: post.seoDescription || post.excerpt,
    datePublished: post.publishedAt,
    dateModified: post.updatedAt,
    author: {
      "@type": "Person",
      name: post.authorName,
    },
    publisher: {
      "@type": "Organization",
      name: "Poultry360",
      url: BLOG_SITE_URL,
    },
    mainEntityOfPage: canonicalUrl,
    articleSection: "Poultry Farm Management",
    url: canonicalUrl,
  };

  return (
    <div className="min-h-screen bg-white">
      <Navbar />

      <main>
        <article className="mx-auto max-w-4xl px-4 py-12 lg:px-6 lg:py-16">
          <script
            type="application/ld+json"
            dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
          />

          <Link href="/blog" className="inline-flex items-center text-sm font-medium text-primary">
            <ArrowLeft className="mr-2 size-4" />
            Back to blog
          </Link>

          <div className="mt-8">
            <Badge className="bg-primary/10 px-3 py-1 text-primary">Nepal Poultry Operations</Badge>
            <h1 className="mt-4 text-4xl font-bold tracking-tight text-gray-900 lg:text-5xl">
              {post.title}
            </h1>
            <p className="mt-5 text-lg leading-8 text-gray-600">{post.excerpt}</p>

            <div className="mt-6 flex flex-wrap items-center gap-x-5 gap-y-2 text-sm text-gray-500">
              <span>{post.authorName}</span>
              <span>{formatBlogDate(post.publishedAt)}</span>
              <span>{estimateReadingTime(post.contentMarkdown)} min read</span>
              <BlogReadCount slug={post.slug} initialCount={post.viewCount} />
            </div>
          </div>

          <div className="mt-10 rounded-3xl border border-gray-100 bg-gray-50 p-6">
            <p className="text-sm leading-7 text-gray-700">
              Looking for a practical next step? Use Poultry360 to track feed use, mortality, daily sales,
              supplier balances, and farm performance in one place.
            </p>
            <div className="mt-4 flex flex-wrap gap-3">
              <Button asChild>
                <Link href="/#features">See Product Features</Link>
              </Button>
              <Button asChild variant="outline">
                <Link href="/#contact">Book a Demo</Link>
              </Button>
            </div>
          </div>

          <div className="mt-12">
            <BlogMarkdown content={post.contentMarkdown} />
          </div>
        </article>

        {relatedPosts.length > 0 && (
          <section className="border-t bg-gray-50">
            <div className="mx-auto max-w-6xl px-4 py-14 lg:px-6">
              <div className="flex items-center justify-between gap-4">
                <div>
                  <h2 className="text-2xl font-semibold text-gray-900">More Poultry360 articles</h2>
                  <p className="mt-2 text-gray-600">
                    Keep building topical authority around Nepal poultry operations with related reading.
                  </p>
                </div>
                <Button asChild variant="outline">
                  <Link href="/blog">View all articles</Link>
                </Button>
              </div>

              <div className="mt-8 grid gap-6 lg:grid-cols-3">
                {relatedPosts.map((relatedPost) => (
                  <article key={relatedPost.id} className="rounded-3xl bg-white p-6 shadow-sm ring-1 ring-gray-100">
                    <p className="text-sm text-gray-500">{formatBlogDate(relatedPost.publishedAt)}</p>
                    <h3 className="mt-3 text-xl font-semibold tracking-tight text-gray-900">
                      <Link href={`/blog/${relatedPost.slug}`} className="hover:text-primary">
                        {relatedPost.title}
                      </Link>
                    </h3>
                    <p className="mt-3 text-sm leading-7 text-gray-600">{relatedPost.excerpt}</p>
                    <Link
                      href={`/blog/${relatedPost.slug}`}
                      className="mt-5 inline-flex items-center font-medium text-primary"
                    >
                      Read article
                      <ArrowRight className="ml-2 size-4" />
                    </Link>
                  </article>
                ))}
              </div>
            </div>
          </section>
        )}
      </main>

      <Footer />
    </div>
  );
}
