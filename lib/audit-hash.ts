import { createHash } from "node:crypto";

/** Payload fields that participate in the tamper-evident audit hash chain. */
export type AuditHashInput = {
  prevHash: string | null;
  actorId: string | null;
  organizationId: string | null;
  action: string;
  target: string | null;
  metadata: unknown;
  createdAt: Date;
};

/**
 * SHA-256 over the canonical JSON payload for one audit row.
 * Must stay in sync between createAuditLog and verifyAuditChain.
 */
export function computeAuditHash(input: AuditHashInput): string {
  return createHash("sha256")
    .update(
      JSON.stringify({
        prevHash: input.prevHash,
        actorId: input.actorId,
        organizationId: input.organizationId,
        action: input.action,
        target: input.target,
        metadata: input.metadata ?? null,
        createdAt: input.createdAt.toISOString(),
      })
    )
    .digest("hex");
}
