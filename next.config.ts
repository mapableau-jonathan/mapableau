import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  reactStrictMode: true,
  poweredByHeader: false,
  // Do not use output: "standalone" on Vercel — it can cause the homepage to
  // serve raw/code instead of the rendered app. Use standalone only for
  // self-hosted/Docker (e.g. set OUTPUT_STANDALONE=1 in env and read it here).
  images: {
    formats: ["image/avif", "image/webp"],
  },
  experimental: {
    optimizePackageImports: ["lucide-react", "framer-motion"],
  },
  async headers() {
    return [
      {
        source: "/data/:path*",
        headers: [
          {
            key: "Cache-Control",
            value: "public, max-age=43200, s-maxage=43200",
          },
        ],
      },
    ];
  },
  eslint: {
    dirs: ["app", "components", "lib"],
  },
  typescript: {
    ignoreBuildErrors: false,
  },
};

export default nextConfig;
