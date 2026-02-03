/** @type {import('next').NextConfig} */
const nextConfig = {
  allowedDevOrigins: [
    'http://localhost:3000',
    'http://127.0.0.1:3000',
    'http://192.168.178.86:3000', // phone accessing your PC
  ],
};

module.exports = nextConfig;
