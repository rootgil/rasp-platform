import { requireAdmin, jsonError } from "@/lib/auth-helpers";
import { getRolloutKpis } from "@/modules/rollout/rollout.server";

/** Rollout KPIs: success rate, canary catch-rate, average MTTR (Addendum D.5). */
export async function GET() {
  try {
    await requireAdmin();
    const kpis = await getRolloutKpis();
    return Response.json(kpis);
  } catch (e) {
    if (e instanceof Response) return e;
    return jsonError("Internal server error", 500);
  }
}
