/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  poweredByHeader: false,
  serverExternalPackages: ['@pydantic/logfire-node'],
  // Default NextAuth URL in development so auth works without .env
  env: {
    NEXTAUTH_URL: process.env.NEXTAUTH_URL || 'http://localhost:30000',
  },
  devIndicators: false,
  images: {
    domains: ['lh3.googleusercontent.com', 'avatars.githubusercontent.com'],
  },
  experimental: {
    serverActions: {
      bodySizeLimit: '2mb',
    },
  },
  async rewrites() {
    return [{ source: '/favicon.ico', destination: '/favicon.svg' }];
  },
  headers: async () => {
    const securityHeaders = [
      { key: 'X-Content-Type-Options', value: 'nosniff' },
      { key: 'X-Frame-Options', value: 'DENY' },
      { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
      { key: 'Permissions-Policy', value: 'camera=(), microphone=(), geolocation=()' },
      { key: 'Cross-Origin-Opener-Policy', value: 'same-origin' },
      ...(process.env.NODE_ENV === 'production'
        ? [{ key: 'Strict-Transport-Security', value: 'max-age=31536000; includeSubDomains' }]
        : []),
    ];

    return [{ source: '/:path*', headers: securityHeaders }];
  },
};

module.exports = nextConfig;
