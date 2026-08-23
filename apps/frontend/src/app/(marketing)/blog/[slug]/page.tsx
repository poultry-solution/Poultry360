import type { Metadata } from "next";
import { notFound } from "next/navigation";
import Navbar from "@/components/landing/Navbar";
import Footer from "@/components/landing/Footer";
import { BlogDetailHeader } from "@/components/blog/BlogDetailHeader";
import { BlogDetailContent } from "@/components/blog/BlogDetailContent";
import { BlogDetailSidebar } from "@/components/blog/BlogDetailSidebar";
import {
  BLOG_SITE_URL,
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

function getPublishedTimestamp(post: PublicBlogPost) {
  return post.publishedAt ? new Date(post.publishedAt).getTime() : 0;
}

function pickFeaturedPost(posts: PublicBlogPost[], currentSlug: string) {
  return (
    [...posts]
      .filter((post) => post.isFeatured && post.slug !== currentSlug)
      .sort((left, right) => getPublishedTimestamp(right) - getPublishedTimestamp(left))[0] ?? null
  );
}

function shufflePosts(posts: PublicBlogPost[]) {
  const shuffled = [...posts];

  for (let index = shuffled.length - 1; index > 0; index -= 1) {
    const swapIndex = Math.floor(Math.random() * (index + 1));
    [shuffled[index], shuffled[swapIndex]] = [shuffled[swapIndex], shuffled[index]];
  }

  return shuffled;
}

export async function generateMetadata({
  params,
}: BlogArticlePageProps): Promise<Metadata> {
  const { slug } = await params;
  let post: PublicBlogPost | null = null;

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
      images: post.bannerImageUrl
        ? [
            {
              url: post.bannerImageUrl,
              alt: post.title,
            },
          ]
        : undefined,
    },
    twitter: {
      card: "summary_large_image",
      title,
      description,
      images: post.bannerImageUrl ? [post.bannerImageUrl] : undefined,
    },
  };
}

export default async function BlogArticlePage({ params }: BlogArticlePageProps) {
  const { slug } = await params;
  let post: PublicBlogPost | null = null;

  try {
    post = await getPublishedBlogPostBySlug(slug);
  } catch (error) {
    if (isBlogApiUnavailable(error)) {
      return (
        <div className="min-h-screen bg-white flex flex-col justify-between">
          <Navbar />
          <main className="flex-grow">
            <section className="mx-auto max-w-4xl px-4 py-16 sm:px-6 lg:px-8">
              <div className="rounded-3xl border border-amber-200 bg-amber-50 p-8 text-center">
                <h1 className="text-2xl font-semibold text-slate-900">Blog article is temporarily unavailable</h1>
                <p className="mt-3 text-slate-600">
                  The public blog UI loaded, but the blog API could not be reached right now.
                </p>
              </div>
            </section>
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
    allPosts = await getPublishedBlogPosts(100);
  } catch (error) {
    if (!isBlogApiUnavailable(error)) {
      throw error;
    }
  }

  const featuredPost = pickFeaturedPost(allPosts, post.slug);
  const relatedCandidates = allPosts.filter(
    (candidate) =>
      candidate.slug !== post.slug && candidate.slug !== featuredPost?.slug
  );
  const relatedPosts = shufflePosts(relatedCandidates).slice(0, 2);
  const hasSidebarContent = Boolean(featuredPost) || relatedPosts.length > 0;
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
    image: post.bannerImageUrl ? [post.bannerImageUrl] : undefined,
    mainEntityOfPage: canonicalUrl,
    articleSection: "Poultry Farm Management",
    url: canonicalUrl,
  };

  return (
    <div className="min-h-screen bg-white flex flex-col justify-between">
      <Navbar />

      <main className="flex-grow">
        <section className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-10 sm:py-16">
          <script
            type="application/ld+json"
            dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
          />

          <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 lg:gap-16">
            <div className={hasSidebarContent ? "lg:col-span-8" : "lg:col-span-12"}>
              <BlogDetailHeader post={post} />
              <BlogDetailContent post={post} />
            </div>

            {hasSidebarContent ? (
              <div className="lg:col-span-4 mt-8 lg:mt-0">
                <BlogDetailSidebar featuredPost={featuredPost} relatedPosts={relatedPosts} />
              </div>
            ) : null}
          </div>
        </section>
      </main>

      <Footer />
    </div>
  );
}
