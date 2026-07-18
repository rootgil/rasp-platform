import { requireSession, getOrgId, getOrgIdForSession, jsonError } from "@/lib/auth-helpers";
import { getAuditLogs } from "@/modules/audit/audit.server";

export async function GET() {
  try {
    const user = await requireSession();
    const orgId = await getOrgIdForSession(user);
    const logs = await getAuditLogs(orgId);
    return Response.json(logs);
  } catch (e) {
    if (e instanceof Response) return e;
    return jsonError("Internal server error", 500);
  }
}
