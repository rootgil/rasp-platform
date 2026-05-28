import { requireAdmin, jsonError } from "@/lib/auth-helpers";
import { getVersionExposure } from "@/modules/admin/incident.server";

/**
 * GET /api/backoffice/version-exposure?version=1.2.3 — forensic mapping of
 * which customers/agents run a given version (Addendum E.6).
 */
export async function GET(req: Request) {
  try {
    await requireAdmin();
    const version = new URL(req.url).searchParams.get("version");
    if (!version) return jsonError("version query param is required", 400);
    const exposure = await getVersionExposure(version);
    return Response.json(exposure);
  } catch (e) {
    if (e instanceof Response) return e;
    return jsonError("Internal server error", 500);
  }
}
