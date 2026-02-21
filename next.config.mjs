/** @type {import('next').NextConfig} */
const nextConfig = {
  experimental: {
    // Optimize barrel imports for faster compilation
    optimizePackageImports: ["@radix-ui/react-icons", "emoji-mart"],
  },
  typescript: {
    ignoreBuildErrors: true,
  },
  images: {
    unoptimized: true,
  },
};

export default nextConfig;
