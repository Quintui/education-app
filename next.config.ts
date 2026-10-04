import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Mastra and SQLite depend on Node-only modules; keep them out of the bundler.
  serverExternalPackages: ["@mastra/*", "@libsql/client", "libsql"],
};

export default nextConfig;
