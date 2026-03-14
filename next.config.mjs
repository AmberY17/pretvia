/* global process */
/** @type {import('next').NextConfig} */
const nextConfig = {
  experimental: {
    // Optimize barrel imports for faster compilation
    optimizePackageImports: ["@radix-ui/react-icons", "emoji-mart"],
  },
  images: {
    unoptimized: true,
  },
  ...(process.env.CI && { logging: false }),
};

export default nextConfig;
