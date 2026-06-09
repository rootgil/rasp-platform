# RASP Platform

AI-native Runtime Application Self-Protection for regulated Canadian workloads (PIPEDA · Law 25 · PHIPA).

This repo is the **management control plane** - landing page, client dashboard, admin backoffice, and management APIs.  
Separate repos: `rasp-collector` (event ingestion) · `rasp-agent-node` (runtime agent) · `rasp-docs`

## Demo credentials

| Role   | Email             | Password    |
|--------|-------------------|-------------|
| Admin  | admin@rasp.io     | admin1234   |

## Stack

- **Next.js 16** (App Router) · React 19 · TypeScript
- **Tailwind CSS 4** · Radix UI · lucide-react · Recharts
- **Prisma 7** · PostgreSQL (Neon)
- **Auth.js v5** (NextAuth) - Credentials provider · JWT sessions
- **Zod** · bcryptjs · Vitest

## Quick start

### 1. Clone & install

```bash
git clone <repo>
cd rasp-platform
pnpm install
```

### 2. Set up environment

```bash
cp .env.example .env
```

Edit `.env` - set your **Neon** connection string:

```
DATABASE_URL="postgresql://user:password@ep-xxx.region.aws.neon.tech/rasp_platform?sslmode=require"
AUTH_SECRET="$(openssl rand -base64 32)"
NEXTAUTH_URL="http://localhost:3000"
```

