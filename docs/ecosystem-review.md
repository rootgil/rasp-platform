# Inventaire des fonctionnalités — Écosystème RASP

> Dernière mise à jour : juin 2026  
> Périmètre : **rasp-platform**, **rasp-collector**, **rasp-agent-node**

---

## Vue d'ensemble

| Composant | Rôle | Stack |
|-----------|------|-------|
| **rasp-platform** | Console de gestion (dashboard tenant + backoffice admin) | Next.js, Prisma, PostgreSQL |
| **rasp-collector** | Ingestion des télémétries agents | Fastify 5, Prisma, PostgreSQL |
| **rasp-agent-node** | Agent runtime dans les apps clientes | Node.js, Express/Fastify/NestJS |

Les trois composants partagent la même base PostgreSQL (Neon en prod).

---

## 1. rasp-platform — Dashboard tenant

Accès : utilisateurs authentifiés, scoping par organisation.

| Fonctionnalité | Route | Description |
|----------------|-------|-------------|
| **Security Overview** | `/dashboard` | KPIs (apps, agents, events critiques, attaques bloquées, BOLA/IDOR), graphiques, auto-refresh |
| **Onboarding** | `/dashboard` | Tour guidé au premier login |
| **Applications** | `/dashboard/projects` | CRUD projets, compteurs agents/events |
| **Détail application** | `/dashboard/projects/[id]` | Onglets agents, clés API, events, endpoints, rules, settings |
| **BYOK** | Projet → settings | Clé de chiffrement client (Customer KEK) |
| **Fenêtres de maintenance** | Projet → settings | Plage UTC pour upgrades agent |
| **Agents** | `/dashboard/agents` | Liste agents, statut online/offline, création |
| **Détail agent** | `/dashboard/agents/[id]` | Métadonnées, secret HMAC, mode, canal, version épinglée |
| **Mode enforcement** | Agent detail | Bascule monitor / block |
| **Canal de mise à jour** | Agent detail | Stable / Early / Edge + pin de version |
| **Agent Lifecycle** | `/dashboard/agent-lifecycle` | Versions publiées par canal, kill-switch par agent |
| **Security Events** | `/dashboard/events` | Liste filtrable (severity, type, projet) |
| **Détail event** | `/dashboard/events/[id]` | Métadonnées + payload déchiffré (si KEK configuré) |
| **Alerts** | `/dashboard/alerts` | Workflow open → investigating → resolved |
| **API Discovery** | `/dashboard/api-discovery` | Inventaire runtime, shadow/zombie APIs, couverture auth |
| **Data Flow Diagram** | API Discovery → onglet Data Flow | Visualisation des champs PII par endpoint |
| **Import OpenAPI** | API Discovery | Comparer spec déclarée vs runtime |
| **Export OpenAPI** | API Discovery | Exporter l'inventaire découvert |
| **Detection Rules** | `/dashboard/rules` | Rules YAML par projet (catalogue + custom), publish |
| **Policies** | `/dashboard/policies` | Versions immuables signées Ed25519 |
| **Policy Rollback** | Policies | Revenir à une version antérieure |
| **Redaction Policies** | `/dashboard/redaction-policies` | denylist / allowlist / metadata-only / local-only |
| **API Keys** | `/dashboard/api-keys` | Création/révocation clés collector (hash bcrypt) |
| **Audit Logs** | `/dashboard/audit-logs` | Journal actions org, chaîne SHA-256 |
| **Settings** | `/dashboard/settings` | Profil org, membres, invitations, nom profil |

---

## 2. rasp-platform — Backoffice admin

Accès : `role === "admin"` uniquement.

