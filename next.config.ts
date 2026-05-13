import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  experimental: {
    // Limit static generation workers to reduce memory pressure on Vercel
    cpus: 1,
  },
};

export default nextConfig;