Get a free Neon database at [neon.tech](https://neon.tech).

> You also need a **policy signing key** (see next section) before publishing policies.

## Policy signing bootstrap (one-time)

Policies pushed to agents are **Ed25519-signed** by the control plane and verified
by each agent before being applied (Addendum E.4.1). This requires a key pair.

**This is a one-time bootstrap step, done once before the first deployment - NOT on every deploy.**
The same key is reused across all subsequent deployments. Regenerating it would
cause every already-installed agent to reject new policies.

### 1. Generate the pair on the server (VPS)

```bash
# Private key - stays on the control plane only, never committed
openssl genpkey -algorithm ed25519 -out policy_signing_private.pem
chmod 600 policy_signing_private.pem

# Public key - non-secret, pinned inside the agent package
openssl pkey -in policy_signing_private.pem -pubout -out policy_signing_public.pem
```

### 2. Wire the keys

| Key | Where it lives | Env var |
|---|---|---|
| **Private** | Control plane only (this repo), file `chmod 600` / secret manager | `POLICY_SIGNING_PRIVATE_KEY` |
| **Public** | Pinned in the agent package (`agent-node`); also kept here for reference/rotation | `POLICY_SIGNING_PUBLIC_KEY` |

Add to `.env` (use `\n` escapes or a raw multi-line PEM):

```
POLICY_SIGNING_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\n...\n-----END PRIVATE KEY-----"
POLICY_SIGNING_PUBLIC_KEY="-----BEGIN PUBLIC KEY-----\n...\n-----END PUBLIC KEY-----"
```

Then publish the **public** key into the agent: set it as the agent's default
`DEFAULT_POLICY_PUBLIC_KEY` (in `agent-node/src/config.ts`) at release time, or
pass it via `RaspConfig.policyPublicKey` / `RASP_POLICY_PUBLIC_KEY`.

### 3. Local dev shortcut

A development key pair ships pre-pinned in the agent so the flow works out of the
box. For local signing, set `POLICY_SIGNING_PRIVATE_KEY` to the matching dev
private key:

```
POLICY_SIGNING_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\nMC4CAQAwBQYDK2VwBCIEIIBJTx2h9TZetMcK/NDL/dYH/tv7BMKmcKTZjjFqppyI\n-----END PRIVATE KEY-----"
```

**Never use the dev key in production.** Generate a fresh pair per the steps above.

### Production note

In production the private key should live in a secret manager (AWS/GCP Secret
Manager, Vault) or, better, a KMS/HSM that signs without exposing the key. Only
`signPolicy()` in `lib/policy-signing.ts` needs to change to delegate to the KMS;
the canonical bytes and the agent-side verification stay identical. Key rotation
is performed through the policy distribution channel itself (a policy signed by
the old key announces the new public key).

## Payload encryption bootstrap (KEK master key, one-time)

Event payloads are stored encrypted at rest using **envelope encryption**
(Addendum E.6): a single master key (the **KEK**) wraps a per-project data
encryption key (**DEK**); payloads are encrypted with the project's DEK
(AES-256-GCM). This gives crypto-isolation between tenants and enables
crypto-shredding (destroying a tenant's keys makes their data unrecoverable).

**This is a one-time bootstrap step, shared by the control plane and the collector.**

### 1. Generate the KEK on the server (VPS)

```bash
# 32 random bytes, base64-encoded
openssl rand -base64 32
```

### 2. Wire the key

| Key | Where it lives | Env var |
|---|---|---|
| **KEK master key** | Control plane **and** collector (same value), secret manager / `chmod 600` | `KEK_MASTER_KEY` |

```
# rasp/.env and collector/.env - MUST be identical on both
KEK_MASTER_KEY="<base64 from openssl rand -base64 32>"
```

The collector encrypts payloads on ingestion (`collector/src/lib/envelope.ts`);
the control plane decrypts them for display (`rasp/lib/envelope.ts`). Because the
DEKs are wrapped by the KEK and stored in the DB (`TenantKey`), both services
must share the same `KEK_MASTER_KEY`.

- **Key rotation:** `POST /api/projects/:id/rotate-key` creates a new DEK version;
  existing ciphertext stays readable under its previous version.
- **Right-to-deletion / crypto-shred:** `POST /api/projects/:id/purge` with
  `{ "mode": "delete-all", "cryptoShred": true }` deletes rows and destroys the
  tenant's DEKs.

> If `KEK_MASTER_KEY` is unset, encryption is disabled and payloads are stored as
> plaintext JSON (dev only). **Always set it in production.**

## Admin security bootstrap (MFA, dual-authorization, audit chain)

- **MFA (TOTP):** admins enroll via `POST /api/admin/mfa` (`enroll` → scan the
  returned `otpauthUrl`, then `confirm` with a 6-digit code). No external service
  needed - secrets are stored on the `User` row. `requireMfa()` gates sensitive
  operations.
- **Dual-authorization:** sensitive actions (global kill-switch, version
  quarantine, crypto-shred, rollback) require an `ApprovalRequest` raised by one
  admin (`POST /api/admin/approvals`) and approved by a **different** admin
  (`POST /api/admin/approvals/:id`). Separation of duties is enforced server-side.
- **Tamper-evident audit log:** every `createAuditLog` entry is hash-chained to
  the previous one. Verify integrity at `GET /api/admin/audit/verify`.

No extra env vars are required for these; they are enabled by the schema.

### 3. Push schema & seed

```bash
pnpm db:generate   # generate Prisma client
pnpm db:push       # push schema to Neon (no migration files)
pnpm db:seed       # load demo data
```

### 4. Run

```bash
pnpm dev
```

- Landing: [http://localhost:3000](http://localhost:3000)
- Dashboard: [http://localhost:3000/dashboard](http://localhost:3000/dashboard)
- Backoffice: [http://localhost:3000/backoffice](http://localhost:3000/backoffice)

## Available scripts

| Script | Description |
|---|---|
| `pnpm dev` | Start dev server |
| `pnpm build` | Production build |
| `pnpm typecheck` | TypeScript check |
| `pnpm lint` | ESLint |
| `pnpm test` | Run Vitest tests |
| `pnpm db:generate` | Regenerate Prisma client |
| `pnpm db:push` | Push schema to DB (no migration files) |
| `pnpm db:migrate` | Run Prisma migrations (production) |
| `pnpm db:seed` | Load demo data |
| `pnpm db:studio` | Open Prisma Studio |

## Architecture

```
app/
├── (marketing)/      → / /features /security /pricing /contact
├── (auth)/           → /login /signup
├── (app)/dashboard/  → Client panel (tenant-scoped)
├── (admin)/backoffice/ → Admin backoffice (role=admin only)
└── api/              → Route Handlers (Zod-validated, org-scoped)

components/
├── layout/           → Sidebar, Topbar, AdminSidebar, MarketingHeader/Footer
├── shared/           → SeverityBadge, StatusBadge, KpiCard, PageHeader, DataTable, EmptyState
└── ui/               → Button, Card, Input, Badge, Dialog, Select, Tabs, DropdownMenu

modules/
├── agents/           → agents.server.ts
├── alerts/           → alerts.server.ts
├── api-discovery/    → api-discovery.server.ts
├── api-keys/         → api-keys.server.ts
├── audit/            → audit.server.ts
├── events/           → events.server.ts
├── organizations/    → organizations.server.ts
├── policies/         → policies.server.ts (signed, versioned policy distribution)
├── projects/         → projects.server.ts
└── redaction/        → redaction.server.ts

lib/
├── auth.ts           → Auth.js v5 configuration
├── auth-helpers.ts   → requireSession(), requireAdmin(), createAuditLog(), getOrgId()
├── prisma.ts         → Prisma client singleton (Neon adapter)
└── utils.ts          → cn(), formatDate(), getSeverityColor(), getStatusColor()
```

## Security model

- **Agent-side redaction** - PII scrubbed before any telemetry leaves the customer env
- **API keys** - bcrypt-hashed, prefix-only stored, one-time display at creation
- **RBAC** - double enforcement: middleware + server-side `requireAdmin()` per backoffice route
- **Org scoping** - every query filtered by `organizationId`; cross-tenant access is architecturally impossible
- **Audit log** - every mutation writes to `AuditLog` table
- **Kill switch** - disable any agent from the dashboard; takes effect within 60s

## Roadmap

- **J1** (this repo) - Platform UI + management APIs ✅
- **J2** - `rasp-collector`: event ingestion, HMAC verification, rate limiting
- **J3** - `rasp-agent-node`: Node.js runtime agent, SQLi/path traversal/command injection detection
