import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { BlogDetailContent } from "@/components/blog/BlogDetailContent";
import { BlogDetailHeader } from "@/components/blog/BlogDetailHeader";
import { BlogDetailSidebar } from "@/components/blog/BlogDetailSidebar";
import { BlogSection } from "@/components/blog/BlogSection";
import Footer from "@/components/landing/Footer";
import Navbar from "@/components/landing/Navbar";
import {
  BLOG_SITE_URL,
  getBlogCanonicalUrl,
  getBlogPageCopy,
  getBlogPath,
  getPublishedBlogPostBySlug,
  getPublishedBlogPosts,
  isBlogApiUnavailable,
  type BlogLocale,
  type PublicBlogPost,
} from "@/lib/blog";

function getIndexMeta(locale: BlogLocale) {
  if (locale === "ne") {
    return {
      title: "ब्लगहरू | नेपालको कुखुरापालन र Poultry360 सम्बन्धी लेखहरू | Poultry360",
      description:
        "नेपालको कुखुरापालन, दाना व्यवस्थापन, रोग सतर्कता, र Poultry360 सम्बन्धी उपयोगी लेखहरू नेपालीमा पढ्नुहोस्।",
    };
  }

  return {
    title: "Blogs | Poultry Management & Software Articles | Poultry360",
    description:
      "Empower your poultry farm with our all-encompassing management software blog. Stay informed with expert perspectives on poultry management, technology trends, and industry best practices.",
  };
}

function getUnavailableBody(locale: BlogLocale) {
  if (locale === "ne") {
    return "पब्लिक ब्लग UI खुलेको छ, तर अहिले ब्लग API मा पुग्न सकिएन।";
  }

  return "The public blog UI loaded, but the blog API could not be reached right now.";
}

function getIndexAlternates(locale: BlogLocale) {
  return {
    canonical: getBlogPath(locale),
    languages: {
      en: getBlogPath("en"),
      ne: getBlogPath("ne"),
      "x-default": getBlogPath("en"),
    },
  } as const;
}

function getArticleAlternates(
  locale: BlogLocale,
  slug: string,
  hasNepaliTranslation: boolean
) {
  const languages: Record<string, string> = {
    en: getBlogPath("en", slug),
    "x-default": getBlogPath("en", slug),
  };

  if (hasNepaliTranslation) {
    languages.ne = getBlogPath("ne", slug);
  }

  return {
    canonical: getBlogPath(locale, slug),
    languages,
  } as const;
}

function getPublishedTimestamp(post: PublicBlogPost) {
  return post.publishedAt ? new Date(post.publishedAt).getTime() : 0;
}

