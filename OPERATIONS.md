# RASP Platform — Operations Runbook

This document covers every day-2 operational procedure for the three repositories:
`rasp-platform` (dashboard/backoffice), `rasp-collector` (event ingestion), and
`rasp-agent-node` (Node.js agent package).

---

## Table of Contents

1. [Admin Account Management](#1-admin-account-management)
2. [TLS Setup — Collector](#2-tls-setup--collector)
3. [mTLS Setup — Agent Client Certificates](#3-mtls-setup--agent-client-certificates)
4. [Payload Encryption (KEK / DEK)](#4-payload-encryption-kek--dek)
5. [BYOK — Bring Your Own Key](#5-byok--bring-your-own-key)
6. [Policy Signing (Ed25519)](#6-policy-signing-ed25519)
7. [MFA — Admin TOTP Setup](#7-mfa--admin-totp-setup)
8. [Break-Glass Emergency Access](#8-break-glass-emergency-access)
9. [Global Kill-Switch](#9-global-kill-switch)
10. [DEK Rotation & Crypto-Shred](#10-dek-rotation--crypto-shred)
11. [Agent Maintenance Windows](#11-agent-maintenance-windows)
12. [Database Migrations](#12-database-migrations)
13. [GitLab CI Secrets](#13-gitlab-ci-secrets)
14. [npm Package Publication](#14-npm-package-publication)

---

## 1. Admin Account Management

### Create a new admin (or reset an existing one)

```bash
# In rasp/ directory
pnpm exec tsx scripts/create-admin.ts \
  --email alice@example.com \
  --password "Ch@ngeMeNow!" \
  --name "Alice Admin"
```

If `alice@example.com` already exists the command promotes the account to
`role=admin` and resets its password. No data is lost.

**Seed accounts** (dev only — overwritten by `pnpm db:seed`):

| Email | Password | Role |
|---|---|---|
| `admin@rasp.io` | `$SEED_ADMIN_PASSWORD` | admin |
| `admin2@rasp.io` | `$SEED_ADMIN_PASSWORD` | admin |
| `demo@acme.io` | `$SEED_DEMO_PASSWORD` | user |

Passwords are read from env vars — the seed **crashes** if they are not set.
Set them in `rasp/.env` before running `pnpm db:seed` (see `.env.example`).

> Never use weak or previously-breached values. Generate with: `openssl rand -base64 16`

---

## 2. TLS Setup — Collector

The collector can terminate TLS directly (required for real mTLS) or run on
plain HTTP behind a reverse-proxy (nginx / Traefik).

### Option A — Plain HTTP behind a TLS proxy (recommended for most deployments)

Leave `TLS_CERT_PATH` / `TLS_KEY_PATH` empty. Configure TLS on nginx/Traefik
with TLS 1.3 minimum.

Nginx snippet:
```nginx
ssl_protocols       TLSv1.3;
ssl_ciphers         TLS_AES_256_GCM_SHA384:TLS_CHACHA20_POLY1305_SHA256;
ssl_prefer_server_ciphers on;
```

### Option B — Collector terminates TLS directly

This is **mandatory when `MTLS_REQUIRED=true`** — the collector must own the
TLS socket to read the client certificate.

#### Step 1 — Generate a self-signed certificate (dev/staging)

```bash
mkdir -p certs/collector

# Self-signed cert valid 365 days
openssl req -x509 -newkey rsa:4096 -sha256 -days 365 -nodes \
  -keyout certs/collector/server.key \
  -out    certs/collector/server.crt \
  -subj "/CN=collector.rasp.internal" \
  -addext "subjectAltName=DNS:collector.rasp.internal,IP:127.0.0.1"
```

#### Step 2 — Set env vars in `collector/.env`

```dotenv
TLS_CERT_PATH=./certs/collector/server.crt
TLS_KEY_PATH=./certs/collector/server.key
```

The collector will now listen on **HTTPS with TLS 1.3 minimum**.

---

## 3. mTLS Setup — Agent Client Certificates

mTLS ensures only your agents (with a valid client cert) can push events.

### Step 1 — Create a Certificate Authority

```bash
mkdir -p certs/ca certs/agent

# CA key + self-signed cert (valid 5 years)
openssl genrsa -out certs/ca/ca.key 4096
openssl req -x509 -new -nodes -key certs/ca/ca.key -sha256 -days 1825 \
  -out certs/ca/ca.crt \
  -subj "/CN=RASP Agent CA"
```

### Step 2 — Issue a client certificate for each agent

```bash
# One cert per deployment / environment
AGENT_NAME="prod-api-server"

openssl genrsa -out "certs/agent/${AGENT_NAME}.key" 4096

openssl req -new -key "certs/agent/${AGENT_NAME}.key" \
  -out "certs/agent/${AGENT_NAME}.csr" \
  -subj "/CN=${AGENT_NAME}"

openssl x509 -req -in "certs/agent/${AGENT_NAME}.csr" \
  -CA certs/ca/ca.crt -CAkey certs/ca/ca.key -CAcreateserial \
  -out "certs/agent/${AGENT_NAME}.crt" \
  -days 365 -sha256
```

### Step 3 — Extract the SHA-256 fingerprint

The collector matches against this value:

```bash
openssl x509 -in "certs/agent/${AGENT_NAME}.crt" -outform DER \
  | sha256sum | awk '{print $1}'
# Example output: a3f1b2c4d5e6f7...  (64 hex chars, no colons)
```

### Step 4 — Configure the collector

```dotenv
# collector/.env
MTLS_REQUIRED=true
TLS_CERT_PATH=./certs/collector/server.crt
TLS_KEY_PATH=./certs/collector/server.key
TLS_CA_PATH=./certs/ca/ca.crt
MTLS_ALLOWED_FINGERPRINTS=a3f1b2c4d5e6f7...,<other fingerprint>
```

> Multiple fingerprints are comma-separated. Remove a fingerprint to
> immediately revoke that agent's access (no restart needed — checked on
> every request).

### Step 5 — Configure the agent

Pass the cert/key paths to the agent's transport config in `RaspAgent`:

```typescript
new RaspAgent({
  apiKey: "...",
  projectId: "...",
  agentId: "...",
  tls: {
    cert: readFileSync("certs/agent/prod-api-server.crt"),
    key:  readFileSync("certs/agent/prod-api-server.key"),
    ca:   readFileSync("certs/ca/ca.crt"),   // verify collector cert
  },
});
```

---

## 4. Payload Encryption (KEK / DEK)

Two-tier AES-256-GCM envelope encryption. The KEK wraps per-project DEKs; the
DEK encrypts the actual event payloads.

### Bootstrap (one-time)

```bash
# Generate 32-byte master KEK (keep secret, never commit)
openssl rand -base64 32
# Example: v3P9...= (44 chars)
```

Set the **same** value in both repos:

```dotenv
# rasp/.env
KEK_MASTER_KEY="v3P9...="

# collector/.env
KEK_MASTER_KEY="v3P9...="    # MUST match rasp/.env exactly
```

### Key rotation

After changing `KEK_MASTER_KEY`:
1. All new DEKs are wrapped with the new KEK.
2. Existing DEKs wrapped with the old KEK can no longer be unwrapped.
3. **Safe migration path**: keep both values in a rotation map (custom `resolveKek`
   implementation), or re-encrypt DEKs via `POST /api/backoffice/dek` (rotate action).

---

## 5. BYOK — Bring Your Own Key

Customers can supply their own 32-byte KEK, which is used *instead* of the
global `KEK_MASTER_KEY` for their project.

### Generate a customer KEK

```bash
openssl rand -base64 32
# Example: XkY7...= (44-char base64, decodes to 32 bytes)
```

### Set it via the dashboard

Go to **Dashboard → Projects → [Project] → Security tab → BYOK section**
and paste the base64 key.

Or via API:

```bash
curl -X POST https://dashboard.example.com/api/dashboard/byok \
  -H "Content-Type: application/json" \
  -H "Cookie: <session>" \
  -d '{"action":"set","projectId":"<id>","customerKek":"XkY7...="}'
```

The raw key is wrapped by the platform KEK and stored. It is never logged.

### Remove BYOK

```bash
curl -X POST .../api/dashboard/byok \
  -d '{"action":"remove","projectId":"<id>"}'
```

After removal the platform global KEK is used. Existing payloads encrypted
with the old customer KEK remain **unreadable** until the DEK is re-wrapped.

---

## 6. Policy Signing (Ed25519)

Policies distributed to agents are Ed25519-signed. The agent rejects any
unsigned or incorrectly-signed policy.

### Generate a key pair (one-time per environment)

```bash
# Requires Node.js 18+
node -e "
const { generateKeyPairSync } = require('crypto');
const { privateKey, publicKey } = generateKeyPairSync('ed25519');
console.log('PRIVATE:', privateKey.export({ type:'pkcs8', format:'pem' }).replace(/\n/g,'\\\\n'));
console.log('PUBLIC:', publicKey.export({ type:'spki', format:'pem' }).replace(/\n/g,'\\\\n'));
"
```

Set in `rasp/.env`:

```dotenv
POLICY_SIGNING_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\nMC4C...\\n-----END PRIVATE KEY-----"
POLICY_SIGNING_PUBLIC_KEY="-----BEGIN PUBLIC KEY-----\nMCow...\\n-----END PUBLIC KEY-----"
```

Set on the agent side (distribute the public key only):

```bash
# Customer deployment — set in process environment
RASP_POLICY_PUBLIC_KEY="-----BEGIN PUBLIC KEY-----\nMCow...\n-----END PUBLIC KEY-----"
```

Or pass at construction time:

```typescript
new RaspAgent({ ..., policyPublicKey: "-----BEGIN PUBLIC KEY-----\n..." });
```

> **Never** share the private key with customers or commit it to Git.

---

## 7. MFA — Admin TOTP Setup

Admins must enrol MFA before they can execute sensitive actions (kill-switch,
rollback, quarantine).

### Enrol via the Security Center UI

1. Log in as admin.
2. Go to **Backoffice → Security Center → MFA Setup**.
3. Click **"Set up authenticator app"**.
4. Scan the `otpauth://` link in Google Authenticator / Authy, or enter the
   manual key.
5. Enter the 6-digit code to confirm.

### Enforce MFA for all admins

Currently MFA is voluntary per-admin. To require it platform-wide, add a
guard in `lib/auth-helpers.ts → requireAdmin()`:

```typescript
export async function requireAdmin(): Promise<SessionUser> {
  const user = await requireSession();
  if (user.role !== "admin") throw new Response(..., { status: 403 });

  // Enforce MFA enrolment for all admin actions:
  const record = await prisma.user.findUnique({ where: { id: user.id }, select: { mfaEnabled: true } });
  if (!record?.mfaEnabled) throw new Response(
    JSON.stringify({ error: "MFA required — enrol at /backoffice/security-center" }),
    { status: 403 }
  );

  return user;
}
```

---

## 8. Break-Glass Emergency Access

Use break-glass when the normal authentication system is unavailable (e.g., IdP down, all admin accounts locked, session store unavailable).

### Design

| Property | Value |
|---|---|
| Token lifetime | 4 hours |
| JWT lifetime (after exchange) | 30 minutes |
| Uses per token | 1 (single-use) |
| Stored secret | SHA-256 hash only — raw token never persisted |
| Audit | Every generation, use, and revocation is audit-logged |

### Step 1 — Pre-generate a token (while auth is still working)

Tokens **must be created before an incident** while an admin session is active.
Store the raw token securely offline (password manager, sealed envelope, HSM).

**Via UI:**

1. Go to **Backoffice → Security Center → Break-Glass section**.
2. Enter the incident reason (min 10 chars).
3. Click **"Generate Token"**.
4. **Copy the raw token immediately** — it is shown once and never stored.

**Via API** (while authenticated as admin):

```bash
curl -X POST https://dashboard.example.com/api/admin/break-glass \
  -H "Content-Type: application/json" \
  -H "Cookie: <admin session cookie>" \
  -d '{"action":"create","reason":"Pre-generated for DR scenario — auth outage"}'
```

Response:
```json
{
  "id": "cmxyz...",
  "rawToken": "4f3a1b2c...",
  "expiresAt": "2026-06-21T02:00:00.000Z",
  "warning": "Store this token securely. It will not be shown again."
}
```

### Step 2 — Exchange the raw token for an emergency JWT (no session required)

During an incident, call the **public** exchange endpoint — no cookie or session needed:

```bash
curl -X POST https://dashboard.example.com/api/auth/break-glass \
  -H "Content-Type: application/json" \
  -d '{"token":"4f3a1b2c..."}'
```

Response:
```json
{
  "jwt": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "expiresIn": 1800,
  "message": "Emergency JWT issued. Valid for 30 minutes. Single use only."
}
```

The raw token is immediately consumed. A second attempt with the same token returns `401`.

### Step 3 — Call admin endpoints with the emergency JWT

Pass the JWT as a `Bearer` token in the `Authorization` header:

```bash
# Example: read the kill-switch state
curl https://dashboard.example.com/api/backoffice/kill-switch \
  -H "Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."

# Example: toggle the kill-switch (still requires x-mfa-token for MFA-gated actions)
curl -X POST https://dashboard.example.com/api/backoffice/kill-switch \
  -H "Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..." \
  -H "x-mfa-token: 123456" \
  -d '{"enabled":true,"reason":"Emergency — auth outage"}'
```

The JWT expires in 30 minutes. After expiry, repeat Step 2 with a fresh (unused) token.

### Revoke a pre-generated token

If a stored token is compromised or no longer needed, revoke it immediately (requires a live admin session):

```bash
curl -X POST https://dashboard.example.com/api/admin/break-glass \
  -H "Cookie: <admin session cookie>" \
  -H "Content-Type: application/json" \
  -d '{"action":"revoke","tokenId":"cmxyz..."}'
```

### Audit trail

All token activity appears in **Backoffice → Audit Logs**:

| Event | When |
|---|---|
| `break_glass.created` | Token generated |
| `break_glass.used` | Raw token exchanged for JWT (includes IP) |
| `break_glass.revoked` | Token manually revoked |

---

## 9. Global Kill-Switch

Immediately disables inspection on every agent across all tenants.

### Workflow (dual-authorization required)

**Step 1 — Admin A raises an approval request** (Security Center → Kill-Switch → "Raise approval request").

**Step 2 — Admin B approves it** (Security Center → Pending Approvals → Approve).
Admin B must differ from Admin A.

**Step 3 — Admin A activates with MFA** (Security Center → "Activate kill-switch" → enter TOTP code).

### Disable the kill-switch

Security Center → "Restore agents" → enter TOTP code. No approval required.

### Via API

```bash
# Step 1: raise approval
curl -X POST .../api/admin/approvals \
  -d '{"action":"platform.kill_switch","reason":"Active ransomware campaign"}'

# Step 2: approve (as a different admin)
curl -X POST .../api/admin/approvals/<approval-id> \
  -d '{"action":"approve"}'

# Step 3: activate (original admin, with MFA header)
curl -X POST .../api/backoffice/kill-switch \
  -H "x-mfa-token: 123456" \
  -d '{"enabled":true,"reason":"Confirmed ransomware — shutting down all agents"}'
```

---

## 10. DEK Rotation & Crypto-Shred

### Rotate a tenant's DEK

Go to **Backoffice → Crypto Keys → [Project] → "Rotate DEK"**.

- A new DEK version is created.
- Future writes use the new DEK.
- Old encrypted payloads remain readable via their original DEK version.

### Crypto-shred (GDPR Right-to-Erasure / tenant offboarding)

Go to **Backoffice → Crypto Keys → [Project] → "Crypto-shred"**.

> **This is irreversible.** All DEK versions for the project are destroyed;
> every encrypted payload becomes permanently unreadable.

The database rows are **not deleted** — only the keys are gone.

---

## 11. Agent Binary Self-Rollback

If a new agent version fails to initialize within 60 seconds (hooks not attaching,
control plane unreachable), the agent emits an `upgrade_failed` heartbeat event and
attempts to load the previous version from `dist-previous/`.

### Before every agent upgrade

Run this once inside the customer's project **before** running `npm install`:

```bash
node node_modules/@queno/agent-node/scripts/backup-dist.mjs
```

This backs up the current `dist/` to `dist-previous/`. If the new version fails,
the agent loads `dist-previous/` automatically and reports to the control plane.

### What the control plane does on `upgrade_failed`

The `upgradeStatus: "upgrade_failed"` field in the next heartbeat is visible
in **Dashboard → Agents → [agent] → Status Timeline** and triggers a
**control-plane rollback** (sets `targetVersion` back to the previous version).

---

## 12. Agent Maintenance Windows


Control when upgrade advertisements are sent to specific agents.

### Configure via the dashboard

1. Go to **Dashboard → Projects → [Project] → Security tab**.
2. Find the agent in the "Agent Maintenance Windows" panel.
3. Set **Start hour**, **End hour** (UTC), and optionally specific days.
4. Click **Save**.

### Example windows

| Scenario | startHour | endHour | days |
|---|---|---|---|
| Nightly 2–4 AM UTC | 2 | 4 | — (every day) |
| Weekend nights only | 1 | 5 | [6, 0] (Sat, Sun) |
| Business hours (no upgrades) | 0 | 8 | — |

### Via API

```bash
curl -X POST .../api/agents/<agent-id>/maintenance \
  -d '{"action":"set","window":{"startHour":2,"endHour":4,"days":[1,2,3,4,5]}}'

# Clear window (upgrades at any time)
curl -X POST .../api/agents/<agent-id>/maintenance \
  -d '{"action":"clear"}'
```

---

## 13. Database Migrations

```bash
# rasp/  — applies all pending migrations
cd rasp && pnpm prisma migrate deploy

# Development — creates a new named migration from schema diff
cd rasp && pnpm prisma migrate dev --name describe_your_change

# collector/ — mirror schema must stay in sync manually
# After editing collector/prisma/schema.prisma:
cd collector && pnpm prisma generate
```

### Migration required after installing this version

The BYOK and Break-Glass features added in this sprint require:

```bash
cd rasp && pnpm prisma migrate deploy
# Applies: 20260621000001_add_byok_and_breakglass
```

---

## 14. GitLab CI Secrets

Set these in **GitLab → Settings → CI/CD → Variables** (masked, protected).

### rasp-platform

| Variable | Required | Description |
|---|---|---|
| `DATABASE_URL` | No (uses dummy for tests) | Real DB only for integration tests |
| `SAST_DISABLED` | — | Set to `"true"` to skip SAST in forks |

### rasp-collector

| Variable | Required | Description |
|---|---|---|
| `DATABASE_URL` | No (uses dummy for tests) | Real DB only for integration tests |

### rasp-agent-node

| Variable | Required | Description |
|---|---|---|
| `NPM_TOKEN` | **Yes** (publish stage) | npm access token with `publish` scope |
| `COSIGN_PRIVATE_KEY` | Optional | Cosign signing key (OIDC used by default) |

The `NPM_TOKEN` must be a **Granular Access Token** (npm) with:
- Scope: `@queno/agent-node`
- Permission: `Read and Write` (Packages)

---

## 15. npm Package Publication

The `agent-node` GitLab CI pipeline publishes automatically on tags.

### Manual publish

```bash
cd agent-node
pnpm build          # compiles TypeScript + generates dist/integrity.json
npm publish --provenance --access public
```

`--provenance` attaches a Sigstore attestation linking the package to the
CI job that built it. Consumers can verify with:

```bash
npm audit signatures @queno/agent-node
```

### Verify a published package

```bash
# Check npm provenance
npm audit signatures @queno/agent-node@<version>

# Verify cosign signature on the SBOM artifact (if signed in CI)
cosign verify-blob sbom.cdx.json \
  --certificate-identity "https://gitlab.com/..." \
  --certificate-oidc-issuer "https://token.actions.githubusercontent.com"
```

---

*Last updated: 2026-06-21 — generated during RASP platform completion sprint.*
