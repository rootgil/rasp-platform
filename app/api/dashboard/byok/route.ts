import { requireSession, getOrgId, jsonError, createAuditLog } from "@/lib/auth-helpers";
import { prisma } from "@/lib/prisma";
import { z } from "zod";
import { createCipheriv, createDecipheriv, randomBytes } from "node:crypto";

/**
 * Wrap a customer KEK using the platform master KEK (AES-256-GCM).
 * Returns null when the master KEK is not configured (dev mode).
 */
function wrapCustomerKek(customerKekB64: string): string | null {
  const masterB64 = process.env.KEK_MASTER_KEY;
  if (!masterB64) return null;
  const masterKey = Buffer.from(masterB64, "base64");
  if (masterKey.length !== 32) return null;

  const customerKek = Buffer.from(customerKekB64, "base64");
  const iv = randomBytes(12);
  const cipher = createCipheriv("aes-256-gcm", masterKey, iv);
  const ct = Buffer.concat([cipher.update(customerKek), cipher.final()]);
  const tag = cipher.getAuthTag();
  return [iv.toString("base64"), tag.toString("base64"), ct.toString("base64")].join(".");
}

function unwrapCustomerKek(wrapped: string): string | null {
  const masterB64 = process.env.KEK_MASTER_KEY;
  if (!masterB64) return null;
  const masterKey = Buffer.from(masterB64, "base64");
  const [ivB64, tagB64, ctB64] = wrapped.split(".");
  if (!ivB64 || !tagB64 || !ctB64) return null;
  const decipher = createDecipheriv("aes-256-gcm", masterKey, Buffer.from(ivB64, "base64"));
  decipher.setAuthTag(Buffer.from(tagB64, "base64"));
  const pt = Buffer.concat([
    decipher.update(Buffer.from(ctB64, "base64")),
    decipher.final(),
  ]);
  return pt.toString("base64");
}

/** GET /api/dashboard/byok?projectId=… — return BYOK status (never the key). */
export async function GET(req: Request) {
  try {
    const user = await requireSession();
    const orgId = await getOrgId(user.id);
    const projectId = new URL(req.url).searchParams.get("projectId");
    if (!projectId) return jsonError("projectId required", 400);

    const project = await prisma.project.findUnique({
      where: { id: projectId, organizationId: orgId },
      select: { id: true, customerKekWrapped: true },
    });
    if (!project) return jsonError("Project not found", 404);

    return Response.json({
      byokEnabled: !!project.customerKekWrapped,
      masterKekConfigured: !!process.env.KEK_MASTER_KEY,
    });
  } catch (e) {
    if (e instanceof Response) return e;
    return jsonError("Internal server error", 500);
  }
}

const schema = z.discriminatedUnion("action", [
  z.object({
    action: z.literal("set"),
    projectId: z.string().min(1),
    // 32-byte key encoded as base64
    customerKek: z.string().min(44).max(44),
  }),
  z.object({
    action: z.literal("remove"),
    projectId: z.string().min(1),
  }),
]);

/**
 * POST /api/dashboard/byok
 *  - action "set": customer provides their own 32-byte KEK (base64). It is
 *    immediately wrapped by the platform master KEK and stored. The raw key is
 *    never logged or stored.
 *  - action "remove": remove customer KEK, fall back to global KEK.
 */
export async function POST(req: Request) {
  try {
    const user = await requireSession();
    const orgId = await getOrgId(user.id);
    const body = await req.json().catch(() => ({}));
    const parsed = schema.safeParse(body);
    if (!parsed.success) return jsonError(parsed.error.message, 400);

    const project = await prisma.project.findUnique({
      where: { id: parsed.data.projectId, organizationId: orgId },
      select: { id: true },
    });
    if (!project) return jsonError("Project not found", 404);

    if (parsed.data.action === "set") {
      if (!process.env.KEK_MASTER_KEY) {
        return jsonError("KEK_MASTER_KEY not configured on this platform", 503);
      }
      // Validate it decodes to 32 bytes
      const raw = Buffer.from(parsed.data.customerKek, "base64");
      if (raw.length !== 32) {
        return jsonError("customerKek must be a base64-encoded 32-byte key", 400);
      }
      const wrapped = wrapCustomerKek(parsed.data.customerKek);
      if (!wrapped) return jsonError("Failed to wrap key", 500);

      await prisma.project.update({
        where: { id: project.id },
        data: { customerKekWrapped: wrapped },
      });

      await createAuditLog({
        actorId: user.id,
        organizationId: orgId,
        action: "byok.key_set",
        target: project.id,
      });

      return Response.json({ byokEnabled: true });
    }

    // remove
    await prisma.project.update({
      where: { id: project.id },
      data: { customerKekWrapped: null },
    });

    await createAuditLog({
      actorId: user.id,
      organizationId: orgId,
      action: "byok.key_removed",
      target: project.id,
    });

    return Response.json({ byokEnabled: false });
  } catch (e) {
    if (e instanceof Response) return e;
    return jsonError("Internal server error", 500);
  }
}

export { unwrapCustomerKek };