function getSocialImageUrl(bannerImageUrl: string | null) {
  if (!bannerImageUrl) return null;

  const uploadPath = "/image/upload/";

  if (!bannerImageUrl.includes("res.cloudinary.com") || !bannerImageUrl.includes(uploadPath)) {
    return bannerImageUrl;
  }

  return bannerImageUrl.replace(
    uploadPath,
    `${uploadPath}c_fill,g_auto,w_1200,h_630,q_auto,f_jpg/`
  );
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

export function getBlogIndexMetadata(locale: BlogLocale): Metadata {
  const meta = getIndexMeta(locale);

  return {
    title: meta.title,
    description: meta.description,
    alternates: getIndexAlternates(locale),
    openGraph: {
      title: meta.title,
      description: meta.description,
      url: `${BLOG_SITE_URL}${getBlogPath(locale)}`,
      siteName: "Poultry360",
      type: "website",
    },
    twitter: {
      card: "summary_large_image",
      title: meta.title,
      description: meta.description,
    },
  };
}

export async function renderBlogIndexPage(locale: BlogLocale) {
  const copy = getBlogPageCopy(locale);
  let posts: PublicBlogPost[] = [];
  let isUnavailable = false;

  try {
    posts = await getPublishedBlogPosts(50, locale);
  } catch (error) {
    if (isBlogApiUnavailable(error)) {
      isUnavailable = true;
    } else {
      throw error;
    }
  }

  return (
    <div className="min-h-screen bg-white flex flex-col justify-between">
      <Navbar />
      <main className="flex-grow">
        {isUnavailable ? (
          <section className="mx-auto max-w-7xl px-4 py-16 sm:px-6 lg:px-8">
            <div className="rounded-3xl border border-amber-200 bg-amber-50 p-8 text-center">
              <h1 className="text-2xl font-semibold text-slate-900">{copy.unavailableTitle}</h1>
              <p className="mt-3 text-slate-600">{getUnavailableBody(locale)}</p>
            </div>
          </section>
        ) : posts.length === 0 ? (
          <section className="mx-auto max-w-7xl px-4 py-16 sm:px-6 lg:px-8">
            <div className="rounded-3xl border border-dashed border-slate-300 bg-slate-50 p-8 text-center">
              <h1 className="text-2xl font-semibold text-slate-900">{copy.emptyTitle}</h1>
              <p className="mt-3 text-slate-600">{copy.emptyBody}</p>
            </div>
          </section>
        ) : (
          <BlogSection posts={posts} locale={locale} />
        )}
      </main>
      <Footer />
    </div>
  );
}

export async function getBlogArticleMetadata(
  locale: BlogLocale,
  slug: string
): Promise<Metadata> {
  let post: PublicBlogPost | null = null;

  try {
    post = await getPublishedBlogPostBySlug(slug, locale);
  } catch (error) {
    if (isBlogApiUnavailable(error)) {
      return {
        title: locale === "ne" ? "ब्लग | Poultry360" : "Blog | Poultry360",
        description:
          locale === "ne"
            ? "नेपालको कुखुरापालन, दाना, रोग सतर्कता र सञ्चालनबारे सामग्री।"
            : "Poultry farming insights for Nepal covering feed, disease alerts, record keeping, and farm operations.",
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
      title: locale === "ne" ? "ब्लग भेटिएन | Poultry360" : "Blog Post Not Found | Poultry360",
      robots: {
        index: false,
        follow: false,
      },
    };
  }

  const title = post.seoTitle || post.title;
  const description = post.seoDescription || post.excerpt;
  const canonicalPath = getBlogPath(locale, post.slug);
  const socialImageUrl = getSocialImageUrl(post.bannerImageUrl);

  return {
    title,
    description,
    alternates: getArticleAlternates(locale, post.slug, post.hasNepaliTranslation),
    openGraph: {
      title,
      description,
      url: `${BLOG_SITE_URL}${canonicalPath}`,
      siteName: "Poultry360",
      type: "article",
      publishedTime: post.publishedAt || undefined,
      modifiedTime: post.updatedAt,
      authors: [post.authorName],
      ...(socialImageUrl
        ? {
            images: [
              {
                url: socialImageUrl,
                width: 1200,
                height: 630,
                alt: post.title,
                type: "image/jpeg",
              },
            ],
          }
        : {}),
    },
    twitter: {
      card: "summary_large_image",
      title,
      description,
      ...(socialImageUrl ? { images: [socialImageUrl] } : {}),
    },
  };
}

export async function renderBlogArticlePage(locale: BlogLocale, slug: string) {
  let post: PublicBlogPost | null = null;

  try {
    post = await getPublishedBlogPostBySlug(slug, locale);
  } catch (error) {
    if (isBlogApiUnavailable(error)) {
      return (
        <div className="min-h-screen bg-white flex flex-col justify-between">
          <Navbar />
          <main className="flex-grow">
            <section className="mx-auto max-w-4xl px-4 py-16 sm:px-6 lg:px-8">
              <div className="rounded-3xl border border-amber-200 bg-amber-50 p-8 text-center">
                <h1 className="text-2xl font-semibold text-slate-900">
                  {getBlogPageCopy(locale).unavailableTitle}
                </h1>
                <p className="mt-3 text-slate-600">{getUnavailableBody(locale)}</p>
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
    allPosts = await getPublishedBlogPosts(100, locale);
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
  const canonicalUrl = getBlogCanonicalUrl(getBlogPath(locale, post.slug));
  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "BlogPosting",
    headline: post.title,
    description: post.seoDescription || post.excerpt,
    datePublished: post.publishedAt,
    dateModified: post.updatedAt,
    inLanguage: locale === "ne" ? "ne-NP" : "en",
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
    articleSection: locale === "ne" ? "कुखुरापालन व्यवस्थापन" : "Poultry Farm Management",
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
              <BlogDetailHeader post={post} locale={locale} />
              <BlogDetailContent post={post} locale={locale} />
            </div>

            {hasSidebarContent ? (
              <div className="lg:col-span-4 mt-8 lg:mt-0">
                <BlogDetailSidebar
                  locale={locale}
                  featuredPost={featuredPost}
                  relatedPosts={relatedPosts}
                />
              </div>
            ) : null}
          </div>
        </section>
      </main>

      <Footer />
    </div>
  );
}
