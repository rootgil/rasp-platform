import net from "node:net";
import { prisma } from "@/lib/prisma";

export type HealthStatus = "healthy" | "degraded" | "offline" | "missing" | "optional";

export type HealthCheck = {
  name: string;
  group: "runtime" | "config";
  status: HealthStatus;
  detail: string;
  required: boolean;
};

export type CollectorHealthPayload = {
  status?: string;
  service?: string;
  version?: string;
  timestamp?: string;
  db?: string;
  redis?: string;
  queue?: boolean;
};

function isWeakSecret(value: string | undefined): boolean {
  if (!value) return true;
  const trimmed = value.trim();
  if (trimmed.length < 16) return true;
  if (trimmed.startsWith("change-me")) return true;
  if (trimmed === "secret" || trimmed === "dev-secret") return true;
  return false;
}

function hasValidKek(value: string | undefined): boolean {
  if (!value?.trim()) return false;
  try {
    return Buffer.from(value, "base64").length === 32;
  } catch {
    return false;
  }
}

export async function checkDatabaseHealth(): Promise<HealthCheck> {
  const start = Date.now();
  try {
    await prisma.$queryRaw`SELECT 1`;
    const latencyMs = Date.now() - start;
    return {
      name: "PostgreSQL",
      group: "runtime",
      status: "healthy",
      detail: `Connected (${latencyMs}ms)`,
      required: true,
    };
  } catch {
    return {
      name: "PostgreSQL",
      group: "runtime",
      status: "offline",
      detail: "Cannot reach database",
      required: true,
    };
  }
}

/**
 * Lightweight Redis PING over RESP without adding ioredis to the platform.
 * Supports redis://host:port and optional password in the URL.
 */
export async function checkRedisHealth(
  redisUrl = process.env.REDIS_URL
): Promise<HealthCheck> {
  if (!redisUrl?.trim()) {
    return {
      name: "Redis",
      group: "runtime",
      status: "missing",
      detail: "REDIS_URL required — set redis://redis:6379 (Docker) or redis://localhost:6379 (host)",
      required: true,
    };
  }

  let host = "localhost";
  let port = 6379;
  let password: string | undefined;

  try {
    const parsed = new URL(redisUrl);
    host = parsed.hostname || host;
    port = Number(parsed.port || 6379);
    password = parsed.password ? decodeURIComponent(parsed.password) : undefined;
  } catch {
    return {
      name: "Redis",
      group: "runtime",
      status: "degraded",
      detail: "Invalid REDIS_URL",
      required: true,
    };
  }

  const start = Date.now();

  return new Promise((resolve) => {
    const socket = net.connect({ host, port });
    let buf = "";
    let settled = false;

    const finish = (check: HealthCheck) => {
      if (settled) return;
      settled = true;
      socket.destroy();
      resolve(check);
    };

    socket.setTimeout(3000);

    socket.on("connect", () => {
      if (password) {
        socket.write(
          `*2\r\n$4\r\nAUTH\r\n$${Buffer.byteLength(password)}\r\n${password}\r\n`
        );
      }
      socket.write("*1\r\n$4\r\nPING\r\n");
    });

    socket.on("data", (chunk) => {
      buf += chunk.toString("utf8");
      if (buf.includes("-ERR") || buf.includes("-WRONGPASS") || buf.includes("-NOAUTH")) {
        finish({
          name: "Redis",
          group: "runtime",
          status: "degraded",
          detail: "Authentication failed",
          required: true,
        });
        return;
      }
      if (buf.includes("+PONG")) {
        finish({
          name: "Redis",
          group: "runtime",
          status: "healthy",
          detail: `PONG (${Date.now() - start}ms)`,
          required: true,
        });
      }
    });

    socket.on("timeout", () => {
      finish({
        name: "Redis",
        group: "runtime",
        status: "offline",
        detail: "Timeout waiting for PONG",
        required: true,
      });
    });

    socket.on("error", () => {
      finish({
        name: "Redis",
        group: "runtime",
        status: "offline",
        detail: `Cannot reach Redis at ${host}:${port} — check REDIS_URL`,
        required: true,
      });
    });
  });
}

export async function checkCollectorHealth(
  collectorUrl = process.env.COLLECTOR_INTERNAL_URL ?? "http://localhost:4000"
): Promise<{ check: HealthCheck; data: CollectorHealthPayload | null }> {
  try {
    const res = await fetch(`${collectorUrl.replace(/\/$/, "")}/health`, {
      cache: "no-store",
      signal: AbortSignal.timeout(5000),
    });
    const data = (await res.json().catch(() => null)) as CollectorHealthPayload | null;

    if (res.ok && data?.status === "ok") {
      return {
        check: {
          name: "Collector",
          group: "runtime",
          status: "healthy",
          detail: `Responding (${data.service ?? "rasp-collector"} v${data.version ?? "?"})`,
          required: true,
        },
        data,
      };
    }

    if (res.status === 503 || data?.status === "degraded") {
      return {
        check: {
          name: "Collector",
          group: "runtime",
          status: "degraded",
          detail: `Degraded — db=${data?.db ?? "?"}, redis=${data?.redis ?? "?"}`,
          required: true,
        },
        data,
      };
    }

    return {
      check: {
        name: "Collector",
        group: "runtime",
        status: "degraded",
        detail: `HTTP ${res.status}`,
        required: true,
      },
      data,
    };
  } catch {
    return {
      check: {
        name: "Collector",
        group: "runtime",
        status: "offline",
        detail: "Cannot reach collector — check COLLECTOR_INTERNAL_URL",
        required: true,
      },
      data: null,
    };
  }
}

