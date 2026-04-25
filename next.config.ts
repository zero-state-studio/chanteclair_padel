import type { NextConfig } from "next";
import path from "path";

const nextConfig: NextConfig = {
  turbopack: {
    root: path.resolve(__dirname),
  },
  images: {
    remotePatterns: [
      { protocol: "http", hostname: "localhost" },
      { protocol: "https", hostname: "*.supabase.co" },
      { protocol: "https", hostname: "*.vercel.app" },
    ],
  },
  // Prisma deve restare serverful (no edge bundling)
  serverExternalPackages: ["@prisma/client", "@prisma/engines"],
};

export default nextConfig;
