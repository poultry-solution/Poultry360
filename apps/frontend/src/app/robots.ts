import type { MetadataRoute } from "next";

const siteUrl = "https://www.poultry360.org";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: "*",
        allow: ["/", "/marketplace"],
        disallow: [
          "/admin/",
          "/api/",
          "/auth/",
          "/dashboard/",
          "/company/dashboard/",
          "/dealer/dashboard/",
          "/farmer/dashboard/",
          "/payment/",
          "/share/",
          "/test/",
          "/company/",
          "/dealer/",
          "/farmer/",
        ],
      },
    ],
    sitemap: `${siteUrl}/sitemap.xml`,
  };
}
