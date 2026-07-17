import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import pg from "pg";

const globalForPrisma = globalThis as unknown as {
  prisma: ReturnType<typeof createPrismaClient> | undefined;
};

/**
 * Prisma query extension that enforces append-only semantics on the AuditLog
 * table (Addendum E.4.2). Even platform admins cannot delete or update audit
 * records — the hash chain would break, and any tampering would be detectable.
 */
const auditLogGuard = {
  query: {
    auditLog: {
      async delete(): Promise<never> {
        throw new Error("AuditLog is append-only: delete is not permitted");
      },
      async deleteMany(): Promise<never> {
        throw new Error("AuditLog is append-only: deleteMany is not permitted");
      },
      async update(): Promise<never> {
        throw new Error("AuditLog is append-only: update is not permitted");
      },
      async updateMany(): Promise<never> {
        throw new Error("AuditLog is append-only: updateMany is not permitted");
      },
    },
  },
};

function resolveSsl(): { rejectUnauthorized: boolean } | undefined {
  const url = process.env.DATABASE_URL ?? "";
  const verify =
    process.env.DATABASE_SSL_VERIFY === "true" ||
    url.includes("sslmode=verify-full");
  if (verify) {
    return { rejectUnauthorized: true };
  }
  // Neon / managed Postgres often need TLS; default remains permissive for
  // sslmode=require without a pinned CA. Prefer DATABASE_SSL_VERIFY=true in prod.
  if (url.includes("neon.tech") || url.includes("sslmode=require")) {
    return { rejectUnauthorized: false };
  }
  return undefined;
}

function createPrismaClient() {
  const pool = new pg.Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: resolveSsl(),
    max: 3,
    connectionTimeoutMillis: 20000,
    idleTimeoutMillis: 30000,
  });
  const adapter = new PrismaPg(pool);
  const client = new PrismaClient({
    adapter,
    log:
      process.env.NODE_ENV === "development"
        ? ["error", "warn"]
        : ["error"],
  });
  return client.$extends(auditLogGuard);
}

export const prisma = globalForPrisma.prisma ?? createPrismaClient();

if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = prisma;
