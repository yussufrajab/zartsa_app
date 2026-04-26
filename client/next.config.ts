// client/next.config.ts
import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  transpilePackages: ['@zartsa/shared'],
  poweredByHeader: false,
  images: {
    remotePatterns: [
      {
        protocol: 'http',
        hostname: process.env.MINIO_ENDPOINT || 'localhost',
        port: String(process.env.MINIO_PORT || 9000),
        pathname: '/zartsa/**',
      },
    ],
  },
  async rewrites() {
    return [
      {
        source: '/api/:path*',
        destination: `${process.env.SERVER_URL || 'http://localhost:5000'}/api/:path*`,
      },
    ];
  },
};

export default nextConfig;