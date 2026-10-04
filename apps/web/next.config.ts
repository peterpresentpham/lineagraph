import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // @lineagraph/ui ships TypeScript source (shared with the Vite admin app).
  transpilePackages: ["@lineagraph/ui"],
  // Stop `next dev` from auto-writing AGENTS.md / CLAUDE.md here; the root CLAUDE.md is the
  // single source of truth for agent instructions in this repo.
  agentRules: false,
};

export default nextConfig;
