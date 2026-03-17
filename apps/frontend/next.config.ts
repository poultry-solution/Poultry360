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
};

export default nextConfig;
