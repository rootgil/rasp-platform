import { prisma } from "@/lib/prisma";
import type { Prisma } from "@prisma/client";

/**
 * Dual-authorization workflow (Addendum E.4.3). Sensitive actions are raised as
 * an ApprovalRequest by one admin and must be approved by a *different* admin
 * before they are considered executable.
 */

export type SensitiveAction =
  | "agent_version.rollback"
  | "agent_version.quarantine"
  | "platform.kill_switch"
  | "tenant.crypto_shred";

export async function raiseApproval(params: {
  action: SensitiveAction;
  target?: string;
  payload?: Record<string, unknown>;
  requestedById: string;
  reason?: string;
}) {
  return prisma.approvalRequest.create({
    data: {
      action: params.action,
      target: params.target,
      payload: params.payload as Prisma.InputJsonValue | undefined,
      requestedById: params.requestedById,
      reason: params.reason,
      status: "pending",
    },
  });
}

export async function listApprovals(status?: string) {
  return prisma.approvalRequest.findMany({
    where: status ? { status } : undefined,
    orderBy: { createdAt: "desc" },
    include: {
      requestedBy: { select: { id: true, email: true } },
      approvedBy: { select: { id: true, email: true } },
    },
  });
}

/**
 * Approve a pending request. Enforces separation of duties: the approver must
 * differ from the requester. Returns the updated request, or throws on policy
 * violation.
 */
export async function approveRequest(id: string, approverId: string) {
  const req = await prisma.approvalRequest.findUnique({ where: { id } });
  if (!req) throw new Error("Approval request not found");
  if (req.status !== "pending") throw new Error(`Request is already ${req.status}`);
  if (req.requestedById === approverId) {
    throw new Error("Approver must differ from requester (separation of duties)");
  }
  return prisma.approvalRequest.update({
    where: { id },
    data: { status: "approved", approvedById: approverId, resolvedAt: new Date() },
  });
}

export async function rejectRequest(id: string, approverId: string, reason?: string) {
  const req = await prisma.approvalRequest.findUnique({ where: { id } });
  if (!req) throw new Error("Approval request not found");
  if (req.status !== "pending") throw new Error(`Request is already ${req.status}`);
  return prisma.approvalRequest.update({
    where: { id },
    data: {
      status: "rejected",
      approvedById: approverId,
      resolvedAt: new Date(),
      reason: reason ?? req.reason,
    },
  });
}

/** Mark an approved request as executed (after the action ran). */
export async function markExecuted(id: string) {
  return prisma.approvalRequest.update({
    where: { id },
    data: { status: "executed" },
  });
}

/**
 * Ensure an approved (and not-yet-executed) approval exists for a given action
 * + target, raised by someone other than the executor. Throws otherwise.
 * Use this to gate the actual execution of a sensitive action.
 */
export async function requireApproval(params: {
  action: SensitiveAction;
  target?: string;
  executorId: string;
}) {
  const approved = await prisma.approvalRequest.findFirst({
    where: {
      action: params.action,
      target: params.target ?? null,
      status: "approved",
      // Separation of duties: executor must not be the requester.
      NOT: { requestedById: params.executorId },
    },
    orderBy: { resolvedAt: "desc" },
  });
  if (!approved) {
    throw new Error(`No approved authorization for ${params.action}`);
  }

  // Atomically consume approval (approved → executed) to prevent double-exec.
  const claimed = await prisma.approvalRequest.updateMany({
    where: { id: approved.id, status: "approved" },
    data: { status: "executed" },
  });
  if (claimed.count !== 1) {
    throw new Error(`No approved authorization for ${params.action}`);
  }

  return approved;
}
