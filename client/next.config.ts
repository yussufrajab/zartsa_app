// client/next.config.ts
import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  transpilePackages: ['@zartsa/shared'],
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