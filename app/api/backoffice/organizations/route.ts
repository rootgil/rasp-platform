import { requireAdmin, jsonError } from "@/lib/auth-helpers";
import { getAllOrganizations } from "@/modules/organizations/organizations.server";

export async function GET() {
  try {
    await requireAdmin();
    const orgs = await getAllOrganizations();
    return Response.json(orgs);
  } catch (e) {
    if (e instanceof Response) return e;
    return jsonError("Internal server error", 500);
  }
}
