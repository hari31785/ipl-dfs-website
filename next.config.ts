import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  experimental: {
    // Limit static generation workers to reduce memory pressure on Vercel
    cpus: 1,
  },
  async headers() {
    return [
      {
        // Force HTML pages (app shell) to always revalidate.
        // This ensures the PWA / homescreen app picks up new JS bundles on every open.
        // Static assets (/_next/static/**) are hashed so they can stay cached indefinitely.
        source: "/((?!_next/static|_next/image|favicon.ico|icon-|manifest.json|sw.js).*)",
        headers: [
          {
            key: "Cache-Control",
            value: "public, max-age=0, must-revalidate",
          },
        ],
      },
    ];
  },
};

export default nextConfig;
