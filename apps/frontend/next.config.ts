import type { NextConfig } from "next";
import path from "path";

const nextConfig: NextConfig = {
  // Allow build to pass while pre-existing lint issues are fixed (remove when lint is clean)
  eslint: { ignoreDuringBuilds: true },
  // Ensure Next resolves workspace root correctly in monorepo
  outputFileTracingRoot: path.join(__dirname, "../.."),
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "res.cloudinary.com",
      },
    ],
  },
  // Retired Cash in Hand v1 URLs → redirect to v2 Cash & Bank at the edge, so
  // the old pages never render and can't throw a client exception.
  async redirects() {
    return [
      {
        source: "/dealer/dashboard/cash-in-hand",
        destination: "/dealer/dashboard/cashflow",
        permanent: true,
      },
      {
        source: "/dealer/dashboard/cash-in-hand/:path*",
        destination: "/dealer/dashboard/cashflow",
        permanent: true,
      },
      {
        source: "/farmer/dashboard/cash-in-hand",
        destination: "/farmer/dashboard/cashflow",
        permanent: true,
      },
      {
        source: "/farmer/dashboard/cash-in-hand/:path*",
        destination: "/farmer/dashboard/cashflow",
        permanent: true,
      },
    ];
  },
};

export default nextConfig;
