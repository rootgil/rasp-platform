import type { NextConfig } from "next";

const ALLOWED_ORIGINS = [
  "http://localhost:3000",
  "http://166.0.147.218:3000",
];

const corsHeaders = (origin: string) => [
  { key: "Access-Control-Allow-Origin", value: origin },
  { key: "Access-Control-Allow-Methods", value: "GET,POST,PUT,PATCH,DELETE,OPTIONS" },
  { key: "Access-Control-Allow-Headers", value: "Content-Type,Authorization,x-mfa-token" },
  { key: "Access-Control-Allow-Credentials", value: "true" },
];

const nextConfig: NextConfig = {
  output: "standalone",
  async headers() {
    return ALLOWED_ORIGINS.map((origin) => ({
      source: "/api/:path*",
      headers: corsHeaders(origin),
    }));
  },
};

export default nextConfig;
