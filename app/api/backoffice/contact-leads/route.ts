import { requireAdmin, jsonError } from "@/lib/auth-helpers";
import { prisma } from "@/lib/prisma";

export async function GET() {
  try {
    await requireAdmin();
    const leads = await prisma.contactLead.findMany({
      orderBy: { createdAt: "desc" },
    });
    return Response.json(leads);
  } catch (e) {
    if (e instanceof Response) return e;
    return jsonError("Internal server error", 500);
  }
}
