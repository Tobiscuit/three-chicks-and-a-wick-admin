/** @type {import('next').NextConfig} */
const nextConfig = {
  experimental: {
    serverActions: {
      allowedOrigins: [
        'localhost:3000', 
        'dev-admin.threechicksandawick.com',
        'threechicksandawick-admin-dev.vercel.app'
      ]
    }
  },
  env: {
    APP_ENV: 'development'
  },
  // Development-specific settings
  images: {
    domains: ['your-dev-store.myshopify.com', 'cdn.shopify.com'],
    unoptimized: true // For development
  },
  // Enable development features
  typescript: {
    ignoreBuildErrors: false
  },
  eslint: {
    ignoreDuringBuilds: false
  }
}

module.exports = nextConfig

