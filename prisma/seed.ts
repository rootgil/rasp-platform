import "dotenv/config";
import { createCipheriv, randomBytes } from "node:crypto";
import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import pg from "pg";
import bcrypt from "bcryptjs";
import { getSigningKeyId, signPolicy, type SignablePolicy } from "../lib/policy-signing";

const pool = new pg.Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.DATABASE_URL?.includes("neon.tech")
    ? { rejectUnauthorized: false }
    : undefined,
  connectionTimeoutMillis: 30_000,
});
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

const EVENT_TYPES = [
  "sql_injection",
  "nosql_injection",
  "path_traversal",
  "command_injection",
  "xss",
  "xxe",
  "ssrf",
  "template_injection",
  "bola_idor",
  "brute_force",
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

function wrapDek(dek: Buffer, kek: Buffer): string {
  const iv = randomBytes(12);
  const cipher = createCipheriv("aes-256-gcm", kek, iv);
  const ct = Buffer.concat([cipher.update(dek), cipher.final()]);
  return [iv.toString("base64"), cipher.getAuthTag().toString("base64"), ct.toString("base64")].join(".");
}

async function seedTenantKey(projectId: string) {
  const b64 = process.env.KEK_MASTER_KEY;
  if (!b64) return;
  try {
    const kek = Buffer.from(b64, "base64");
    if (kek.length !== 32) return;
    const dek = randomBytes(32);
    await prisma.tenantKey.create({
      data: { projectId, version: 1, wrappedDek: wrapDek(dek, kek), active: true },
    });
  } catch {
    // Encryption disabled or invalid KEK - skip silently in dev seed.
  }
}

async function createSignedPolicy(
  projectId: string,
  version: number,
  input: Omit<SignablePolicy, "projectId" | "version">
) {
  const signable: SignablePolicy = { projectId, version, ...input };
  return prisma.policy.create({
    data: {
      projectId,
      version,
      channel: input.channel,
      mode: input.mode,
      detectionRules: input.detectionRules ?? undefined,
      redactionConfig: input.redactionConfig ?? undefined,
      dataResidency: input.dataResidency ?? undefined,
      targetAgentVersion: input.targetAgentVersion,
      signature: signPolicy(signable),
      signingKeyId: getSigningKeyId(),
    },
  });
}

async function main() {
  console.log("Seeding database...");

  // Clean up (order respects FK constraints)
  await prisma.auditLog.deleteMany();
  await prisma.approvalRequest.deleteMany();
  await prisma.alert.deleteMany();
  await prisma.securityEvent.deleteMany();
  await prisma.discoveredEndpoint.deleteMany();
  await prisma.redactionPolicy.deleteMany();
  await prisma.policy.deleteMany();
  await prisma.tenantKey.deleteMany();
  await prisma.catalogueRuleNotification.deleteMany();
  await prisma.projectRule.deleteMany();
  await prisma.rule.deleteMany();
  await prisma.agent.deleteMany();
  await prisma.apiKey.deleteMany();
  await prisma.project.deleteMany();
  await prisma.organizationMember.deleteMany();
  await prisma.organization.deleteMany();
  await prisma.rolloutMetric.deleteMany();
  await prisma.agentVersion.deleteMany();
  await prisma.platformSetting.deleteMany();
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
      name: "Demo User",
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

  await seedTenantKey(projectNode.id);

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
      hmacSecret: randomBytes(32).toString("base64"),
      targetVersion: "0.3.1",
      upgradeStatus: "succeeded",
      lastUpgradeAt: daysAgo(7),
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
      hmacSecret: randomBytes(32).toString("base64"),
      targetVersion: "0.3.1",
      previousVersion: "0.2.8",
      upgradeStatus: "upgrading",
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
      killSwitch: true,
      hmacSecret: randomBytes(32).toString("base64"),
      targetVersion: "0.3.2",
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
    { method: "GET",    path: "/api/users/:id",             authStatus: "jwt",     authorization: "owner",   hasSensitiveData: true,  riskScore: 45 },
    { method: "POST",   path: "/api/auth/login",            authStatus: "none",    authorization: "public",  hasSensitiveData: true,  riskScore: 80 },
    { method: "GET",    path: "/api/accounts/:id/balance",  authStatus: "jwt",     authorization: "owner",   hasSensitiveData: true,  riskScore: 60 },
    { method: "GET",    path: "/api/transactions",          authStatus: "jwt",     authorization: "member",  hasSensitiveData: true,  riskScore: 55 },
    { method: "DELETE", path: "/api/admin/users/:id",       authStatus: "jwt",     authorization: "admin",   hasSensitiveData: false, riskScore: 70 },
    { method: "GET",    path: "/api/documents/:filename",   authStatus: "jwt",     authorization: "member",  hasSensitiveData: true,  riskScore: 50 },
    { method: "GET",    path: "/api/internal/metrics",      authStatus: "none",    authorization: "unknown", hasSensitiveData: false, riskScore: 90, isShadowApi: true },
    { method: "POST",   path: "/api/v1/legacy/transfer",    authStatus: "unknown", authorization: "unknown", hasSensitiveData: true,  riskScore: 75, isShadowApi: true },
    { method: "GET",    path: "/api/v1/reports/export",     authStatus: "jwt",     authorization: "admin",   hasSensitiveData: false, riskScore: 20, isZombieApi: true },
    { method: "GET",    path: "/health",                    authStatus: "none",    authorization: "public",  hasSensitiveData: false, riskScore: 5 },
  ];

  for (const ep of endpointDefs) {
    await prisma.discoveredEndpoint.create({
      data: {
        projectId: projectNode.id,
        method: ep.method,
        pathPattern: ep.path,
        authStatus: ep.authStatus,
        authorization: ep.authorization,
        hasSensitiveData: ep.hasSensitiveData,
        riskScore: ep.riskScore,
        errorCount: Math.floor(Math.random() * 20),
        avgResponseMs: Math.floor(Math.random() * 200) + 20,
        trafficCount: Math.floor(Math.random() * 500) + 10,
        isShadowApi: (ep as { isShadowApi?: boolean }).isShadowApi ?? false,
        isZombieApi: (ep as { isZombieApi?: boolean }).isZombieApi ?? false,
        firstSeenAt: daysAgo(30),
        lastSeenAt: (ep as { isZombieApi?: boolean }).isZombieApi ? daysAgo(35) : daysAgo(Math.random() < 0.5 ? 0 : 1),
      },
    });
  }

  const redactionRules = {
    patterns: ["email", "credit_card", "sin", "password", "api_key", "authorization"],
    ipHandling: "mask_last_octet",
  };

  // Global Rule Catalogue - YAML-driven, patterns compiled to CustomRuleSpec for agent delivery
  const catalogueRules = [
    {
      name: "SQLI_BASIC_001",
      type: "sql_injection",
      severity: "high",
      description: "Detects common SQL injection patterns in request parameters.",
      enabled: true,
      pattern: "(union[\\s]+select|drop[\\s]+table|'\\s*or\\s*'1'\\s*='\\s*1|--\\s*$|\\/\\*.*?\\*\\/|sleep\\s*\\(|benchmark\\s*\\(|xp_cmdshell)",
      target: "any",
      config: { patterns: ["OR 1=1", "' OR '", "UNION SELECT", "DROP TABLE", "SLEEP(", "benchmark(", "--", "/*"] },
    },
    {
      name: "PATH_TRAVERSAL_001",
      type: "path_traversal",
      severity: "high",
      description: "Detects directory traversal attempts.",
      enabled: true,
      pattern: "(\\.\\.\\/|\\.\\.\\\\ |%2e%2e%2f|%252e%252e%252f|\\/etc\\/passwd|windows\\/win\\.ini|%c0%af|%c1%9c)",
      target: "path",
      config: { patterns: ["../", "..\\", "/etc/passwd", "windows/win.ini", "%2e%2e%2f", "%252e%252e%252f"] },
    },
    {
      name: "CMD_INJECTION_001",
      type: "command_injection",
      severity: "critical",
      description: "Detects OS command injection patterns.",
      enabled: true,
      pattern: "(;\\s*(cat|ls|id|whoami|curl|wget|bash|sh|python|perl|ruby|nc)\\s|&&|\\|\\|[^|]|`[^`]+`|\\$\\([^)]+\\)|nc\\s+-[el]|bash\\s+-i|\\beval\\s*\\()",
      target: "any",
      config: { patterns: [";", "&&", "||", "`", "$(", "cat /etc/passwd", "curl http", "wget http", "nc -e", "bash -i"] },
    },
    {
      name: "XSS_BASIC_001",
      type: "xss",
      severity: "medium",
      description: "Detects reflected and stored XSS patterns.",
      enabled: true,
      pattern: "(<script[\\s>]|javascript:\\s*|on(error|load|click|mouseover|focus)\\s*=|eval\\s*\\(|document\\.cookie|<iframe[\\s>]|<object[\\s>]|vbscript:)",
      target: "any",
      config: { patterns: ["<script>", "javascript:", "onerror=", "onload=", "eval(", "document.cookie"] },
    },
    {
      name: "XXE_001",
      type: "xxe",
      severity: "high",
      description: "Detects XML External Entity injection attempts.",
      enabled: true,
      pattern: "(<!ENTITY|SYSTEM\\s+[\"']file:\\/\\/|PUBLIC\\s+[\"'][^\"']*[\"']\\s+[\"']|%xxe;|<!\\[CDATA\\[)",
      target: "body",
      config: { patterns: ["<!ENTITY", "SYSTEM \"file://", "SYSTEM 'file://", "%xxe;"] },
    },
    {
      name: "SSRF_001",
      type: "ssrf",
      severity: "high",
      description: "Detects Server-Side Request Forgery patterns targeting internal services.",
      enabled: true,
      pattern: "(169\\.254\\.169\\.254|metadata\\.google\\.internal|metadata\\.internal|169\\.254\\.170\\.2|localhost|127\\.0\\.0\\.1|0\\.0\\.0\\.0|::1|\\bfile:\\/\\/|\\/proc\\/self)",
      target: "any",
      config: { patterns: ["169.254.169.254", "localhost", "127.0.0.1", "0.0.0.0", "::1", "metadata.google.internal"] },
    },
    {
      name: "TEMPLATE_INJECTION_001",
      type: "template_injection",
      severity: "critical",
      description: "Detects Server-Side Template Injection (SSTI) patterns.",
      enabled: true,
      pattern: "(\\{\\{\\s*[0-9*+\\-/]|\\$\\{\\s*[0-9*+\\-/]|#\\{\\s*[0-9*+\\-/]|<%=\\s*[0-9]|\\{\\{\\s*config\\s*\\}\\}|\\{\\{\\s*self\\.__dict__|\\{\\{\\s*request\\.|@\\{\\s*[0-9])",
      target: "any",
      config: { patterns: ["{{7*7}}", "${7*7}", "#{7*7}", "<%= 7*7 %>", "{{config}}", "{{self.__dict__}}"] },
    },
    {
      name: "BOLA_IDOR_001",
      type: "bola_idor",
      severity: "high",
      description: "Detects Broken Object Level Authorization and IDOR patterns via numeric resource ID access.",
      enabled: true,
      pattern: "\\/(?:users|accounts|orders|documents|records|profiles|invoices|customers)\\/[0-9]+(?:\\/|$)",
      target: "path",
      config: { detectHorizontalEscalation: true, detectVerticalEscalation: true },
    },
    {
      name: "BRUTE_FORCE_001",
      type: "brute_force",
      severity: "medium",
      description: "Detects credential brute force and stuffing attempts via common auth endpoint patterns.",
      enabled: true,
      pattern: "\\/(?:auth|login|signin|token|oauth|password|credential)(?:\\/|$)",
      target: "path",
      config: { maxAttemptsPerMinute: 10, trackByIp: true, trackByUser: true },
    },
    {
      name: "NOSQL_INJECTION_001",
      type: "nosql_injection",
      severity: "high",
      description: "Detects NoSQL injection patterns targeting MongoDB and similar databases.",
      enabled: true,
      pattern: "(\\$where|\\$gt|\\$ne|\\$or|\\$regex|\\$exists|\\$expr|\\$function|\\{\\s*\"\\$|;\\s*db\\.|mapReduce\\s*\\()",
      target: "any",
      config: { patterns: ["$where", "$gt", "$ne", "$or", "$regex", "$exists", "{\"$"] },
    },
    {
      name: "DESERIALIZATION_001",
      type: "deserialization",
      severity: "critical",
      description: "Detects unsafe deserialization patterns.",
      enabled: true,
      pattern: "(rO0AB|aced0005|__reduce__|__reduce_ex__|pickle\\.loads|java\\.io\\.ObjectInputStream|readObject\\s*\\(|yaml\\.load\\s*\\([^)]*Loader)",
      target: "body",
      config: { patterns: ["rO0AB", "aced0005", "__reduce__", "pickle.loads", "java.io.ObjectInputStream"] },
    },
    {
      name: "SUSPICIOUS_PAYLOAD_001",
      type: "suspicious_payload",
      severity: "low",
      description: "Catch-all rule for anomalous payloads containing binary content or oversized field values.",
      enabled: true,
      pattern: "(?:[\\x00-\\x08\\x0b\\x0c\\x0e-\\x1f\\x7f-\\x9f]|\\\\u00[0-9a-f]{2}){3,}",
      target: "body",
      config: { maxFieldLength: 8192, detectBinaryContent: true },
    },
  ] as const;

  // Build yamlDefinition for each catalogue rule
  function buildYaml(r: {
    name: string; type: string; severity: string; description: string;
    pattern: string; target: string; enabled: boolean;
  }): string {
    return [
      `id: ${r.name}`,
      `name: ${r.name.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase())}`,
      `type: ${r.type}`,
      `severity: ${r.severity}`,
      `target: ${r.target}`,
      `pattern: "${r.pattern.replace(/"/g, '\\"')}"`,
      `description: ${r.description}`,
      `enabled: ${r.enabled}`,
    ].join("\n");
  }

  const createdRules = await Promise.all(
    catalogueRules.map((r) =>
      prisma.rule.create({
        data: {
          ...r,
          config: r.config as object,
          yamlDefinition: buildYaml({ ...r, enabled: r.enabled }),
        },
      })
    )
  );

  // ProjectRules for the demo project (banking-api) - all catalogue rules enabled
  const demoProjectRules = await Promise.all(
    createdRules.map((rule) =>
      prisma.projectRule.create({
        data: {
          projectId: projectNode.id,
          catalogueRuleId: rule.id,
          source: "catalogue",
          name: rule.name,
          type: rule.type,
          severity: rule.severity,
          description: rule.description,
          enabled: true,
          pattern: rule.pattern,
          target: rule.target,
          yamlDefinition: rule.yamlDefinition!,
        },
      })
    )
  );

  // Compile demo ProjectRules to CustomRuleSpec[] for the initial policy
  const demoDetectionRules = demoProjectRules.map((pr) => ({
    id: pr.name,
    name: pr.name,
    eventType: pr.type,
    severity: pr.severity as "critical" | "high" | "medium" | "low",
    target: pr.target as "any" | "path" | "query" | "body" | "headers",
    pattern: pr.pattern!,
    description: pr.description ?? undefined,
    enabled: true,
  }));

  // Redaction Policy
  await prisma.redactionPolicy.create({
    data: {
      projectId: projectNode.id,
      mode: "denylist",
      rules: redactionRules,
    },
  });

  // Signed policy v1 with real detection rules
  try {
    await createSignedPolicy(projectNode.id, 1, {
      channel: "stable",
      mode: "monitor",
      detectionRules: demoDetectionRules,
      redactionConfig: { mode: "denylist", ...redactionRules },
      dataResidency: null,
      targetAgentVersion: "0.3.1",
    });
  } catch (err) {
    console.warn("  ⚠ Skipped signed policy (POLICY_SIGNING_PRIVATE_KEY not set?)");
    console.warn(`    ${err instanceof Error ? err.message : err}`);
  }

  // Agent Versions (with rollout/canary demo state)
  const version031 = await prisma.agentVersion.create({
    data: {
      version: "0.3.1",
      channel: "stable",
      status: "published",
      releasedAt: daysAgo(7),
      changelog: "Improved SQLi detection, reduced false positives.",
      impact: "Low - detection-only changes, no breaking API surface.",
      rolloutStage: 4,
      rolloutPercent: 100,
      rolloutStartedAt: daysAgo(14),
    },
  });

  const version032 = await prisma.agentVersion.create({
    data: {
      version: "0.3.2",
      channel: "early",
      status: "published",
      releasedAt: daysAgo(3),
      changelog: "Path traversal improvements, Node 22 support.",
      impact: "Medium - requires Node 18+; monitor error rate during rollout.",
      rolloutStage: 2,
      rolloutPercent: 10,
      rolloutStartedAt: daysAgo(2),
    },
  });

  await prisma.agentVersion.createMany({
    data: [
      {
        version: "0.4.0",
        channel: "edge",
        status: "candidate",
        releasedAt: null,
        changelog: "BOLA/IDOR detection alpha, new telemetry format.",
        impact: "High - alpha feature set; not recommended for production.",
      },
      {
        version: "0.2.8",
        channel: "stable",
        status: "published",
        releasedAt: daysAgo(30),
        changelog: "Bug fixes for Express 5 compatibility.",
      },
    ],
  });

  // Rollout metrics for the in-progress canary (0.3.2)
  await prisma.rolloutMetric.createMany({
    data: [
      {
        versionId: version032.id,
        stage: 1,
        agentsTargeted: 3,
        agentsSucceeded: 3,
        agentsFailed: 0,
        errorEvents: 0,
      },
      {
        versionId: version032.id,
        stage: 2,
        agentsTargeted: 12,
        agentsSucceeded: 11,
        agentsFailed: 1,
        errorEvents: 2,
      },
      {
        versionId: version031.id,
        stage: 4,
        agentsTargeted: 48,
        agentsSucceeded: 47,
        agentsFailed: 1,
        errorEvents: 0,
        rolledBackAt: null,
      },
    ],
  });

  // Platform-wide incident controls
  await prisma.platformSetting.create({
    data: { id: "global", killSwitch: false },
  });

  // Dual-authorization demo: kill-switch enable awaiting second admin
  await prisma.approvalRequest.create({
    data: {
      action: "platform.kill_switch.enable",
      target: "global",
      payload: { reason: "Scheduled incident-response drill" },
      status: "pending",
      requestedById: adminUser.id,
    },
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
  console.log("  Demo:   demo@acme.io   / demo1234");
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
