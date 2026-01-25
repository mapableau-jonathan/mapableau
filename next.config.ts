import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  reactStrictMode: true, // Enables additional React checks in dev
  eslint: {
    dirs: ['app', 'components', 'lib'], // Limit ESLint to your source dirs
    ignoreDuringBuilds: process.env.SKIP_ENV_VALIDATION === 'true', // Skip ESLint during builds if validation is skipped
  },
  typescript: {
    ignoreBuildErrors: process.env.SKIP_ENV_VALIDATION === 'true', // Skip TypeScript errors during builds if validation is skipped
  },
  // File upload configuration
  experimental: {
    serverActions: {
      bodySizeLimit: '10mb', // Allow up to 10MB file uploads
    },
  },
  // Allow server to start even with missing env vars in development
  env: {
    SKIP_ENV_VALIDATION: process.env.SKIP_ENV_VALIDATION || 'false',
  },
};

export default nextConfig;
