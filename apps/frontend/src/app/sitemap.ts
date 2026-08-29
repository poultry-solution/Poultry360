import type { MetadataRoute } from "next";
import { getPublishedBlogPosts, isBlogApiUnavailable } from "@/lib/blog";

const siteUrl = "https://www.poultry360.org";

const publicPaths = [
  "/",
  "/about-us",
  "/marketplace",
  "/blog",
  "/ne/blog",
  "/layer-farm-software",
  "/broiler-farm-software",
  "/feed-dealer-software",
  "/hatchery-software",
];

export const dynamic = "force-dynamic";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const lastModified = new Date();
  let blogPosts: Awaited<ReturnType<typeof getPublishedBlogPosts>> = [];

  try {
    blogPosts = await getPublishedBlogPosts(100, "en");
  } catch (error) {
    if (!isBlogApiUnavailable(error)) {
      throw error;
    }
  }

  const coreEntries: MetadataRoute.Sitemap = publicPaths.map((path) => ({
    url: `${siteUrl}${path}`,
    lastModified,
    changeFrequency:
      path === "/"
        ? ("weekly" as const)
        : path === "/blog" || path === "/ne/blog"
          ? ("daily" as const)
          : path === "/about-us"
            ? ("monthly" as const)
            : path.includes("-software")
              ? ("weekly" as const)
          : ("monthly" as const),
    priority:
      path === "/"
        ? 1
        : path === "/blog" || path === "/ne/blog"
          ? 0.9
          : path.includes("-software")
            ? 0.85
            : 0.8,
  }));

  const blogEntries: MetadataRoute.Sitemap = blogPosts.map((post) => ({
    url: `${siteUrl}/blog/${post.slug}`,
    lastModified: new Date(post.updatedAt || post.publishedAt || lastModified),
    changeFrequency: "monthly" as const,
    priority: 0.7,
  }));

  const nepaliBlogEntries: MetadataRoute.Sitemap = blogPosts
    .filter((post) => post.hasNepaliTranslation)
    .map((post) => ({
      url: `${siteUrl}/ne/blog/${post.slug}`,
      lastModified: new Date(post.updatedAt || post.publishedAt || lastModified),
      changeFrequency: "monthly" as const,
      priority: 0.7,
    }));

  return [...coreEntries, ...blogEntries, ...nepaliBlogEntries];
}
