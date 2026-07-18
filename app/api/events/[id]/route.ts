import { requireSession, getOrgId, getOrgIdForSession, jsonError } from "@/lib/auth-helpers";
import { getEvent } from "@/modules/events/events.server";

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const user = await requireSession();
    const orgId = await getOrgIdForSession(user);
    const event = await getEvent(id, orgId);
    if (!event) return jsonError("Not found", 404);
    return Response.json(event);
  } catch (e) {
    if (e instanceof Response) return e;
    return jsonError("Internal server error", 500);
  }
}
