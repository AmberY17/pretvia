/** @type {import('next').NextConfig} */
const nextConfig = {
  experimental: {
    // Optimize barrel imports for faster compilation
    optimizePackageImports: ["@radix-ui/react-icons", "emoji-mart"],
  },
  images: {
    unoptimized: true,
  },
};

export default nextConfig;
