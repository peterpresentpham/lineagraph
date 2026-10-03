import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // @lineagraph/ui ships TypeScript source (shared with the Vite admin app).
  transpilePackages: ["@lineagraph/ui"],
};

export default nextConfig;
