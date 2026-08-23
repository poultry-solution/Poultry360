export const BLOG_SITE_URL = "https://www.poultry360.org";

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
  } catch (error) {
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

export async function getPublishedBlogPosts(limit = 50) {
  return blogFetch<PublicBlogPost[]>(`/public/blog-posts?limit=${limit}`);
}

export async function getPublishedBlogPostBySlug(slug: string) {
  try {
    return await blogFetch<PublicBlogPost>(`/public/blog-posts/${slug}`);
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

export function formatBlogDate(value: string | null) {
  if (!value) return "Draft";

  return new Intl.DateTimeFormat("en-US", {
    month: "long",
    day: "numeric",
    year: "numeric",
  }).format(new Date(value));
}

export function getReadCountLabel(viewCount: number) {
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
