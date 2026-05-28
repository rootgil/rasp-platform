/**
 * Policy signing (control plane side).
 *
 * Implements the codeable equivalent of the HSM-backed "Signed policy
 * distribution" requirement (Addendum E.4.1): every policy pushed to agents is
 * signed with an Ed25519 private key. Agents verify the signature with the
 * matching public key before applying any policy change, so a compromised
 * network path (or collector) cannot inject malicious policies.
 *
 * Key management:
 *  - The private key lives ONLY on the control plane, provided via the
 *    `POLICY_SIGNING_PRIVATE_KEY` environment variable (PEM, PKCS#8). It is
 *    generated once during bootstrap and never committed to git. See the
 *    "Policy signing bootstrap" section of the README.
 *  - The public key (`POLICY_SIGNING_PUBLIC_KEY`) is non-secret and is pinned
 *    inside the agent package. In production it can be swapped for a KMS/HSM
 *    "sign as a service" call without changing the rest of the code: only
 *    `signPolicy()` needs to delegate to the KMS.
 *
 * The signature covers a canonical (deterministic) serialization of the policy
 * fields, including `version`, which prevents rollback/replay attacks.
 */
import crypto from "node:crypto";

/** Policy fields that are covered by the signature. */
export interface SignablePolicy {
  projectId: string;
  version: number;
  channel: string;
  mode: string;
  detectionRules: unknown;
  redactionConfig: unknown;
  dataResidency: unknown;
  targetAgentVersion: string | null;
}

/**
 * Deterministic JSON serialization with recursively sorted object keys.
 *
 * Both the signer (here) and the verifier (agent) MUST produce byte-identical
 * output for the same logical policy, so the algorithm is intentionally simple
 * and must be kept in sync with `agent-node/src/policy/canonical.ts`.
 */
export function stableStringify(value: unknown): string {
  if (value === null || value === undefined) return "null";
  if (typeof value === "number" || typeof value === "boolean") {
    return JSON.stringify(value);
  }
  if (typeof value === "string") return JSON.stringify(value);
  if (Array.isArray(value)) {
    return "[" + value.map((v) => stableStringify(v)).join(",") + "]";
  }
  const obj = value as Record<string, unknown>;
  const keys = Object.keys(obj).sort();
  return (
    "{" +
    keys
      .map((k) => JSON.stringify(k) + ":" + stableStringify(obj[k]))
      .join(",") +
    "}"
  );
}

/** Build the exact bytes that are signed/verified for a policy. */
export function canonicalPolicyBytes(policy: SignablePolicy): Buffer {
  const canonical = {
    channel: policy.channel,
    dataResidency: policy.dataResidency ?? null,
    detectionRules: policy.detectionRules ?? null,
    mode: policy.mode,
    projectId: policy.projectId,
    redactionConfig: policy.redactionConfig ?? null,
    targetAgentVersion: policy.targetAgentVersion ?? null,
    version: policy.version,
  };
  return Buffer.from(stableStringify(canonical), "utf8");
}

function getPrivateKeyPem(): string {
  const pem = process.env.POLICY_SIGNING_PRIVATE_KEY;
  if (!pem || pem.trim().length === 0) {
    throw new Error(
      "POLICY_SIGNING_PRIVATE_KEY is not set. Generate a key pair during bootstrap " +
        "(see README: Policy signing bootstrap) and set this env var."
    );
  }
  // Allow either a literal PEM or one with escaped newlines (common in .env).
  return pem.includes("\\n") ? pem.replace(/\\n/g, "\n") : pem;
}

/**
 * Sign a policy and return the base64 Ed25519 signature.
 *
 * In production this is the single seam to delegate to a KMS/HSM: replace the
 * `crypto.sign` call with the provider's signing API; the canonical bytes and
 * everything downstream stay identical.
 */
export function signPolicy(policy: SignablePolicy): string {
  const key = crypto.createPrivateKey(getPrivateKeyPem());
  const bytes = canonicalPolicyBytes(policy);
  // Ed25519: algorithm argument must be null.
  const sig = crypto.sign(null, bytes, key);
  return sig.toString("base64");
}

/**
 * Stable fingerprint of the active public key (first 16 hex chars of its
 * SHA-256). Stored on each policy as `signingKeyId` to support rotation.
 */
export function getSigningKeyId(): string | null {
  const pub = process.env.POLICY_SIGNING_PUBLIC_KEY;
  if (!pub) return null;
  const normalized = pub.includes("\\n") ? pub.replace(/\\n/g, "\n") : pub;
  try {
    const key = crypto.createPublicKey(normalized);
    const der = key.export({ type: "spki", format: "der" });
    return crypto.createHash("sha256").update(der).digest("hex").slice(0, 16);
  } catch {
    return null;
  }
}

/**
 * Convenience for local development and tests: generate an Ed25519 key pair as
 * PEM strings. NOT used at runtime in production (keys are generated once
 * during bootstrap and injected via env).
 */
export function generatePolicyKeyPair(): { publicKey: string; privateKey: string } {
  const { publicKey, privateKey } = crypto.generateKeyPairSync("ed25519");
  return {
    publicKey: publicKey.export({ type: "spki", format: "pem" }).toString(),
    privateKey: privateKey.export({ type: "pkcs8", format: "pem" }).toString(),
  };
}