| Fonctionnalité | Route | Description |
|----------------|-------|-------------|
| **Platform Overview** | `/backoffice` | KPIs globaux, orgs récentes, distribution versions agent |
| **Organizations** | `/backoffice/organizations` | Tous les tenants |
| **Organization Detail** | `/backoffice/organizations/[id]` | Membres, projets, métadonnées |
| **Customers** | `/backoffice/customers` | Tous les utilisateurs |
| **Contact Leads** | `/backoffice/contact-leads` | Leads marketing + provisioning tenant |
| **Global Detection Rules** | `/backoffice/rules` | Catalogue YAML plateforme, notification aux projets |
| **Agent Versions** | `/backoffice/agent-versions` | Registre versions, canary, KPIs rollout (MTTR, success rate) |
| **Version Actions** | Agent Versions | Promote, canary advance/halt, rollback, quarantine |
| **Version Compare** | Agent Versions | Comparaison changelog + impact + métriques côte à côte |
| **Version Exposure Map** | Agent Versions | Cartographie version → clients exposés |
| **Security Center** | `/backoffice/security-center` | Kill-switch global, dual-auth, MFA admin, break-glass |
| **Crypto Keys** | `/backoffice/crypto` | Rotation DEK par tenant, crypto-shred |
| **System Health** | `/backoffice/system-health` | PostgreSQL + collector `/health` |
| **Platform Audit** | `/backoffice/platform-audit` | Audit cross-tenant + vérification chaîne hash |

---

## 3. rasp-platform — Authentification & sécurité

| Fonctionnalité | Description | Statut |
|----------------|-------------|--------|
| **Login credentials** | Email/password bcrypt, sessions JWT (NextAuth) | ✅ |
| **Protection routes** | Dashboard auth, backoffice admin-only, gate changement mot de passe | ✅ |
| **Changement mot de passe forcé** | Flag `mustChangePassword` après provisioning | ✅ |
| **Reset mot de passe** | Token 1h, hash SHA-256 en DB | ✅ |
| **Invitations org** | Token 48h, acceptation via `/invite/[token]` | ✅ |
| **Signup invite-only** | Pas d'inscription self-service | ✅ |
| **Admin TOTP MFA** | Enrollment QR, requis sur actions sensibles admin | ✅ |
| **MFA au login** | Non appliqué à la connexion (seulement APIs privilégiées) | ⚠️ Partiel |
| **Dual Authorization** | Séparation des tâches (kill-switch, quarantine, rollback, crypto-shred) | ✅ |
| **Kill-switch global** | Désactive tous les agents plateforme | ✅ |
| **Kill-switch par agent** | Désactivation tenant-scoped | ✅ |
| **Break-Glass** | Token one-shot → JWT admin 30 min (urgence) | ✅ |
| **Audit log immuable** | Chaîne SHA-256, append-only via Prisma extension | ✅ |
| **Vérification chaîne audit** | Détection tampering rétroactif | ✅ |
| **Hash clés API** | Raw key affichée une fois, bcrypt en DB | ✅ |
| **Secret HMAC agent** | Intégrité payload par agent | ✅ |
| **Envelope encryption** | AES-256-GCM DEK wrappé par KEK | ✅ (requiert `KEK_MASTER_KEY`) |
| **BYOK** | KEK client wrappé par master KEK plateforme | ✅ |
| **DEK rotation / crypto-shred** | Rotation clés + destruction données tenant | ✅ |
| **Policies signées Ed25519** | Distribution immuable aux agents | ✅ (requiert clés signing) |
| **Isolation multi-tenant** | Toutes requêtes scopées par `organizationId` | ✅ |
| **Notifications tenant** | Kill-switch, quarantine, rollback → topbar | ✅ |
| **Opt-in rules catalogue** | Nouvelles rules globales nécessitent acceptation | ✅ |

**Documenté mais non implémenté dans le code plateforme :** mTLS, certificate pinning, HSM, SBOM/SLSA (voir `OPERATIONS.md`, `RASP-CONTEXT.md`).

---

## 4. rasp-platform — API management (~70 routes)

Principales catégories :

