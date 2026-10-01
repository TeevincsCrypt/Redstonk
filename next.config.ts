import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  reactStrictMode: true,
  // Irys is a Node-only uploader used by the server metadata route. Keep it out of the bundle.
  serverExternalPackages: ["@irys/upload", "@irys/upload-solana"],
  images: { unoptimized: true },
};

export default nextConfig;
