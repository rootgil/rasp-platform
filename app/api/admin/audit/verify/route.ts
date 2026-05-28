import { requireAdmin, jsonError, verifyAuditChain } from "@/lib/auth-helpers";

/**
 * GET /api/admin/audit/verify — verify the tamper-evident audit-log hash chain
 * (Addendum E.4.4). Returns { ok, brokenAt }.
 */
export async function GET() {
  try {
    await requireAdmin();
    const result = await verifyAuditChain();
    return Response.json(result);
  } catch (e) {
    if (e instanceof Response) return e;
    return jsonError("Internal server error", 500);
  }
}
