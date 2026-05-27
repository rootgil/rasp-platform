# RASP Platform

AI-native Runtime Application Self-Protection for regulated Canadian workloads (PIPEDA · Law 25 · PHIPA).

This repo is the **management control plane** - landing page, client dashboard, admin backoffice, and management APIs.  
Separate repos: `rasp-collector` (event ingestion) · `rasp-agent-node` (runtime agent) · `rasp-docs`

## Demo credentials

| Role   | Email             | Password    |
|--------|-------------------|-------------|
| Client | demo@acme.io      | demo1234    |
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
