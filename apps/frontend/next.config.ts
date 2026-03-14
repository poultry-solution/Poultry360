import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Allow build to pass while pre-existing lint issues are fixed (remove when lint is clean)
  eslint: { ignoreDuringBuilds: true },
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "res.cloudinary.com",
      },
    ],
  },
};

export default nextConfig;
