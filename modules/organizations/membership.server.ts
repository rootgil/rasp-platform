import { prisma } from "@/lib/prisma";

/**
 * Resolve the caller's organization membership (deterministic).
 * Prefer `preferredOrgId` when the user belongs to that org.
 */
export async function getMembership(
  userId: string,
  preferredOrgId?: string | null
) {
  if (preferredOrgId) {
    const preferred = await prisma.organizationMember.findFirst({
      where: { userId, organizationId: preferredOrgId },
      include: {
        organization: {
          select: { id: true, name: true, projects: { select: { id: true, name: true } } },
        },
      },
    });
    if (preferred) return preferred;
  }

  return prisma.organizationMember.findFirst({
    where: { userId },
    orderBy: { createdAt: "asc" },
    include: {
      organization: {
        select: { id: true, name: true, projects: { select: { id: true, name: true } } },
      },
    },
  });
}

export async function requireMembershipOrgId(
  userId: string,
  preferredOrgId?: string | null
): Promise<string> {
  const membership = await getMembership(userId, preferredOrgId);
  if (!membership) {
    throw new Response(JSON.stringify({ error: "No organization found" }), {
      status: 404,
      headers: { "Content-Type": "application/json" },
    });
  }
  return membership.organizationId;
}

/** Org settings page: members + pending invites + profile. */
export async function getOrgSettingsPage(userId: string, organizationId: string) {
  const membership = await prisma.organizationMember.findFirst({
    where: { userId, organizationId },
    select: {
      id: true,
      role: true,
      organizationId: true,
      organization: {
        select: { id: true, name: true, plan: true, createdAt: true },
      },
    },
  });
  if (!membership) return null;

  const [members, invitations, user] = await Promise.all([
    prisma.organizationMember.findMany({
      where: { organizationId },
      include: { user: { select: { id: true, name: true, email: true } } },
      orderBy: { createdAt: "asc" },
    }),
    prisma.invitation.findMany({
      where: { organizationId, acceptedAt: null, expiresAt: { gt: new Date() } },
      select: { id: true, email: true, role: true, expiresAt: true },
      orderBy: { createdAt: "desc" },
    }),
    prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        createdAt: true,
        onboardedAt: true,
      },
    }),
  ]);

  return { membership, members, invitations, user };
}

export async function getUserOnboardedAt(userId: string) {
  return prisma.user.findUnique({
    where: { id: userId },
    select: { onboardedAt: true },
  });
}
