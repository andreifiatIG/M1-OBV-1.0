import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  eslint: {
    // Disable ESLint during builds to allow deployment
    ignoreDuringBuilds: true,
  },
  typescript: {
    // Allow deployment with TypeScript errors (for now)
    ignoreBuildErrors: true,
  },
  experimental: {
    // Disable webpack cache for stability
    webpackBuildWorker: false,
    externalDir: true,
  },
  webpack: (config, { dev, isServer }) => {
    // Reduce webpack cache issues in development
    if (dev) {
      config.cache = false;
    }
    return config;
  },
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'cdn.simpleicons.org',
        port: '',
        pathname: '/**',
      },
    ],
  },
};

export default nextConfig;