| Domaine | Exemples de routes |
|---------|-------------------|
| Auth & compte | `/api/auth/*`, `/api/account/*`, `/api/invites/[token]` |
| Projets & orgs | `/api/projects`, `/api/organizations`, `/api/settings/invite` |
| Agents & clés | `/api/agents`, `/api/agents/[id]/mode`, `/api/api-keys` |
| Télémétrie | `/api/events`, `/api/alerts`, `/api/api-discovery` |
| Rules & policies | `/api/project-rules`, `/api/policies`, `/api/redaction-policies` |
| Admin | `/api/admin/approvals`, `/api/admin/mfa`, `/api/backoffice/*` |
| Public | `/api/health`, `/api/contact`, `/api/openapi` |

Documentation interactive : `/docs` (Swagger UI).

---

## 5. rasp-collector — Ingestion

Service Fastify standalone recevant la télémétrie des agents.

### Routes HTTP

| Route | Méthode | Description |
|-------|---------|-------------|
| `/health` | GET | Liveness + probe DB (200/503) |
| `/v1/events` | POST | Ingestion events sécurité (202 Accepted) |
| `/v1/heartbeat` | POST | Liveness agent + kill-switch + policy + upgrade |
| `/v1/discovery` | POST | Inventaire endpoints runtime (batch 1–500) |
| `/v1/policy` | GET | Relay dernière policy signée par projet/canal |
| `/docs` | GET | Swagger UI |

### Sécurité

| Fonctionnalité | Description | Statut |
|----------------|-------------|--------|
| **Bearer API key** | bcrypt verify, prefix lookup, rejet clés révoquées | ✅ |
| **Binding projectId** | Payload `projectId` doit matcher la clé API | ✅ |
| **Gate redaction** | Rejet si `metadata.redacted !== true` | ✅ |
| **Limite taille payload** | 64 KB par défaut (413 si dépassé) | ✅ |
| **HMAC SHA-256** | Header `x-rasp-signature`, optionnel ou obligatoire | ✅ |
| **Rate limiting** | Par clé Bearer ou IP (429) | ✅ |
| **Helmet** | Headers sécurité HTTP | ✅ |
| **mTLS** | TLS 1.3 + fingerprint allow-list client certs | ✅ (opt-in) |
| **Envelope encryption** | Chiffrement metadata at-rest (AES-256-GCM) | ✅ |
| **BYOK** | Résolution KEK client via `Project.customerKekWrapped` | ✅ |
| **Volume monitoring** | Alerte `abnormal_volume` si flood par agent | ✅ |
| **Logs redacted** | Pino redacte auth headers, secrets, tokens | ✅ |

### Modules métier

| Module | Rôle |
|--------|------|
| `persist-event.ts` | Crée `SecurityEvent` chiffré + `Alert` si high/critical |
| `persist-heartbeat.ts` | Met à jour agent, merge kill-switch, retourne upgrade info |
| `persist-discovery.ts` | Upsert endpoints, merge schema/sensitiveFields, shadow/zombie |
| `resolve-target-version.ts` | Pin → canary cohort (FNV-1a) → maintenance window |
| `get-policy.ts` | Fetch policy signée pour relay |
| `volume-monitor.ts` | Compteur sliding-window par agent |

### Variables d'environnement clés

| Variable | Défaut | Description |
|----------|--------|-------------|
| `DATABASE_URL` | *(requis)* | PostgreSQL |
| `PORT` | `4000` | Port HTTP(S) |
| `MAX_EVENT_SIZE_BYTES` | `65536` | Taille max body |
| `RATE_LIMIT_PER_MINUTE` | `600` | Rate limit |
| `HMAC_REQUIRED` | `false` | Exiger signature HMAC |
| `MTLS_REQUIRED` | `false` | Exiger certificat client |
| `KEK_MASTER_KEY` | — | Master KEK (doit matcher rasp-platform) |
| `ABNORMAL_VOLUME_PER_MINUTE` | `300` | Seuil alerte volume |

---

## 6. rasp-agent-node — Agent runtime

Package npm : `@queno/agent-node` — installé dans les apps clientes.

### Détection

