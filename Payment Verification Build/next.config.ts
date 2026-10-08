import type { NextConfig } from "next";

const securityHeaders = [
  { key: "X-DNS-Prefetch-Control", value: "on" },
  { key: "X-Frame-Options", value: "SAMEORIGIN" },
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  {
    key: "Permissions-Policy",
    value: "camera=(), microphone=(), geolocation=()",
  },
  {
    key: "Strict-Transport-Security",
    value: "max-age=63072000; includeSubDomains; preload",
  },
];

const nextConfig: NextConfig = {
  reactStrictMode: true,
  serverExternalPackages: ["@prisma/client", "aether-prisma-sqlite"],
  // The SQLite Prisma client is generated into node_modules/aether-prisma-sqlite
  // (custom output). Make sure Vercel bundles it, including the query engine
  // binary, into every serverless function that touches the database.
  outputFileTracingIncludes: {
    "/*": [
      "./node_modules/aether-prisma-sqlite/**/*",
      "./node_modules/.prisma/client/**/*",
    ],
    "/api/**/*": [
      "./node_modules/aether-prisma-sqlite/**/*",
      "./node_modules/.prisma/client/**/*",
    ],
  },
  async headers() {
    return [
      {
        source: "/(.*)",
        headers: securityHeaders,
      },
    ];
  },
};

export default nextConfig;
