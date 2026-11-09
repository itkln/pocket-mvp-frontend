import path from "node:path";
import type { NextConfig } from "next";

const workspaceRoot = path.resolve(__dirname, "../..");

const nextConfig: NextConfig = {
  output: "standalone",
  outputFileTracingRoot: workspaceRoot,
  poweredByHeader: false,
  turbopack: { root: workspaceRoot },
  // Ukrainian used to live under /uk; the query string is carried over automatically.
  redirects: async () => [{ source: "/uk/:path*", destination: "/ua/:path*", permanent: false }],
};

export default nextConfig;
