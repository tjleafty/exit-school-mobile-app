/** @type {import('next').NextConfig} */
const nextConfig = {
  experimental: {
    serverComponentsExternalPackages: ['@prisma/client', 'bcryptjs']
  },
  // Force rebuild for authentication system deployment
  env: {
    FORCE_REBUILD_AUTH: new Date().getTime().toString(),
    PRODUCTION_DATABASE_READY: 'true'
  },
  typescript: {
    ignoreBuildErrors: false
  },
  eslint: {
    ignoreDuringBuilds: false
  },
  // Production optimizations
  poweredByHeader: false,
  compress: true,
  swcMinify: true,
  images: {
    formats: ['image/webp', 'image/avif']
  },
  headers: async () => {
    return [
      {
        source: '/(.*)',
        headers: [
          {
            key: 'X-Frame-Options',
            value: 'DENY'
          },
          {
            key: 'X-Content-Type-Options',
            value: 'nosniff'
          },
          {
            key: 'Referrer-Policy',
            value: 'strict-origin-when-cross-origin'
          }
        ]
      }
    ]
  }
}

module.exports = nextConfig