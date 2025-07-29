/** @type {import('next').NextConfig} */
const nextConfig = {
  experimental: {
    // Enable top level await
    topLevelAwait: true,
  },
  images: {
    domains: ['avatars.githubusercontent.com'],
  },
}

module.exports = nextConfig 