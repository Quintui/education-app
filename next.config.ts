import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Mastra depends on Node-only modules; keep it out of the bundler.
  serverExternalPackages: ["@mastra/*"],
};

export default nextConfig;