/** Static configuration readiness (not live probes). */
export function checkConfigHealth(): HealthCheck[] {
  const isProd = process.env.NODE_ENV === "production";
  const authSecret = process.env.AUTH_SECRET ?? process.env.NEXTAUTH_SECRET;
  const kek = process.env.KEK_MASTER_KEY;
  const smtpUser = process.env.SMTP_USER;
  const smtpPass = process.env.SMTP_PASS;
  const policyPriv = process.env.POLICY_SIGNING_PRIVATE_KEY;
  const policyPub = process.env.POLICY_SIGNING_PUBLIC_KEY;
  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? process.env.NEXTAUTH_URL;

  const checks: HealthCheck[] = [
    {
      name: "Auth secret",
      group: "config",
      required: true,
      status: !isWeakSecret(authSecret)
        ? "healthy"
        : isProd
          ? "missing"
          : "degraded",
      detail: !isWeakSecret(authSecret)
        ? "AUTH_SECRET / NEXTAUTH_SECRET configured"
        : "Weak or missing AUTH_SECRET — generate with openssl rand -base64 32",
    },
    {
      name: "Envelope encryption (KEK)",
      group: "config",
      required: isProd,
      status: hasValidKek(kek)
        ? "healthy"
        : isProd
          ? "missing"
          : "optional",
      detail: hasValidKek(kek)
        ? "KEK_MASTER_KEY valid (32-byte)"
        : isProd
          ? "KEK_MASTER_KEY required in production"
          : "KEK unset — encryption disabled (dev only)",
    },
    {
      name: "Policy signing keys",
      group: "config",
      required: false,
      status:
        policyPriv &&
        policyPub &&
        !policyPriv.includes("GENERATE_AT_DEPLOY") &&
        !policyPub.includes("GENERATE_AT_DEPLOY")
          ? "healthy"
          : "optional",
      detail:
        policyPriv &&
        policyPub &&
        !policyPriv.includes("GENERATE_AT_DEPLOY") &&
        !policyPub.includes("GENERATE_AT_DEPLOY")
          ? "Ed25519 signing keys configured"
          : "POLICY_SIGNING_* not set — signed policies unavailable",
    },
    {
      name: "SMTP email",
      group: "config",
      required: false,
      status: smtpUser && smtpPass ? "healthy" : "optional",
      detail:
        smtpUser && smtpPass
          ? `Configured (${process.env.SMTP_HOST ?? "smtp"})`
          : "SMTP_* unset — invites / password reset emails disabled",
    },
    {
      name: "Public app URL",
      group: "config",
      required: true,
      status: appUrl
        ? isProd && /localhost|127\.0\.0\.1/i.test(appUrl)
          ? "degraded"
          : "healthy"
        : isProd
          ? "missing"
          : "degraded",
      detail: appUrl
        ? `NEXT_PUBLIC_APP_URL / NEXTAUTH_URL = ${appUrl.replace(/\/\/.*@/, "//***@")}`
        : "App URL missing — email links and callbacks will fail",
    },
  ];

  return checks;
}

export async function getSystemHealth() {
  const [database, redis, collectorResult] = await Promise.all([
    checkDatabaseHealth(),
    checkRedisHealth(),
    checkCollectorHealth(),
  ]);

  const configChecks = checkConfigHealth();

  /** Surface collector-reported redis/db as separate rows when useful. */
  const collectorDeps: HealthCheck[] = [];
  if (collectorResult.data) {
    const d = collectorResult.data;
    if (d.db) {
      collectorDeps.push({
        name: "Collector → PostgreSQL",
        group: "runtime",
        required: true,
        status: d.db === "ok" ? "healthy" : "degraded",
        detail: d.db === "ok" ? "Collector DB probe OK" : "Collector cannot reach database",
      });
    }
    if (d.redis && d.redis !== "disabled") {
      collectorDeps.push({
        name: "Collector → Redis",
        group: "runtime",
        required: true,
        status: d.redis === "ok" ? "healthy" : "degraded",
        detail:
          d.redis === "ok"
            ? `Queue enabled — Redis OK`
            : "QUEUE_ENABLED but Redis unreachable from collector",
      });
    } else if (d.queue === false || d.redis === "disabled") {
      collectorDeps.push({
        name: "Collector → Redis",
        group: "runtime",
        required: false,
        status: "optional",
        detail: "QUEUE_ENABLED=false — Redis not required for sync ingest",
      });
    }
  }

  const checks: HealthCheck[] = [
    database,
    redis,
    collectorResult.check,
    ...collectorDeps,
    ...configChecks,
  ];

  const requiredDown = checks.filter(
    (c) => c.required && (c.status === "offline" || c.status === "missing")
  );
  const requiredDegraded = checks.filter(
    (c) => c.required && c.status === "degraded"
  );

  const overall: HealthStatus =
    requiredDown.length > 0
      ? "offline"
      : requiredDegraded.length > 0
        ? "degraded"
        : "healthy";

  return {
    overall,
    checks,
    collector: collectorResult.data,
    checkedAt: new Date().toISOString(),
  };
}