| Type | Détecteurs | Activation |
|------|-----------|------------|
| **Policy-driven (défaut)** | `CustomRuleDetector` — rules regex signées via heartbeat | ✅ Automatique |
| **Offline fallback** | SQLi, XSS, command injection, path traversal, NoSQL, SSRF, prototype pollution, SSTI, suspicious headers, BOLA HTTP | Via `createOfflineDetectors()` ou `extraDetectors` |
| **DB correlation** | BOLA via hooks DB (pg, mysql2, mongoose, sequelize, knex, Prisma) | `instrumentDb: true` |

### Redaction

| Fonctionnalité | Description |
|----------------|-------------|
| **Engine denylist/allowlist** | 20+ patterns clés (password, token, SSN, CVV…) |
| **Value redaction** | Luhn CC, SIN, email hash, IP mask, SQL literals |
| **Audit log local** | JSONL rotatif, jamais de secrets bruts |
| **Data residency** | `localOnly`, `metadataOnly`, `exportEventTypes`, `exportBlockedOnly` |
| **Invariant** | Tout event passe par redaction avant envoi ; échec → drop + audit local |

### API Discovery

| Fonctionnalité | Description |
|----------------|-------------|
| **Endpoint observer** | Auth heuristic, champs sensibles, schema inference, latence, error rate |
| **Route normalizer** | Segments numériques/UUID → `:id` |
| **Discovery buffer** | Flush périodique (60s) vers `POST /v1/discovery` |
| **Sensitive fields** | Noms de champs PII détectés (email, password, etc.) |

### Transport

| Endpoint | Rôle |
|----------|------|
| `POST /v1/events` | Envoi events (buffer in-memory, fail-open) |
| `POST /v1/heartbeat` | Kill-switch, policy version, mode, upgrade target |
| `POST /v1/discovery` | Inventaire endpoints batch |
| `GET /v1/policy` | Fetch policy signée |

Options transport : Bearer auth, HMAC, mTLS, certificate pinning.

### Intégrations framework

| Framework | Export | Comportement |
|-----------|--------|--------------|
| **Express** | `createExpressMiddleware(agent)` | Middleware + profiling response |
| **Fastify** | `createFastifyPlugin(agent)` | Hooks onRequest/onResponse |
| **NestJS** | `createNestMiddleware(agent)` | Classe middleware pour `MiddlewareConsumer` |

Toutes les intégrations : fail-open, block → HTTP 403.

### Modes & lifecycle

| Fonctionnalité | Description |
|----------------|-------------|
| **Monitor mode** | Détecte et logue, laisse passer la requête (défaut) |
| **Block mode** | HTTP 403 + event enqueued |
| **Kill-switch** | Désactive inspect + self-protection |
| **Policy self-rollback** | Rejet policy invalide → rollback vers version précédente |
| **Binary self-rollback** | Timeout init 60s → fallback `dist-previous/` |
| **Upgrade status** | Heartbeat reporte `upgrade_failed`, `upgrade_succeeded`, `rollback_loaded` |
| **Self-protection** | SecureStore chiffré, hook integrity polling, anti-debug (opt-in) |
| **Binary integrity** | SHA-256 vs `dist/integrity.json` post-build |

### Scripts npm

| Script | Usage |
|--------|-------|
| `build` | Compile + génère `integrity.json` |
| `test` / `test:unit` / `test:lab` / `test:e2e` / `test:stress` / `test:compat` | Suite Vitest |
| `benchmark:compare` | Comparaison p99 vs baseline |

---

## 7. Modèles de données (PostgreSQL)

Schéma partagé entre rasp-platform et collector.

| Domaine | Modèles |
|---------|---------|
| **Identité** | `User`, `Organization`, `OrganizationMember`, `Invitation`, `PasswordResetToken` |
| **Applications** | `Project`, `Agent`, `ApiKey`, `AgentVersion`, `PlatformSetting`, `RolloutMetric` |
| **Télémétrie** | `SecurityEvent`, `Alert`, `DiscoveredEndpoint` |
| **Détection** | `Rule`, `ProjectRule`, `CatalogueRuleNotification`, `Policy`, `RedactionPolicy` |
| **Crypto** | `TenantKey` |
| **Gouvernance** | `AuditLog`, `ApprovalRequest`, `BreakGlassToken`, `AdminNotification`, `UserNotification`, `ContactLead` |

