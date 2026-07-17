import { z } from "zod";

const WEAK_SECRETS = new Set([
  "change-me",
  "change-me-use-openssl-rand-base64-32",
  "rasp-platform-dev-secret-change-in-production",
  "secret",
  "dev-secret",
]);

function isWeakSecret(value: string): boolean {
  const trimmed = value.trim();
  if (trimmed.length < 16) return true;
  if (WEAK_SECRETS.has(trimmed)) return true;
  if (trimmed.startsWith("change-me")) return true;
  return false;
}

function containsLocalhost(value: string): boolean {
  return /localhost|127\.0\.0\.1/i.test(value);
}

const envSchema = z.object({
  NODE_ENV: z.enum(["development", "production", "test"]).default("development"),
  DATABASE_URL: z.string().min(1).optional(),
  AUTH_SECRET: z.string().optional(),
  NEXTAUTH_SECRET: z.string().optional(),
  NEXTAUTH_URL: z.string().optional(),
  NEXT_PUBLIC_APP_URL: z.string().optional(),
  CORS_ALLOWED_ORIGINS: z.string().optional(),
  COLLECTOR_INTERNAL_URL: z.string().optional(),
  KEK_MASTER_KEY: z.string().optional(),
  DATABASE_SSL_VERIFY: z
    .string()
    .optional()
    .transform((v) => v === "true"),
  DOCS_ENABLED: z
    .string()
    .optional()
    .transform((v) => (v === undefined ? undefined : v === "true")),
});

export type AppEnv = {
  nodeEnv: "development" | "production" | "test";
  isProd: boolean;
  isDev: boolean;
  databaseUrl: string | undefined;
  authSecret: string | undefined;
  nextAuthSecret: string | undefined;
  nextAuthUrl: string | undefined;
  appUrl: string;
  corsAllowedOrigins: string[];
  collectorInternalUrl: string;
  kekMasterKey: string | undefined;
  databaseSslVerify: boolean;
  docsEnabled: boolean;
};

let cached: AppEnv | null = null;

/**
 * Parse and validate environment variables.
 * In production, refuses weak auth secrets and localhost public URLs.
 */
export function getEnv(): AppEnv {
  if (cached) return cached;

  const parsed = envSchema.safeParse(process.env);
  if (!parsed.success) {
    throw new Error(
      `Invalid environment variables: ${JSON.stringify(parsed.error.flatten().fieldErrors)}`
    );
  }

  const raw = parsed.data;
  const isProd = raw.NODE_ENV === "production";

  if (isProd) {
    const authSecret = raw.AUTH_SECRET ?? raw.NEXTAUTH_SECRET;
    if (!authSecret || isWeakSecret(authSecret)) {
      throw new Error(
        "AUTH_SECRET / NEXTAUTH_SECRET must be a strong random value in production (openssl rand -base64 32). Template values are rejected."
      );
    }
    if (raw.AUTH_SECRET && raw.NEXTAUTH_SECRET && isWeakSecret(raw.NEXTAUTH_SECRET)) {
      throw new Error("NEXTAUTH_SECRET is a weak template value and is rejected in production.");
    }

    if (raw.NEXTAUTH_URL && containsLocalhost(raw.NEXTAUTH_URL)) {
      throw new Error("NEXTAUTH_URL must not contain localhost in production.");
    }
    if (raw.NEXT_PUBLIC_APP_URL && containsLocalhost(raw.NEXT_PUBLIC_APP_URL)) {
      throw new Error("NEXT_PUBLIC_APP_URL must not contain localhost in production.");
    }
    if (!raw.NEXT_PUBLIC_APP_URL && !raw.NEXTAUTH_URL) {
      throw new Error("NEXT_PUBLIC_APP_URL (or NEXTAUTH_URL) is required in production for email links and callbacks.");
    }
  }

  const corsRaw =
    raw.CORS_ALLOWED_ORIGINS?.trim() ||
    (isProd ? raw.NEXTAUTH_URL ?? raw.NEXT_PUBLIC_APP_URL ?? "" : "http://localhost:3000");

  const corsAllowedOrigins = corsRaw
    .split(",")
    .map((o) => o.trim())
    .filter(Boolean);

  const appUrl =
    raw.NEXT_PUBLIC_APP_URL?.replace(/\/$/, "") ||
    raw.NEXTAUTH_URL?.replace(/\/$/, "") ||
    (isProd ? "" : "http://localhost:3000");

  if (isProd && !appUrl) {
    throw new Error("NEXT_PUBLIC_APP_URL is required in production.");
  }

  cached = {
    nodeEnv: raw.NODE_ENV,
    isProd,
    isDev: raw.NODE_ENV === "development",
    databaseUrl: raw.DATABASE_URL,
    authSecret: raw.AUTH_SECRET,
    nextAuthSecret: raw.NEXTAUTH_SECRET,
    nextAuthUrl: raw.NEXTAUTH_URL,
    appUrl,
    corsAllowedOrigins:
      corsAllowedOrigins.length > 0 ? corsAllowedOrigins : ["http://localhost:3000"],
    collectorInternalUrl: raw.COLLECTOR_INTERNAL_URL ?? "http://localhost:4000",
    kekMasterKey: raw.KEK_MASTER_KEY || undefined,
    databaseSslVerify:
      raw.DATABASE_SSL_VERIFY === true ||
      (raw.DATABASE_URL?.includes("sslmode=verify-full") ?? false),
    docsEnabled: raw.DOCS_ENABLED ?? !isProd,
  };

  return cached;
}

/** Public app URL for invite / reset email links. */
export function getAppUrl(): string {
  return getEnv().appUrl;
}

/** Reset cache (tests only). */
export function resetEnvCache(): void {
  cached = null;
}
