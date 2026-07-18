import type { NextConfig } from "next";

/**
 * CORS origins from CORS_ALLOWED_ORIGINS (comma-separated).
 * Fallback: localhost in non-production, or NEXTAUTH_URL / NEXT_PUBLIC_APP_URL.
 */
function resolveAllowedOrigins(): string[] {
  const fromEnv = process.env.CORS_ALLOWED_ORIGINS?.trim();
  if (fromEnv) {
    return fromEnv
      .split(",")
      .map((o) => o.trim())
      .filter(Boolean);
  }
  if (process.env.NODE_ENV === "production") {
    const prod =
      process.env.NEXTAUTH_URL?.replace(/\/$/, "") ||
      process.env.NEXT_PUBLIC_APP_URL?.replace(/\/$/, "");
    return prod ? [prod] : [];
  }
  return ["http://localhost:3000"];
}

const corsHeaders = (origin: string) => [
  { key: "Access-Control-Allow-Origin", value: origin },
  { key: "Access-Control-Allow-Methods", value: "GET,POST,PUT,PATCH,DELETE,OPTIONS" },
  { key: "Access-Control-Allow-Headers", value: "Content-Type,Authorization,x-mfa-token" },
  { key: "Access-Control-Allow-Credentials", value: "true" },
];

const nextConfig: NextConfig = {
  output: "standalone",
  async headers() {
    const origins = resolveAllowedOrigins();
    if (origins.length === 0) return [];
    return origins.map((origin) => ({
      source: "/api/:path*",
      headers: corsHeaders(origin),
    }));
  },
};

export default nextConfig;
