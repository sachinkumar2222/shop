/** @type {import('next').NextConfig} */
const BACKEND_URL = process.env.BACKEND_URL || (process.env.NODE_ENV === 'production' ? 'http://backend:3001' : 'http://localhost:3001');

const nextConfig = {
  reactStrictMode: true,
  async rewrites() {
    return [
      {
        source: '/api/v1/:path*',
        destination: `${BACKEND_URL}/api/v1/:path*`,
      },
      {
        source: '/uploads/:path*',
        destination: `${BACKEND_URL}/uploads/:path*`,
      },
    ];
  },
};

export default nextConfig;
