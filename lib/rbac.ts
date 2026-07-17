import { prisma } from "@/lib/prisma";

export type OrgRole = "owner" | "member";

/**
 * Assert the user has one of the required org roles.
 * Throws a 403 Response when the membership is missing or insufficient.
 */
export async function requireOrgRole(
  userId: string,
  organizationId: string,
  allowed: OrgRole[] = ["owner"]
): Promise<{ role: OrgRole }> {
  const membership = await prisma.organizationMember.findFirst({
    where: { userId, organizationId },
    select: { role: true },
  });

  if (!membership || !allowed.includes(membership.role as OrgRole)) {
    throw new Response(
      JSON.stringify({
        error: `Requires organization role: ${allowed.join(" or ")}`,
      }),
      { status: 403, headers: { "Content-Type": "application/json" } }
    );
  }

  return { role: membership.role as OrgRole };
}

export { sanitizeCallbackUrl } from "@/lib/safe-url";
