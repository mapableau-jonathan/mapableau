import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  reactStrictMode: true, // Enables additional React checks in dev
  eslint: {
    dirs: ['app', 'components', 'lib'], // Limit ESLint to your source dirs
  },
  typescript: {
    ignoreBuildErrors: false, // Ensures type safety at build time
  },
};

export default nextConfig;
