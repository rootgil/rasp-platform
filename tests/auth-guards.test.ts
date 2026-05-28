/**
 * Auth guard unit tests - verifies requireSession and requireAdmin
 * throw the correct HTTP Response objects without hitting the DB.
 */
import { describe, it, expect, vi, beforeEach, type Mock } from "vitest";

// Mock lib/auth
vi.mock("@/lib/auth", () => ({
  auth: vi.fn(),
}));

// Mock lib/prisma
vi.mock("@/lib/prisma", () => ({
  prisma: {
    organizationMember: { findFirst: vi.fn() },
    auditLog: { create: vi.fn(), findFirst: vi.fn() },
  },
}));

import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { requireSession, requireAdmin, createAuditLog, getOrgId } from "@/lib/auth-helpers";

const mockedAuth = auth as unknown as Mock;
const mockedFindFirst = (prisma.organizationMember.findFirst) as unknown as Mock;
const mockedAuditCreate = (prisma.auditLog.create) as unknown as Mock;

function makeSession(role: string, id = "user-1") {
  return {
    expires: new Date(Date.now() + 86400000).toISOString(),
    user: { id, email: `${id}@test.com`, role },
  };
}

beforeEach(() => {
  vi.clearAllMocks();
});

// ─── requireSession ───────────────────────────────────────────────────────────

describe("requireSession", () => {
  it("throws a 401 Response when there is no session", async () => {
    mockedAuth.mockResolvedValue(null);
    let caught: unknown;
    try {
      await requireSession();
    } catch (e) {
      caught = e;
    }
    expect(caught).toBeInstanceOf(Response);
    expect((caught as Response).status).toBe(401);
  });

  it("returns the user object when session is valid", async () => {
    mockedAuth.mockResolvedValue(makeSession("user"));
    const user = await requireSession();
    expect(user.id).toBe("user-1");
    expect(user.email).toBe("user-1@test.com");
  });
});

// ─── requireAdmin ─────────────────────────────────────────────────────────────

describe("requireAdmin", () => {
  it("throws 403 when user role is 'user'", async () => {
    mockedAuth.mockResolvedValue(makeSession("user"));
    let caught: unknown;
    try {
      await requireAdmin();
    } catch (e) {
      caught = e;
    }
    expect(caught).toBeInstanceOf(Response);
    expect((caught as Response).status).toBe(403);
  });

  it("returns user when role is 'admin'", async () => {
    mockedAuth.mockResolvedValue(makeSession("admin", "admin-1"));
    const user = await requireAdmin();
    expect(user.id).toBe("admin-1");
    expect(user.role).toBe("admin");
  });
});

// ─── getOrgId ─────────────────────────────────────────────────────────────────

describe("getOrgId", () => {
  it("throws 404 when the user has no organization", async () => {
    mockedFindFirst.mockResolvedValue(null);
    let caught: unknown;
    try {
      await getOrgId("user-1");
    } catch (e) {
      caught = e;
    }
    expect(caught).toBeInstanceOf(Response);
    expect((caught as Response).status).toBe(404);
  });

  it("returns organizationId when membership exists", async () => {
    mockedFindFirst.mockResolvedValue({ organizationId: "org-123", userId: "user-1" });
    const orgId = await getOrgId("user-1");
    expect(orgId).toBe("org-123");
  });
});

// ─── Org scoping (cross-tenant protection) ────────────────────────────────────

describe("org scoping", () => {
  it("different users always get different org IDs", async () => {
    mockedFindFirst
      .mockResolvedValueOnce({ organizationId: "org-A", userId: "user-1" })
      .mockResolvedValueOnce({ organizationId: "org-B", userId: "user-2" });

    const orgA = await getOrgId("user-1");
    const orgB = await getOrgId("user-2");

    expect(orgA).toBe("org-A");
    expect(orgB).toBe("org-B");
    expect(orgA).not.toBe(orgB);
  });

  it("queries DB with userId so scope is always per-user", async () => {
    mockedFindFirst.mockResolvedValue({ organizationId: "org-X", userId: "user-42" });
    await getOrgId("user-42");
    expect(mockedFindFirst).toHaveBeenCalledWith(
      expect.objectContaining({ where: { userId: "user-42" } })
    );
  });
});

// ─── createAuditLog ───────────────────────────────────────────────────────────

describe("createAuditLog", () => {
  it("writes to the DB with the correct fields", async () => {
    mockedAuditCreate.mockResolvedValue({ id: "log-1" });
    await createAuditLog({
      actorId: "user-1",
      organizationId: "org-1",
      action: "project.create",
      target: "proj-1",
      metadata: { name: "billing-api" },
    });
    expect(mockedAuditCreate).toHaveBeenCalledWith({
      data: expect.objectContaining({
        actorId: "user-1",
        organizationId: "org-1",
        action: "project.create",
        target: "proj-1",
      }),
    });
  });

  it("works without optional fields", async () => {
    mockedAuditCreate.mockResolvedValue({ id: "log-2" });
    await createAuditLog({ action: "agent.heartbeat" });
    expect(mockedAuditCreate).toHaveBeenCalledWith({
      data: expect.objectContaining({ action: "agent.heartbeat" }),
    });
  });
});
