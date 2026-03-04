import type { NextConfig } from "next";
import path from "path";

const nextConfig: NextConfig = {
  // Monorepo: trace from workspace root so shared deps are included (silences lockfile warning)
  outputFileTracingRoot: path.join(process.cwd(), ".."),
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