---

## 8. CI/CD (GitLab)

| Repo | Pipeline | Stages |
|------|----------|--------|
| **agent-node** | `.gitlab-ci.yml` | lint → typecheck → test → bench → sbom → compat (APM) → build → verify → **publish (manual)** |
| **rasp** | `.gitlab-ci.yml` | lint → typecheck → test → migrate-check (main only) |
| **collector** | `.gitlab-ci.yml` | typecheck → test → security-audit |

Image CI : `node:22-alpine` SHA-pinned (supply chain hardening).

---

## 9. Documentation disponible

| Document | Emplacement | Contenu |
|----------|-------------|---------|
| **OPERATIONS.md** | `rasp/` | Runbook day-2 : MFA, break-glass, kill-switch, KEK, migrations, CI |
| **RASP-CONTEXT.md** | `rasp/` | Spec produit + matrice MVP vs production |
| **break-glass-testing.md** | `rasp/docs/` | Guide test break-glass local |
| **DEPLOY.md** | `rasp/` | Déploiement VPS Docker |
| **AGENTS.md** | Chaque repo | Règles architecture pour contributeurs |
| **ECOSYSTEM-FEATURES.md** | `rasp/docs/` | Ce document |

---

## 10. Lacunes connues / roadmap

| Zone | Statut |
|------|--------|
| **Alert assignment** | Champ `assignedTo` en DB, UI ne gère que le statut |
| **MFA au login** | TOTP sur APIs admin, pas à la connexion |
| **ClickHouse multi-tenant** | Non implémenté (isolation actuelle : PostgreSQL + envelope encryption) |
| **mTLS / cert pinning plateforme** | Documenté, pas dans le code dashboard |
| **HSM / SBOM / reproducible builds** | Documenté dans OPERATIONS.md, partiellement dans agent-node CI |
| **Tests collector** | Events + heartbeat couverts ; discovery, policy, mTLS, encryption non testés |
| **Script create-admin** | Référencé dans OPERATIONS.md, remplacé par `prisma/scripts/reset-passwords.ts` |

---

## 11. Comment tester rapidement

### Plateforme (rasp)

```bash
cd rasp
pnpm dev                    # http://localhost:3000
pnpm lint && pnpm typecheck && pnpm test
```

Comptes seed : `admin@rasp.io` / `demo@acme.io` (mots de passe via `.env` → `SEED_*_PASSWORD`).

Changer les mots de passe sans re-seed :

```bash
npx tsx prisma/scripts/reset-passwords.ts
```

### Collector

```bash
cd collector
pnpm dev                    # http://localhost:4000
curl http://localhost:4000/health
pnpm typecheck && pnpm test
```

### Agent Node

```bash
cd agent-node
pnpm build
pnpm test:unit              # redaction, policy, self-rollback
pnpm test:compat            # coexistence dd-trace, newrelic, otel
pnpm test:e2e               # banking-api example
```

Exemple complet : `examples/banking-api/`.

---

## 12. Flux de bout en bout

```
App cliente (Express/Fastify/NestJS)
    │
    ▼
@queno/agent-node
    ├── Detect (policy rules + optional offline detectors)
    ├── Redact (denylist/allowlist → metadata.redacted=true)
    ├── API Discovery (endpoint inventory + sensitiveFields)
    └── Transport (buffer + heartbeat)
            │
            ▼
    rasp-collector (:4000)
    ├── Auth (Bearer + optional HMAC/mTLS)
    ├── Validate (Zod schemas)
    ├── Encrypt (envelope AES-256-GCM)
    └── Persist (PostgreSQL)
            │
            ▼
    rasp-platform (:3000)
    ├── Dashboard (events, alerts, API discovery, rules, policies)
    └── Backoffice (versions, canary, security center, crypto, audit)
```
