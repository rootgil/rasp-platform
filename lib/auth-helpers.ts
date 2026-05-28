import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import type { Prisma } from "@prisma/client";
import { createHash } from "node:crypto";

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

export async function requireAdmin(): Promise<SessionUser> {
  const user = await requireSession();
  if (user.role !== "admin") {
    throw new Response(JSON.stringify({ error: "Forbidden" }), {
      status: 403,
      headers: { "Content-Type": "application/json" },
    });
  }
  return user;
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

/**
 * Verify the audit-log hash chain. Returns the first id where the chain breaks,
 * or null if intact. Used to detect tampering (Addendum E.4.4).
 */
export async function verifyAuditChain(): Promise<{ ok: boolean; brokenAt: string | null }> {
  const logs = await prisma.auditLog.findMany({ orderBy: { createdAt: "asc" } });
  let prevHash: string | null = null;
  for (const log of logs) {
    const expected: string = createHash("sha256")
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
    if (log.prevHash !== prevHash || log.hash !== expected) {
      return { ok: false, brokenAt: log.id };
    }
    prevHash = log.hash;
  }
  return { ok: true, brokenAt: null };
}

export function jsonError(message: string, status: number) {
  return Response.json({ error: message }, { status });
}

export function jsonOk(data: unknown, status = 200) {
  return Response.json(data, { status });
}
