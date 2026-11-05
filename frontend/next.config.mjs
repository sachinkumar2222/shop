/** @type {import('next').NextConfig} */
let rawBackendUrl = process.env.BACKEND_URL || '';
if (!rawBackendUrl || rawBackendUrl === 'BACKEND_URL' || rawBackendUrl.trim() === '') {
  rawBackendUrl = process.env.NODE_ENV === 'development' ? 'http://localhost:3001' : 'https://shop-tyl2.onrender.com';
}
rawBackendUrl = rawBackendUrl.trim().replace(/\/+$/, '');
if (!rawBackendUrl.startsWith('http://') && !rawBackendUrl.startsWith('https://')) {
  rawBackendUrl = `https://${rawBackendUrl}`;
}

const BACKEND_URL = rawBackendUrl;

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
