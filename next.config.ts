import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  reactStrictMode: true, // Enables additional React checks in dev
  eslint: {
    dirs: ['app', 'components', 'lib'], // Limit ESLint to your source dirs
  },
  typescript: {
    ignoreBuildErrors: false, // Ensures type safety at build time
  },
  // File upload configuration
  experimental: {
    serverActions: {
      bodySizeLimit: '10mb', // Allow up to 10MB file uploads
    },
  },
};

export default nextConfig;
