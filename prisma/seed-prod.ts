/**
 * Production seed - safe to run on every deploy.
 * Creates only the platform admin user and the agent version catalog.
 * Uses upsert / findFirst so it is fully idempotent.
 *
 * Required env vars:
 *   SEED_ADMIN_EMAIL    e.g. admin@rasp.io
 *   SEED_ADMIN_PASSWORD strong password - never commit a real value
 */

import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

const AGENT_VERSIONS = [
  { version: "0.2.8", channel: "stable",  status: "published", changelog: "Bug fixes for Express 5 compatibility." },
  { version: "0.3.1", channel: "stable",  status: "published", changelog: "Improved SQLi detection, reduced false positives." },
  { version: "0.3.2", channel: "early",   status: "published", changelog: "Path traversal improvements, Node 22 support." },
  { version: "0.4.0", channel: "edge",    status: "candidate", changelog: "BOLA/IDOR detection alpha, new telemetry format." },
] as const;

async function main() {
  const email    = process.env.SEED_ADMIN_EMAIL;
  const password = process.env.SEED_ADMIN_PASSWORD;

  if (!email || !password) {
    console.error("❌  SEED_ADMIN_EMAIL and SEED_ADMIN_PASSWORD must be set.");
    process.exit(1);
  }

  console.log("🌱  Running production seed…");

  // ── Platform admin ────────────────────────────────────────────────────────
  const passwordHash = await bcrypt.hash(password, 12);

  const admin = await prisma.user.upsert({
    where:  { email },
    update: { name: "Platform Admin", passwordHash, role: "admin" },
    create: { email, name: "Platform Admin", passwordHash, role: "admin" },
  });

  console.log(`   ✓ admin user: ${admin.email}`);

  // ── Agent version catalog ─────────────────────────────────────────────────
  for (const v of AGENT_VERSIONS) {
    const existing = await prisma.agentVersion.findFirst({
      where: { version: v.version, channel: v.channel },
    });

    if (!existing) {
      await prisma.agentVersion.create({
        data: {
          version:    v.version,
          channel:    v.channel,
          status:     v.status,
          changelog:  v.changelog,
          releasedAt: new Date(),
        },
      });
      console.log(`   ✓ agent version: ${v.version} (${v.channel})`);
    } else {
      console.log(`   · agent version: ${v.version} (${v.channel}) - already exists, skipped`);
    }
  }

  console.log("✅  Production seed complete.");
}

main()
  .catch((err) => { console.error(err); process.exit(1); })
  .finally(() => prisma.$disconnect());
