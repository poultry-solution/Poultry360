import type { MetadataRoute } from "next";
import { getPublishedBlogPosts, isBlogApiUnavailable } from "@/lib/blog";

const siteUrl = "https://www.poultry360.org";

const publicPaths = ["/", "/marketplace", "/blog"];

export const dynamic = "force-dynamic";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const lastModified = new Date();
  let blogPosts: Awaited<ReturnType<typeof getPublishedBlogPosts>> = [];

  try {
    blogPosts = await getPublishedBlogPosts();
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
        : path === "/blog"
          ? ("daily" as const)
          : ("monthly" as const),
    priority: path === "/" ? 1 : path === "/blog" ? 0.9 : 0.8,
  }));

  const blogEntries: MetadataRoute.Sitemap = blogPosts.map((post) => ({
    url: `${siteUrl}/blog/${post.slug}`,
    lastModified: new Date(post.updatedAt || post.publishedAt || lastModified),
    changeFrequency: "monthly" as const,
    priority: 0.7,
  }));

  return [...coreEntries, ...blogEntries];
}
