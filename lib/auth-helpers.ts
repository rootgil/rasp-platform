import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import type { Prisma } from "@prisma/client";

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
  return prisma.auditLog.create({
    data: {
      actorId,
      organizationId,
      action,
      target,
      metadata: metadata as Prisma.InputJsonValue | undefined,
    },
  });
}

export function jsonError(message: string, status: number) {
  return Response.json({ error: message }, { status });
}

export function jsonOk(data: unknown, status = 200) {
  return Response.json(data, { status });
}
