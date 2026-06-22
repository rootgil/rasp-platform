import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import type { Prisma } from "@prisma/client";
import { createHash } from "node:crypto";
import { jwtVerify } from "jose";

export type SessionUser = {
  id: string;
  email: string;
  name?: string | null;
  role: string;
  organizationId?: string;
};

export async function requireSession(): Promise<SessionUser> {
  const session = await auth();
  if (!session?.user) {
    throw new Response(JSON.stringify({ error: "Unauthorized" }), {
      status: 401,
      headers: { "Content-Type": "application/json" },
    });
  }
  return session.user as SessionUser;
}

/**
 * Attempt to authenticate via a break-glass JWT passed as
 * `Authorization: Bearer <jwt>` when there is no active Next-Auth session.
 * Returns a synthetic SessionUser if the JWT is valid, null otherwise.
 */
async function tryBreakGlassJwt(req?: Request): Promise<SessionUser | null> {
  try {
    // In Next.js Route Handlers the request is available via `headers()`, but
    // requireAdmin is also called from places where we can pass the Request.
    // We rely on the caller optionally passing it; if not available we skip.
    if (!req) return null;
    const authHeader = req.headers.get("authorization") ?? "";
    if (!authHeader.startsWith("Bearer ")) return null;
    const token = authHeader.slice(7);

    const secret = process.env.AUTH_SECRET;
    if (!secret) return null;

    const { payload } = await jwtVerify(token, new TextEncoder().encode(secret));

    if (!payload.breakGlass) return null;
    if (payload.role !== "admin") return null;

    return {
      id: payload.sub as string,
      email: payload.email as string,
      role: "admin",
    };
  } catch {
    return null;
  }
}

export async function requireAdmin(req?: Request): Promise<SessionUser> {
  // 1. Try normal Next-Auth session first
  const session = await auth();
  if (session?.user) {
    const user = session.user as SessionUser;
    if (user.role !== "admin") {
      throw new Response(JSON.stringify({ error: "Forbidden" }), {
        status: 403,
        headers: { "Content-Type": "application/json" },
      });
    }
    return user;
  }

  // 2. Fall back to break-glass JWT (for emergency access without a session)
  if (req) {
    const bgUser = await tryBreakGlassJwt(req);
    if (bgUser) return bgUser;
  }

  // 3. No valid authentication
  throw new Response(JSON.stringify({ error: "Unauthorized" }), {
    status: 401,
    headers: { "Content-Type": "application/json" },
  });
}

export async function getOrgId(userId: string): Promise<string> {
  const membership = await prisma.organizationMember.findFirst({
    where: { userId },
  });
  if (!membership) {
    throw new Response(JSON.stringify({ error: "No organization found" }), {
      status: 404,
      headers: { "Content-Type": "application/json" },
    });
  }
  return membership.organizationId;
}

export async function createAuditLog({
  actorId,
  organizationId,
  action,
  target,
  metadata,
}: {
  actorId?: string;
  organizationId?: string;
  action: string;
  target?: string;
  metadata?: Record<string, unknown>;
}) {
  // Hash-chain the entry to the previous one for tamper-evidence.
  const prev = await prisma.auditLog.findFirst({
    orderBy: { createdAt: "desc" },
    select: { hash: true },
  });
  const prevHash = prev?.hash ?? null;
  const createdAt = new Date();
  const hash = createHash("sha256")
    .update(
      JSON.stringify({
        prevHash,
        actorId: actorId ?? null,
        organizationId: organizationId ?? null,
        action,
        target: target ?? null,
        metadata: metadata ?? null,
        createdAt: createdAt.toISOString(),
      })
    )
    .digest("hex");

  return prisma.auditLog.create({
    data: {
      actorId,
      organizationId,
      action,
      target,
      metadata: metadata as Prisma.InputJsonValue | undefined,
      prevHash,
      hash,
      createdAt,
    },
  });
}

export type AuditChainBrokenRecord = {
  id: string;
  action: string;
  target: string | null;
  createdAt: string;
  actor: string | null;
  organization: string | null;
  prevHash: string | null;
  storedHash: string | null;
  expectedHash: string;
};

export type AuditChainResult =
  | { ok: true; brokenAt: null; reason: null; brokenRecord: null }
  | { ok: false; brokenAt: string; reason: "prev_link_broken" | "hash_mismatch"; brokenRecord: AuditChainBrokenRecord };

/**
 * Verify the audit-log hash chain. Returns the first id where the chain breaks,
 * enriched with the record details and reason. Used to detect tampering (Addendum E.4.4).
 */
export async function verifyAuditChain(): Promise<AuditChainResult> {
  const logs = await prisma.auditLog.findMany({
    orderBy: { createdAt: "asc" },
    include: {
      actor: { select: { name: true, email: true } },
      organization: { select: { name: true } },
    },
  });
  let prevHash: string | null = null;
  for (const log of logs) {
    const expectedHash: string = createHash("sha256")
      .update(
        JSON.stringify({
          prevHash,
          actorId: log.actorId ?? null,
          organizationId: log.organizationId ?? null,
          action: log.action,
          target: log.target ?? null,
          metadata: (log.metadata as unknown) ?? null,
          createdAt: log.createdAt.toISOString(),
        })
      )
      .digest("hex");
    const prevLinkBroken = log.prevHash !== prevHash;
    const hashMismatch = log.hash !== expectedHash;
    if (prevLinkBroken || hashMismatch) {
      return {
        ok: false,
        brokenAt: log.id,
        reason: prevLinkBroken ? "prev_link_broken" : "hash_mismatch",
        brokenRecord: {
          id: log.id,
          action: log.action,
          target: log.target ?? null,
          createdAt: log.createdAt.toISOString(),
          actor: log.actor ? (log.actor.name ?? log.actor.email) : null,
          organization: log.organization?.name ?? null,
          prevHash: log.prevHash ?? null,
          storedHash: log.hash ?? null,
          expectedHash,
        },
      };
    }
    prevHash = log.hash;
  }
  return { ok: true, brokenAt: null, reason: null, brokenRecord: null };
}

export function jsonError(message: string, status: number) {
  return Response.json({ error: message }, { status });
}

export function jsonOk(data: unknown, status = 200) {
  return Response.json(data, { status });
}
