import { z } from "zod";
import { requireAdmin, jsonError, createAuditLog } from "@/lib/auth-helpers";

const schema = z.object({
  brokenAt: z.string().min(1),
  note: z.string().max(2000).optional(),
});

/**
 * POST /api/admin/audit/acknowledge - acknowledge a detected tampering incident.
 * Records an auditable entry that itself extends the hash chain forward from
 * the known break (Addendum E.4.4).
 */
export async function POST(req: Request) {
  try {
    const user = await requireAdmin();
    const body = await req.json().catch(() => ({}));
    const parsed = schema.safeParse(body);
    if (!parsed.success) return jsonError("Invalid request", 400);

    const { brokenAt, note } = parsed.data;

    await createAuditLog({
      actorId: user.id,
      action: "audit.tampering_acknowledged",
      target: brokenAt,
      metadata: { note: note ?? null },
    });

    return Response.json({ ok: true });
  } catch (e) {
    if (e instanceof Response) return e;
    return jsonError("Internal server error", 500);
  }
}
