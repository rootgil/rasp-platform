import { requireSession, createAuditLog, jsonError, jsonOk } from "@/lib/auth-helpers";
import { prisma } from "@/lib/prisma";

export async function POST() {
  try {
    const user = await requireSession();

    await prisma.user.update({
      where: { id: user.id },
      data: { onboardedAt: new Date() },
    });

    await createAuditLog({
      actorId: user.id,
      organizationId: user.organizationId,
      action: "user.onboarding_completed",
      target: user.id,
    });

    return jsonOk({ ok: true });
  } catch (e) {
    if (e instanceof Response) return e;
    return jsonError("Internal server error", 500);
  }
}
