/**
 * Auth guard unit tests - verifies requireSession and requireAdmin
 * throw the correct HTTP Response objects without hitting the DB.
 */
import { describe, it, expect, vi, beforeEach, type Mock } from "vitest";

vi.mock("@/lib/auth", () => ({
  auth: vi.fn(),
}));

vi.mock("@/lib/prisma", () => ({
  prisma: {
    organizationMember: { findFirst: vi.fn() },
    auditLog: { create: vi.fn(), findFirst: vi.fn() },
    user: { findUnique: vi.fn() },
    $transaction: vi.fn(async (fn: (tx: unknown) => unknown) => {
      const tx = {
        $executeRaw: vi.fn(),
        auditLog: {
          findFirst: vi.fn().mockResolvedValue(null),
          create: vi.fn().mockResolvedValue({ id: "log-1" }),
        },
      };
      return fn(tx);
    }),
  },
}));

import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { requireSession, requireAdmin, createAuditLog, getOrgId } from "@/lib/auth-helpers";

const mockedAuth = auth as unknown as Mock;
const mockedFindFirst = prisma.organizationMember.findFirst as unknown as Mock;
const mockedUserFindUnique = prisma.user.findUnique as unknown as Mock;
const mockedTransaction = prisma.$transaction as unknown as Mock;

function makeSession(role: string, id = "user-1") {
  return {
    expires: new Date(Date.now() + 86400000).toISOString(),
    user: { id, email: `${id}@test.com`, role },
  };
}

beforeEach(() => {
  vi.clearAllMocks();
  mockedUserFindUnique.mockImplementation(async ({ where }: { where: { id: string } }) => ({
    id: where.id,
    role: where.id.startsWith("admin") ? "admin" : "user",
    mustChangePassword: false,
    passwordChangedAt: null,
  }));
  mockedTransaction.mockImplementation(async (fn: (tx: unknown) => unknown) => {
    const create = vi.fn().mockResolvedValue({ id: "log-1" });
    const tx = {
      $executeRaw: vi.fn(),
      auditLog: {
        findFirst: vi.fn().mockResolvedValue(null),
        create,
      },
    };
    return fn(tx);
  });
});

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
    mockedUserFindUnique.mockResolvedValue({
      role: "user",
      mustChangePassword: false,
      passwordChangedAt: null,
    });
    const user = await requireSession();
    expect(user.id).toBe("user-1");
    expect(user.email).toBe("user-1@test.com");
  });

  it("throws 403 when mustChangePassword is set", async () => {
    mockedAuth.mockResolvedValue({
      ...makeSession("user"),
      user: { ...makeSession("user").user, mustChangePassword: true },
    });
    mockedUserFindUnique.mockResolvedValue({
      role: "user",
      mustChangePassword: true,
      passwordChangedAt: null,
    });
    let caught: unknown;
    try {
      await requireSession();
    } catch (e) {
      caught = e;
    }
    expect(caught).toBeInstanceOf(Response);
    expect((caught as Response).status).toBe(403);
  });
});

describe("requireAdmin", () => {
  it("throws 403 when user role is 'user'", async () => {
    mockedAuth.mockResolvedValue(makeSession("user"));
    mockedUserFindUnique.mockResolvedValue({
      role: "user",
      mustChangePassword: false,
      passwordChangedAt: null,
    });
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
    mockedUserFindUnique.mockResolvedValue({
      role: "admin",
      mustChangePassword: false,
      passwordChangedAt: null,
    });
    const user = await requireAdmin();
    expect(user.id).toBe("admin-1");
    expect(user.role).toBe("admin");
  });
});

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

  it("prefers preferredOrgId when membership matches", async () => {
    mockedFindFirst.mockResolvedValue({ organizationId: "org-pref" });
    const orgId = await getOrgId("user-1", "org-pref");
    expect(orgId).toBe("org-pref");
    expect(mockedFindFirst).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { userId: "user-1", organizationId: "org-pref" },
      })
    );
  });
});

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

describe("createAuditLog", () => {
  it("writes via a locked transaction", async () => {
    await createAuditLog({
      actorId: "user-1",
      organizationId: "org-1",
      action: "project.create",
      target: "proj-1",
      metadata: { name: "billing-api" },
    });
    expect(mockedTransaction).toHaveBeenCalled();
  });

  it("works without optional fields", async () => {
    await createAuditLog({ action: "agent.heartbeat" });
    expect(mockedTransaction).toHaveBeenCalled();
  });
});
