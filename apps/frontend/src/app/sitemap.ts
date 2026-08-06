import type { MetadataRoute } from "next";

const siteUrl = "https://poultry360.org";

const publicPaths = ["/", "/marketplace"];

export default function sitemap(): MetadataRoute.Sitemap {
  const lastModified = new Date();

  return publicPaths.map((path) => ({
    url: `${siteUrl}${path}`,
    lastModified,
    changeFrequency: path === "/" ? "weekly" : "monthly",
    priority: path === "/" ? 1 : 0.8,
  }));
}
