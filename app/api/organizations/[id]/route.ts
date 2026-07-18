import { requireSession, getOrgId, getOrgIdForSession, createAuditLog, jsonError } from "@/lib/auth-helpers";
import { prisma } from "@/lib/prisma";
import { z } from "zod";

const schema = z.object({
  name: z.string().min(1).max(100),
});

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await requireSession();
    const orgId = await getOrgIdForSession(user);
    const { id } = await params;

    if (id !== orgId) return jsonError("Forbidden", 403);

    const membership = await prisma.organizationMember.findUnique({
      where: { organizationId_userId: { organizationId: orgId, userId: user.id } },
    });
    if (membership?.role !== "owner") return jsonError("Only organization owners can update settings", 403);

    const body = await req.json();
    const parsed = schema.safeParse(body);
    if (!parsed.success) return jsonError(parsed.error.message, 400);

    const updated = await prisma.organization.update({
      where: { id: orgId },
      data: { name: parsed.data.name },
      select: { id: true, name: true },
    });

    await createAuditLog({
      actorId: user.id,
      organizationId: orgId,
      action: "organization.update",
      target: orgId,
      metadata: { name: parsed.data.name },
    });

    return Response.json(updated);
  } catch (e) {
    if (e instanceof Response) return e;
    return jsonError("Internal server error", 500);
  }
}
