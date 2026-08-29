export const BLOG_SITE_URL = "https://www.poultry360.org";
export const BLOG_LOCALES = ["en", "ne"] as const;

export type BlogLocale = (typeof BLOG_LOCALES)[number];

export interface PublicBlogPost {
  id: string;
  title: string;
  slug: string;
  excerpt: string;
  contentMarkdown: string;
  bannerImageUrl: string | null;
  isFeatured: boolean;
  authorName: string;
  seoTitle: string | null;
  seoDescription: string | null;
  publishedAt: string | null;
  viewCount: number;
  createdAt: string;
  updatedAt: string;
  hasNepaliTranslation: boolean;
  locale: BlogLocale;
}

interface BlogApiResponse<T> {
  success: boolean;
  data: T;
  message?: string;
}

export class BlogApiError extends Error {
  status?: number;
  isUnavailable?: boolean;

  constructor(message: string, options?: { status?: number; isUnavailable?: boolean }) {
    super(message);
    this.name = "BlogApiError";
    this.status = options?.status;
    this.isUnavailable = options?.isUnavailable;
  }
}

export function getBlogCanonicalUrl(path = "/blog") {
  return `${BLOG_SITE_URL}${path}`;
}

export function getBlogPath(locale: BlogLocale, slug?: string) {
  const base = locale === "ne" ? "/ne/blog" : "/blog";
  return slug ? `${base}/${slug}` : base;
}

export function getBlogLocaleLabel(locale: BlogLocale) {
  return locale === "ne" ? "NP" : "EN";
}

export function getBlogPageCopy(locale: BlogLocale) {
  if (locale === "ne") {
    return {
      home: "होम",
      blogs: "ब्लगहरू",
      latestBlogsPrefix: "नवीनतम",
      latestBlogsAccent: "ब्लगहरू",
      intro:
        "Poultry360 को ब्लगमार्फत नेपालका कुखुरापालन व्यवसाय, प्रविधि, र दैनिक सञ्चालन सुधार्ने व्यवहारिक उपायहरूबारे जानकारी लिनुहोस्।",
      sortLabel: "ब्लग क्रमबद्ध गर्नुहोस्",
      sortMostRecent: "नयाँ पहिले",
      sortOldest: "पुराना पहिले",
      sortPopular: "लोकप्रिय",
      featuredBlog: "विशेष ब्लग",
      relatedBlogs: "सम्बन्धित ब्लगहरू",
      publishedPrefix: "प्रकाशित",
      byPrefix: "लेखक",
      minuteReadSuffix: "मिनेट पढाइ",
      viewAllBlogs: "सबै ब्लगहरू हेर्नुहोस्",
      unavailableTitle: "ब्लग सामग्री अहिले उपलब्ध छैन",
      unavailableBody:
        "पब्लिक ब्लग UI खुलेको छ, तर अहिले ब्लग API मा पुग्न सकिएन।",
      emptyTitle: "अहिलेसम्म कुनै प्रकाशित ब्लग छैन",
      emptyBody:
        "एडमिन ड्यासबोर्डबाट ब्लग प्रकाशित गरेपछि यो यहाँ स्वतः देखिनेछ।",
    };
  }

  return {
    home: "Home",
    blogs: "Blogs",
    latestBlogsPrefix: "Latest",
    latestBlogsAccent: "Blogs",
    intro:
      "Empower your poultry farm with Poultry360's management software blog. Stay informed with expert perspectives on poultry operations in Nepal, technology trends, and practical habits that improve performance.",
    sortLabel: "Sort blogs by",
    sortMostRecent: "Most recent",
    sortOldest: "Oldest",
    sortPopular: "Most popular",
    featuredBlog: "Featured Blog",
    relatedBlogs: "Related Blogs",
    publishedPrefix: "Published",
    byPrefix: "By",
    minuteReadSuffix: "min read",
    viewAllBlogs: "View All Blogs",
    unavailableTitle: "Blog article is temporarily unavailable",
    unavailableBody:
      "The public blog UI loaded, but the blog API could not be reached right now.",
    emptyTitle: "No published blog posts yet",
    emptyBody:
      "Publish a post from the admin dashboard and it will appear here automatically.",
  };
}

async function blogFetch<T>(path: string, init?: RequestInit): Promise<T> {
  const apiBase =
    process.env.API_URL_INTERNAL ||
    process.env.NEXT_PUBLIC_API_URL ||
    "http://localhost:8081/api/v1";

  let response: Response;

  try {
    response = await fetch(`${apiBase}${path}`, {
      ...init,
      cache: "no-store",
      headers: {
        "Content-Type": "application/json",
        ...(init?.headers || {}),
      },
    });
  } catch {
    throw new BlogApiError("Blog API is unavailable", { isUnavailable: true });
  }

  if (!response.ok) {
    throw new BlogApiError(`Blog API request failed: ${response.status}`, {
      status: response.status,
      isUnavailable: response.status >= 500,
    });
  }

  const payload = (await response.json()) as BlogApiResponse<T>;
  return payload.data;
}

export async function getPublishedBlogPosts(limit = 50, locale: BlogLocale = "en") {
  return blogFetch<PublicBlogPost[]>(
    `/public/blog-posts?limit=${limit}&locale=${locale}`
  );
}

export async function getPublishedBlogPostBySlug(
  slug: string,
  locale: BlogLocale = "en"
) {
  try {
    return await blogFetch<PublicBlogPost>(
      `/public/blog-posts/${slug}?locale=${locale}`
    );
  } catch (error) {
    if ((error as BlogApiError).status === 404) {
      return null;
    }

    throw error;
  }
}

export function isBlogApiUnavailable(error: unknown) {
  return error instanceof BlogApiError && error.isUnavailable;
}

export function formatBlogDate(value: string | null, locale: BlogLocale = "en") {
  if (!value) return "Draft";

  return new Intl.DateTimeFormat(locale === "ne" ? "ne-NP" : "en-US", {
    month: "long",
    day: "numeric",
    year: "numeric",
  }).format(new Date(value));
}

export function getReadCountLabel(viewCount: number, locale: BlogLocale = "en") {
  if (locale === "ne") {
    return `${viewCount} पटक पढियो`;
  }

  return `${viewCount} ${viewCount === 1 ? "read" : "reads"}`;
}

export function estimateReadingTime(markdown: string) {
  const plainText = markdown
    .replace(/`{1,3}[^`]*`{1,3}/g, " ")
    .replace(/!\[[^\]]*\]\([^)]*\)/g, " ")
    .replace(/\[[^\]]*\]\([^)]*\)/g, " ")
    .replace(/[#>*_~-]/g, " ")
    .replace(/\s+/g, " ")
    .trim();

  const wordCount = plainText ? plainText.split(" ").length : 0;
  return Math.max(1, Math.ceil(wordCount / 200));
}
