import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

const EVENT_TYPES = [
  "sql_injection",
  "path_traversal",
  "command_injection",
  "xss",
  "ssrf",
  "deserialization",
  "suspicious_payload",
];

const SEVERITIES = ["critical", "high", "medium", "low"];
const ACTIONS = ["monitor", "block"];

function randomFrom<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

function daysAgo(days: number) {
  return new Date(Date.now() - days * 24 * 60 * 60 * 1000);
}

async function main() {
  console.log("Seeding database...");

  // Clean up
  await prisma.auditLog.deleteMany();
  await prisma.alert.deleteMany();
  await prisma.securityEvent.deleteMany();
  await prisma.discoveredEndpoint.deleteMany();
  await prisma.redactionPolicy.deleteMany();
  await prisma.rule.deleteMany();
  await prisma.agent.deleteMany();
  await prisma.apiKey.deleteMany();
  await prisma.project.deleteMany();
  await prisma.organizationMember.deleteMany();
  await prisma.organization.deleteMany();
  await prisma.agentVersion.deleteMany();
  await prisma.contactLead.deleteMany();
  await prisma.user.deleteMany();

  // Users
  const adminUser = await prisma.user.create({
    data: {
      email: "admin@rasp.io",
      name: "Platform Admin",
      passwordHash: await bcrypt.hash("admin1234", 10),
      role: "admin",
    },
  });

  const clientUser = await prisma.user.create({
    data: {
      email: "demo@acme.io",
      name: "Alex Chen",
      passwordHash: await bcrypt.hash("demo1234", 10),
      role: "user",
    },
  });

  // Organization
  const org = await prisma.organization.create({
    data: { name: "Acme Financial Corp.", plan: "pro" },
  });

  await prisma.organizationMember.createMany({
    data: [
      { organizationId: org.id, userId: clientUser.id, role: "owner" },
      { organizationId: org.id, userId: adminUser.id, role: "admin" },
    ],
  });

  // Projects
  const projectNode = await prisma.project.create({
    data: {
      organizationId: org.id,
      name: "banking-api",
      language: "node",
      framework: "express",
      environment: "production",
    },
  });

  const projectPython = await prisma.project.create({
    data: {
      organizationId: org.id,
      name: "auth-service",
      language: "python",
      framework: "fastapi",
      environment: "production",
    },
  });

  // API Keys
  const apiKeyHash = await bcrypt.hash("rasp_demo_key_abc123", 10);
  await prisma.apiKey.create({
    data: {
      projectId: projectNode.id,
      keyHash: apiKeyHash,
      prefix: "rasp_demo",
      name: "Production key",
    },
  });

  // Agents
  const agent1 = await prisma.agent.create({
    data: {
      projectId: projectNode.id,
      language: "node",
      framework: "express",
      version: "0.3.1",
      status: "online",
      channel: "stable",
      mode: "monitor",
      lastHeartbeatAt: new Date(Date.now() - 45 * 1000),
    },
  });

  const agent2 = await prisma.agent.create({
    data: {
      projectId: projectNode.id,
      language: "node",
      framework: "express",
      version: "0.2.8",
      status: "outdated",
      channel: "stable",
      mode: "monitor",
      lastHeartbeatAt: daysAgo(1),
    },
  });

  const agent3 = await prisma.agent.create({
    data: {
      projectId: projectPython.id,
      language: "python",
      framework: "fastapi",
      version: "0.3.1",
      status: "offline",
      channel: "early",
      mode: "block",
      lastHeartbeatAt: daysAgo(2),
    },
  });

  // Security Events
  const paths = [
    "/api/users/:id",
    "/api/accounts/:id/balance",
    "/api/auth/login",
    "/api/transactions",
    "/api/documents/:filename",
    "/api/admin/users",
  ];

  const events = [];
  for (let i = 0; i < 24; i++) {
    const severity = randomFrom(SEVERITIES);
    const type = randomFrom(EVENT_TYPES);
    const action = severity === "critical" || severity === "high" ? randomFrom(ACTIONS) : "monitor";
    const agentId = randomFrom([agent1.id, agent2.id, agent3.id]);
    const projectId = [agent1, agent2].map((a) => a.id).includes(agentId)
      ? projectNode.id
      : projectPython.id;

    const event = await prisma.securityEvent.create({
      data: {
        projectId,
        agentId,
        type,
        severity,
        method: randomFrom(["GET", "POST", "PUT", "DELETE"]),
        path: randomFrom(paths),
        sourceIp: `hash_${Math.floor(Math.random() * 256)}`,
        redacted: true,
        action,
        payload: {
          redacted: true,
          matchedRule: `${type.toUpperCase()}_001`,
          auditLoggedLocally: true,
        },
        createdAt: daysAgo(Math.floor(Math.random() * 7)),
      },
    });
    events.push(event);
  }

  // Create alerts for high/critical events
  const highEvents = events.filter(
    (e) => e.severity === "critical" || e.severity === "high"
  );
  for (const event of highEvents) {
    await prisma.alert.create({
      data: {
        projectId: event.projectId,
        securityEventId: event.id,
        severity: event.severity,
        status: randomFrom(["open", "open", "investigating", "resolved"]),
      },
    });
  }

  // Discovered Endpoints
  const endpointDefs = [
    { method: "GET",    path: "/api/users/:id",             authStatus: "jwt",     hasSensitiveData: true,  riskScore: 45 },
    { method: "POST",   path: "/api/auth/login",            authStatus: "none",    hasSensitiveData: true,  riskScore: 80 },
    { method: "GET",    path: "/api/accounts/:id/balance",  authStatus: "jwt",     hasSensitiveData: true,  riskScore: 60 },
    { method: "GET",    path: "/api/transactions",          authStatus: "jwt",     hasSensitiveData: true,  riskScore: 55 },
    { method: "DELETE", path: "/api/admin/users/:id",       authStatus: "jwt",     hasSensitiveData: false, riskScore: 70 },
    { method: "GET",    path: "/api/documents/:filename",   authStatus: "jwt",     hasSensitiveData: true,  riskScore: 50 },
    { method: "GET",    path: "/api/internal/metrics",      authStatus: "none",    hasSensitiveData: false, riskScore: 90, isShadowApi: true },
    { method: "POST",   path: "/api/v1/legacy/transfer",    authStatus: "unknown", hasSensitiveData: true,  riskScore: 75, isShadowApi: true },
    { method: "GET",    path: "/api/v1/reports/export",     authStatus: "jwt",     hasSensitiveData: false, riskScore: 20, isZombieApi: true },
    { method: "GET",    path: "/health",                    authStatus: "none",    hasSensitiveData: false, riskScore: 5 },
  ];

  for (const ep of endpointDefs) {
    await prisma.discoveredEndpoint.create({
      data: {
        projectId: projectNode.id,
        method: ep.method,
        pathPattern: ep.path,
        authStatus: ep.authStatus,
        hasSensitiveData: ep.hasSensitiveData,
        riskScore: ep.riskScore,
        trafficCount: Math.floor(Math.random() * 500) + 10,
        isShadowApi: (ep as { isShadowApi?: boolean }).isShadowApi ?? false,
        isZombieApi: (ep as { isZombieApi?: boolean }).isZombieApi ?? false,
        firstSeenAt: daysAgo(30),
        lastSeenAt: (ep as { isZombieApi?: boolean }).isZombieApi ? daysAgo(35) : daysAgo(Math.random() < 0.5 ? 0 : 1),
      },
    });
  }

  // Redaction Policy
  await prisma.redactionPolicy.create({
    data: {
      projectId: projectNode.id,
      mode: "denylist",
      rules: {
        patterns: ["email", "credit_card", "sin", "password", "api_key", "authorization"],
        ipHandling: "mask_last_octet",
      },
    },
  });

  // Agent Versions
  await prisma.agentVersion.createMany({
    data: [
      { version: "0.3.1", channel: "stable",  status: "published", releasedAt: daysAgo(7),  changelog: "Improved SQLi detection, reduced false positives." },
      { version: "0.3.2", channel: "early",   status: "published", releasedAt: daysAgo(3),  changelog: "Path traversal improvements, Node 22 support." },
      { version: "0.4.0", channel: "edge",    status: "candidate", releasedAt: null,         changelog: "BOLA/IDOR detection alpha, new telemetry format." },
      { version: "0.2.8", channel: "stable",  status: "published", releasedAt: daysAgo(30), changelog: "Bug fixes for Express 5 compatibility." },
    ],
  });

  // Audit Logs
  await prisma.auditLog.createMany({
    data: [
      { actorId: clientUser.id, organizationId: org.id, action: "project.create",    target: projectNode.id,   metadata: { name: "banking-api" },        createdAt: daysAgo(10) },
      { actorId: clientUser.id, organizationId: org.id, action: "api_key.create",    target: "api_key_1",      metadata: { prefix: "rasp_demo" },         createdAt: daysAgo(9) },
      { actorId: clientUser.id, organizationId: org.id, action: "alert.update",      target: "alert_1",        metadata: { status: "investigating" },      createdAt: daysAgo(2) },
      { actorId: clientUser.id, organizationId: org.id, action: "agent.kill_switch.enable", target: agent3.id, metadata: {},                              createdAt: daysAgo(1) },
      { actorId: adminUser.id,  organizationId: org.id, action: "agent_version.promote", target: "v0.3.1",     metadata: { channel: "stable" },           createdAt: daysAgo(7) },
      { actorId: clientUser.id, organizationId: org.id, action: "project.create",    target: projectPython.id, metadata: { name: "auth-service" },         createdAt: daysAgo(8) },
      { actorId: clientUser.id, organizationId: org.id, action: "alert.update",      target: "alert_2",        metadata: { status: "resolved" },           createdAt: daysAgo(3) },
    ],
  });

  console.log("✅ Seed complete");
  console.log("  Admin:  admin@rasp.io  / admin1234");
  console.log("  Client: demo@acme.io   / demo1234");
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
