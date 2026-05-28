/**
 * Envelope encryption for per-tenant payload-at-rest protection (Addendum E.6).
 *
 * Control-plane counterpart of the collector's `src/lib/envelope.ts`. The
 * collector encrypts payloads on write; the platform decrypts them on read and
 * owns key lifecycle operations (rotation, tenant deletion).
 *
 * Key hierarchy:
 *  - KEK (master) from `KEK_MASTER_KEY` (base64, 32 bytes) wraps DEKs.
 *  - DEK per project encrypts payloads (AES-256-GCM).
 *
 * Tenant deletion = crypto-shredding via {@link destroyProjectKeys}.
 */
import { createCipheriv, createDecipheriv, randomBytes } from "node:crypto";
import { prisma } from "@/lib/prisma";

const ALGO = "aes-256-gcm";

export interface Envelope {
  _enc: true;
  v: number;
  iv: string;
  tag: string;
  ct: string;
}

function masterKey(): Buffer | null {
  const b64 = process.env.KEK_MASTER_KEY;
  if (!b64) return null;
  try {
    const key = Buffer.from(b64, "base64");
    return key.length === 32 ? key : null;
  } catch {
    return null;
  }
}

function aesEncrypt(key: Buffer, plaintext: Buffer) {
  const iv = randomBytes(12);
  const cipher = createCipheriv(ALGO, key, iv);
  const ct = Buffer.concat([cipher.update(plaintext), cipher.final()]);
  return { iv: iv.toString("base64"), tag: cipher.getAuthTag().toString("base64"), ct: ct.toString("base64") };
}

function aesDecrypt(key: Buffer, iv: string, tag: string, ct: string): Buffer {
  const decipher = createDecipheriv(ALGO, key, Buffer.from(iv, "base64"));
  decipher.setAuthTag(Buffer.from(tag, "base64"));
  return Buffer.concat([decipher.update(Buffer.from(ct, "base64")), decipher.final()]);
}

function wrapDek(dek: Buffer, kek: Buffer): string {
  const { iv, tag, ct } = aesEncrypt(kek, dek);
  return [iv, tag, ct].join(".");
}
function unwrapDek(wrapped: string, kek: Buffer): Buffer {
  const [iv, tag, ct] = wrapped.split(".");
  return aesDecrypt(kek, iv!, tag!, ct!);
}

const dekCache = new Map<string, Buffer>();

async function getDekByVersion(projectId: string, version: number): Promise<Buffer | null> {
  const kek = masterKey();
  if (!kek) return null;
  const cacheKey = `${projectId}:${version}`;
  const cached = dekCache.get(cacheKey);
  if (cached) return cached;
  const key = await prisma.tenantKey.findUnique({
    where: { projectId_version: { projectId, version } },
  });
  if (!key || !key.wrappedDek) return null;
  const dek = unwrapDek(key.wrappedDek, kek);
  dekCache.set(cacheKey, dek);
  return dek;
}

export function isEnvelope(value: unknown): value is Envelope {
  return (
    typeof value === "object" &&
    value !== null &&
    (value as Record<string, unknown>)._enc === true
  );
}

/** Decrypt a payload that may be an {@link Envelope}; null if key destroyed. */
export async function decryptForProject(projectId: string, value: unknown): Promise<unknown> {
  if (!isEnvelope(value)) return value;
  const dek = await getDekByVersion(projectId, value.v);
  if (!dek) return null;
  try {
    return JSON.parse(aesDecrypt(dek, value.iv, value.tag, value.ct).toString("utf8"));
  } catch {
    return null;
  }
}

/**
 * Rotate a project's DEK: deactivate the current version and create a new
 * active one. Existing ciphertext stays decryptable under its old version.
 */
export async function rotateProjectKey(projectId: string): Promise<number | null> {
  const kek = masterKey();
  if (!kek) return null;
  const current = await prisma.tenantKey.findFirst({
    where: { projectId, active: true, destroyed: false },
    orderBy: { version: "desc" },
  });
  const nextVersion = (current?.version ?? 0) + 1;
  if (current) {
    await prisma.tenantKey.update({
      where: { id: current.id },
      data: { active: false, rotatedAt: new Date() },
    });
  }
  const dek = randomBytes(32);
  await prisma.tenantKey.create({
    data: { projectId, version: nextVersion, wrappedDek: wrapDek(dek, kek), active: true },
  });
  dekCache.set(`${projectId}:${nextVersion}`, dek);
  return nextVersion;
}

/**
 * Crypto-shred a tenant: destroy all wrapped DEKs for the project. Encrypted
 * payloads become permanently unrecoverable. Returns the number of keys
 * destroyed.
 */
export async function destroyProjectKeys(projectId: string): Promise<number> {
  // Evict from cache first so subsequent reads cannot use a cached DEK.
  for (const k of [...dekCache.keys()]) {
    if (k.startsWith(`${projectId}:`)) dekCache.delete(k);
  }
  const res = await prisma.tenantKey.updateMany({
    where: { projectId },
    data: { destroyed: true, active: false, wrappedDek: null },
  });
  return res.count;
}
