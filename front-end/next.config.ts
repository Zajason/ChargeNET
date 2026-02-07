/** @type {import('next').NextConfig} */
const nextConfig = {
  allowedDevOrigins: [
    'http://localhost:3000',
    'http://127.0.0.1:3000',
    'http://192.168.1.8:3000', // phone accessing your PC
  ],
  turbopack: {
    root: __dirname,
  },
  env: {
    NEXT_PUBLIC_API_URL: '/api/v1',
  },
  async rewrites() {
    return [
      {
        source: '/api/v1/:path*',
        destination: 'http://127.0.0.1:9876/api/v1/:path*',
      },
    ];
  },
};

module.exports = nextConfig;
