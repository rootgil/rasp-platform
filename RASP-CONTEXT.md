# RASP

Oui, je reprends tout proprement en version **finale complète**, avec **dashboard + backoffice**, **backend Next.js**, **collector séparé**, **agent RASP Node.js**, **audit local de redaction chez le client**, **docs**, **AGENTS.md**, **test cases**, **roadmap 3 jours**, et toutes les grosses exigences du cahier des charges : API discovery, privacy, compatibilité, lifecycle, rollback, platform security, telemetry security, audit trail, etc.

L’objectif n’est pas de prétendre finir un produit enterprise complet en 3 jours. L’objectif est de livrer un **MVP technique solide**, démontrable, bien architecturé, avec les parties avancées soit implémentées en version simple, soit documentées clairement comme roadmap production-grade.

---

# 1. Vision de livraison en 3 jours

Tu dois livrer ceci :

```
MVP RASP Platform
├── Dashboard + Backoffice
├── Backend de gestion dans Next.js
├── Collector séparé pour recevoir les events
├── Agent RASP Node.js
├── Détection basique SQLi / Path Traversal / Command Injection
├── Redaction côté agent
├── Audit local des redactions chez le client
├── Heartbeat agent
├── API Discovery basique
├── Alertes dans dashboard
├── Documentation senior
├── AGENTS.md dans chaque repo
├── Test cases
└── Roadmap production-grade
```

La phrase à garder en tête :

```
Je livre un MVP fonctionnel, mais je documente aussi l’architecture complète attendue pour une plateforme RASP production-grade.
```

---

# 2. Architecture globale recommandée

```
                           ┌─────────────────────────┐
                           │ Dashboard / Backoffice   │
                           │ Next.js Monolith         │
                           │ rasp-platform            │
                           └───────────┬─────────────┘
                                       │
                                       │ Management APIs
                                       ▼
                           ┌─────────────────────────┐
                           │ PostgreSQL              │
                           │ Users, Projects, Alerts │
                           │ API Discovery, Policies │
                           └─────────────────────────┘

 ┌────────────────────┐      ┌─────────────────────────┐
 │ Customer App        │      │ rasp-collector          │
 │ Express / Fastify   │─────▶│ Fastify / Node.js       │
 │ + RASP Agent Node   │      │ Event ingestion         │
 └─────────┬──────────┘      └───────────┬─────────────┘
           │                             │
           │ local client audit log       │ queue / persistence
           ▼                             ▼
 ┌────────────────────┐      ┌─────────────────────────┐
 │ .rasp/audit/        │      │ Redis / BullMQ           │
 │ redaction-audit.log │      │ Async processing         │
 └────────────────────┘      └─────────────────────────┘
```

---

# 3. Repos GitHub à créer

Tu dois créer **4 repos**.

## 1. `rasp-platform`

**But :** dashboard + backoffice + backend de gestion dans Next.js.

Description GitHub :

```
RASP management platform built with Next.js, providing dashboard, backoffice, management APIs, API discovery inventory, agent lifecycle management, security alerts, rules, privacy controls, and audit logs.
```

Ce repo contient :

```
- Auth
- Dashboard
- Backoffice
- Organizations
- Projects / Applications
- API Keys
- Agents
- Security Events
- Alerts
- Rules
- API Discovery
- Redaction Policies
- Agent Versions
- Audit Logs
```

---

## 2. `rasp-collector`

**But :** service d’ingestion séparé pour recevoir les événements envoyés par les agents.

Description GitHub :

```
High-throughput RASP event collector for ingesting, authenticating, validating, rate-limiting, and queueing runtime security telemetry from agents.
```

Ce repo contient :

```
- POST /v1/events
- POST /v1/heartbeat
- GET /health
- Agent authentication
- HMAC payload verification
- Rate limiting
- Payload validation
- Redaction check
- Queue
- Normalization
- Structured logs
```

---

## 3. `rasp-agent-node`

**But :** agent RASP Node.js installé dans les applications clientes.

Description GitHub :

```
Node.js RASP agent for detecting, redacting, auditing, blocking, and reporting runtime application attacks in Express, Fastify, and NestJS applications.
```

Ce repo contient :

```
- Express middleware
- Fastify plugin
- NestJS middleware basique
- SQL injection detector
- Path traversal detector
- Command injection detector
- Sensitive data detector
- Agent-side redaction engine
- Local redaction audit log
- Monitor mode
- Block mode
- Telemetry buffer
- Retry queue
- Heartbeat
- Fail-open behavior
```

---

## 4. `rasp-docs`

**But :** documentation d’architecture, sécurité, privacy, lifecycle, compatibilité et test plan.

Description GitHub :

```
Architecture, specifications, security model, compatibility testing strategy, and implementation documentation for the AI-native RASP platform.
```

Ce repo contient :

```
- Architecture globale
- Repository strategy
- API discovery specification
- Data privacy and redaction strategy
- Local redaction audit log specification
- Collector API specification
- Agent Node.js specification
- Agent lifecycle strategy
- Upgrade and rollback strategy
- Compatibility testing matrix
- Platform security architecture
- Test plan
- Demo script
- Known limitations and roadmap
```

---

# 4. Pourquoi front + back ensemble dans Next.js, mais collector séparé

Oui, le frontend et le backend de gestion peuvent être ensemble dans Next.js.

```
rasp-platform = frontend + backend de gestion
```

C’est bon pour :

```
- dashboard
- backoffice
- auth
- users
- organizations
- projects
- API keys
- rules
- alerts
- reports
- redaction policies
```

Mais le collector doit rester séparé, parce qu’il ne sert pas aux humains. Il reçoit les événements automatiques des agents. Il peut recevoir beaucoup plus de trafic que le dashboard.

```
rasp-collector = ingestion haute fréquence
```

Argument senior :

```
The management platform is implemented as a Next.js monolith because the dashboard, backoffice, authentication, and management APIs share the same product domain and data model.

The collector is separated because it has a different runtime profile: high-frequency ingestion, stricter rate limiting, agent authentication, payload validation, queue-based processing, and independent scalability requirements.
```

---

# 5. Structure complète des repos

## `rasp-platform`

```
rasp-platform/
├── app/
│   ├── dashboard/
│   │   ├── page.tsx
│   │   ├── projects/
│   │   ├── agents/
│   │   ├── events/
│   │   ├── alerts/
│   │   ├── api-discovery/
│   │   ├── redaction-policies/
│   │   ├── agent-lifecycle/
│   │   └── audit-logs/
│   ├── backoffice/
│   ├── login/
│   └── api/
│       ├── organizations/
│       ├── projects/
│       ├── api-keys/
│       ├── agents/
│       ├── events/
│       ├── alerts/
│       ├── rules/
│       ├── api-discovery/
│       ├── redaction-policies/
│       ├── agent-versions/
│       └── audit-logs/
├── components/
├── modules/
│   ├── auth/
│   ├── organizations/
│   ├── projects/
│   ├── api-keys/
│   ├── agents/
│   ├── alerts/
│   ├── api-discovery/
│   ├── redaction/
│   ├── lifecycle/
│   └── audit-logs/
├── lib/
├── prisma/
├── tests/
├── README.md
├── AGENTS.md
├── .env.example
└── docker-compose.yml
```

---

## `rasp-collector`

```
rasp-collector/
├── src/
│   ├── server.ts
│   ├── app.ts
│   ├── routes/
│   │   ├── events.route.ts
│   │   ├── heartbeat.route.ts
│   │   └── health.route.ts
│   ├── modules/
│   │   ├── ingestion/
│   │   ├── auth/
│   │   ├── validation/
│   │   ├── hmac/
│   │   ├── rate-limit/
│   │   ├── queue/
│   │   ├── normalization/
│   │   └── persistence/
│   ├── schemas/
│   │   ├── event.schema.ts
│   │   └── heartbeat.schema.ts
│   ├── lib/
│   └── config/
├── tests/
├── README.md
├── AGENTS.md
├── .env.example
└── Dockerfile
```

---

## `rasp-agent-node`

```
rasp-agent-node/
├── src/
│   ├── index.ts
│   ├── agent.ts
│   ├── config.ts
│   ├── middleware/
│   │   ├── express.ts
│   │   ├── fastify.ts
│   │   └── nestjs.ts
│   ├── detectors/
│   │   ├── sql-injection.detector.ts
│   │   ├── path-traversal.detector.ts
│   │   ├── command-injection.detector.ts
│   │   ├── suspicious-payload.detector.ts
│   │   └── sensitive-data.detector.ts
│   ├── redaction/
│   │   ├── redaction-engine.ts
│   │   ├── patterns.ts
│   │   └── redaction-policy.ts
│   ├── audit/
│   │   ├── local-audit-logger.ts
│   │   ├── audit-event.ts
│   │   └── audit-rotation.ts
│   ├── transport/
│   │   ├── collector-client.ts
│   │   ├── hmac.ts
│   │   └── retry-buffer.ts
│   ├── lifecycle/
│   │   ├── heartbeat.ts
│   │   ├── healthcheck.ts
│   │   ├── kill-switch.ts
│   │   └── version.ts
│   ├── api-discovery/
│   │   ├── route-normalizer.ts
│   │   ├── schema-inference.ts
│   │   └── endpoint-observer.ts
│   └── utils/
├── examples/
│   ├── express-app/
│   ├── fastify-app/
│   └── nestjs-app/
├── tests/
├── README.md
├── AGENTS.md
├── .env.example
└── package.json
```

---

# 6. Modèle de données Prisma minimum

Dans `rasp-platform`, tu peux commencer avec ces modèles.

```
model User {
  id        String   @id @default(cuid())
  email     String   @unique
  name      String?
  createdAt DateTime @default(now())
}

model Organization {
  id        String   @id @default(cuid())
  name      String
  plan      String   @default("free")
  createdAt DateTime @default(now())
}

model OrganizationMember {
  id             String   @id @default(cuid())
  organizationId String
  userId         String
  role           String   @default("member")
  createdAt      DateTime @default(now())
}

model Project {
  id             String   @id @default(cuid())
  organizationId String
  name           String
  language       String
  framework      String?
  environment    String   @default("production")
  collectorUrl   String?
  createdAt      DateTime @default(now())
}

model ApiKey {
  id        String   @id @default(cuid())
  projectId String
  keyHash   String
  prefix    String
  revoked   Boolean  @default(false)
  createdAt DateTime @default(now())
}

model Agent {
  id              String   @id @default(cuid())
  projectId       String
  language        String
  framework       String?
  version         String
  status          String   @default("offline")
  channel         String   @default("stable")
  lastHeartbeatAt DateTime?
  killSwitch       Boolean @default(false)
  createdAt        DateTime @default(now())
}

model AgentVersion {
  id          String   @id @default(cuid())
  version     String
  channel     String
  status      String   @default("candidate")
  changelog   String?
  releasedAt  DateTime?
  createdAt   DateTime @default(now())
}

model SecurityEvent {
  id          String   @id @default(cuid())
  projectId   String
  agentId     String?
  type        String
  severity    String
  method      String?
  path        String?
  sourceIp    String?
  payload     Json?
  redacted    Boolean  @default(true)
  action      String   @default("monitor")
  createdAt   DateTime @default(now())
}

model Alert {
  id              String   @id @default(cuid())
  securityEventId String
  status          String   @default("open")
  severity        String
  assignedTo      String?
  createdAt       DateTime @default(now())
}

model Rule {
  id        String   @id @default(cuid())
  projectId String
  name      String
  type      String
  mode      String   @default("monitor")
  enabled   Boolean  @default(true)
  config    Json?
  createdAt DateTime @default(now())
}

model DiscoveredEndpoint {
  id               String   @id @default(cuid())
  projectId        String
  method           String
  pathPattern      String
  authStatus       String   @default("unknown")
  authorization    String   @default("unknown")
  hasSensitiveData Boolean  @default(false)
  riskScore        Int      @default(0)
  trafficCount     Int      @default(0)
  firstSeenAt      DateTime @default(now())
  lastSeenAt       DateTime @default(now())
}

model RedactionPolicy {
  id        String   @id @default(cuid())
  projectId String
  mode      String   @default("denylist")
  rules     Json?
  createdAt DateTime @default(now())
}

model AuditLog {
  id        String   @id @default(cuid())
  actorId   String?
  action    String
  target    String?
  metadata  Json?
  createdAt DateTime @default(now())
}
```

Ces modèles couvrent les besoins de base : projets, agents, événements, alertes, règles, API discovery, redaction policies, agent lifecycle et audit logs.

---

# 7. Spécification importante : audit local de redaction chez le client

Ce point est **obligatoire**.

Le cahier des charges dit que les données sensibles doivent être masquées dans l’agent avant de quitter l’environnement client, et que les actions de redaction doivent être auditables localement, sans envoyer les valeurs sensibles au control plane.

Donc dans `rasp-agent-node`, il faut absolument avoir :

```
src/audit/local-audit-logger.ts
src/audit/audit-event.ts
src/audit/audit-rotation.ts
```

---

## Où le fichier local doit être écrit

Par défaut :

```
.rasp/
└── audit/
    ├── redaction-audit.log
    ├── redaction-audit-2026-05-26.log
    └── redaction-audit-2026-05-27.log
```

Chemin configurable :

```
RASP_AUDIT_LOG_PATH=/var/log/rasp/redaction-audit.log
```

---

## Ce que le log local peut contenir

Exemple autorisé :

```json
{
  "timestamp": "2026-05-26T18:30:00.000Z",
  "eventId": "evt_123",
  "projectId": "proj_123",
  "agentId": "agent_node_001",
  "redactionType": "email",
  "fieldPath": "request.body.email",
  "action": "hashed_sha256",
  "success": true
}
```

Exemple interdit :

```json
{
  "email": "client@example.com",
  "password": "secret123",
  "token": "raw-token-value"
}
```

---

## Flux obligatoire dans l’agent

```
HTTP Request
↓
Detection Engine
↓
Redaction Engine
↓
Local Redaction Audit Log chez le client
↓
Telemetry Buffer
↓
Collector
```

Si la redaction échoue :

```
Redaction failed
↓
Event dropped
↓
Local audit log écrit : redaction_failed_event_dropped
↓
Rien n’est envoyé au collector
```

---

## Règles de sécurité du local audit log

```
- Le fichier reste chez le client.
- Il n’est pas envoyé au collector par défaut.
- Il ne contient jamais de données sensibles brutes.
- Il contient uniquement des métadonnées d’audit.
- Il doit supporter la rotation.
- Il doit avoir un chemin configurable.
- Si le fichier audit est indisponible, l’agent ne doit pas faire tomber l’app.
- Si l’agent ne peut pas garantir la redaction, l’event ne part pas.
```

---

# 8. Variables d’environnement

## `rasp-platform/.env.example`

```
DATABASE_URL="postgresql://postgres:postgres@localhost:5432/rasp_platform"
NEXTAUTH_SECRET="change-me"
NEXTAUTH_URL="http://localhost:3000"
COLLECTOR_INTERNAL_URL="http://localhost:4000"
```

---

## `rasp-collector/.env.example`

```
PORT=4000
DATABASE_URL="postgresql://postgres:postgres@localhost:5432/rasp_platform"
REDIS_URL="redis://localhost:6379"
MAX_EVENT_SIZE_BYTES=65536
RATE_LIMIT_PER_MINUTE=600
HMAC_REQUIRED=true
```

---

## `rasp-agent-node/.env.example`

```
RASP_PROJECT_ID="project_123"
RASP_AGENT_ID="agent_node_001"
RASP_API_KEY="rasp_xxxxxxxxx"
RASP_COLLECTOR_URL="http://localhost:4000"
RASP_MODE="monitor"
RASP_AUDIT_LOG_PATH=".rasp/audit/redaction-audit.log"
RASP_AUDIT_ROTATION_DAYS=7
RASP_FAIL_OPEN=true
```

---

# 9. API du collector

## `GET /health`

Réponse :

```json
{
  "status": "ok",
  "service": "rasp-collector",
  "timestamp": "2026-05-26T18:30:00.000Z"
}
```

---

## `POST /v1/events`

Headers :

```
Authorization: Bearer rasp_xxxxxxxxx
X-RASP-Signature: hmac-sha256-signature
X-RASP-Agent-ID: agent_node_001
```

Payload :

```json
{
  "projectId": "project_123",
  "agentId": "agent_node_001",
  "agentVersion": "0.1.0",
  "runtime": "node",
  "framework": "express",
  "eventType": "sql_injection",
  "severity": "high",
  "action": "monitor",
  "method": "GET",
  "path": "/api/users/:id",
  "sourceIp": "hashed-ip",
  "timestamp": "2026-05-26T18:30:00.000Z",
  "metadata": {
    "redacted": true,
    "matchedRule": "SQLI_BASIC_001",
    "matchedRules": [
      { "id": "BRUTE_FORCE_001", "eventType": "brute_force", "severity": "medium", "location": "path" },
      { "id": "SQLI_BASIC_001", "eventType": "sql_injection", "severity": "high", "location": "query" }
    ],
    "auditLoggedLocally": true
  }
}
```

Réponse :

```json
{
  "accepted": true,
  "eventId": "evt_123"
}
```

Status attendu :

```
202 Accepted
```

---

## `POST /v1/heartbeat`

Payload :

```json
{
  "projectId": "project_123",
  "agentId": "agent_node_001",
  "agentVersion": "0.1.0",
  "runtime": "node",
  "framework": "express",
  "status": "healthy",
  "mode": "monitor",
  "timestamp": "2026-05-26T18:30:00.000Z"
}
```

Réponse :

```json
{
  "ok": true,
  "killSwitch": false,
  "policyVersion": "policy_001"
}
```

---

# 10. Détections MVP dans l’agent Node.js

## SQL Injection

Détecter :

```
' OR 1=1
" OR "1"="1
UNION SELECT
DROP TABLE
SLEEP(
benchmark(
--
/*
*/
```

Résultat :

```json
{
  "eventType": "sql_injection",
  "severity": "high",
  "matchedRule": "SQLI_BASIC_001"
}
```

---

## Path Traversal

Détecter :

```
../
..\
/etc/passwd
windows/win.ini
%2e%2e%2f
%252e%252e%252f
```

Résultat :

```json
{
  "eventType": "path_traversal",
  "severity": "high",
  "matchedRule": "PATH_TRAVERSAL_001"
}
```

---

## Command Injection

Détecter :

```
;
&&
||
|
`
$(
cat /etc/passwd
curl http
wget http
nc -e
bash -i
```

Résultat :

```json
{
  "eventType": "command_injection",
  "severity": "critical",
  "matchedRule": "CMD_INJECTION_001"
}
```

---

# 11. Modes de fonctionnement agent

## Monitor mode

```
- Détecte
- Redacted
- Écrit audit local
- Envoie event
- Ne bloque pas la requête
```

---

## Block mode

```
- Détecte
- Redacted
- Écrit audit local
- Envoie event
- Bloque la requête suspecte
- Retourne 403
```

---

## Fail-open obligatoire

Si le collector est down :

```
- l’application cliente continue
- l’agent bufferise ou drop selon config
- jamais de crash
```

Règle non négociable :

```
A failed agent must never take down the customer application.
```

Le document insiste fortement sur ce principe pour l’agent lifecycle et le rollback.

---

# 12. API Discovery MVP

Le document demande que l’agent observe les API réellement appelées à runtime : endpoints documentés, non documentés, shadow APIs, zombie APIs, auth status, data sensitivity, schema inference, traffic profile, etc.

Pour 3 jours, tu livres une base :

```
- méthode HTTP
- path normalisé
- framework
- auth détectée ou unknown
- sensitive data true/false
- firstSeenAt
- lastSeenAt
- trafficCount
```

Exemple :

```json
{
  "method": "GET",
  "pathPattern": "/api/users/:id",
  "authStatus": "unknown",
  "hasSensitiveData": true,
  "trafficCount": 12,
  "firstSeenAt": "2026-05-26T18:00:00.000Z",
  "lastSeenAt": "2026-05-26T18:30:00.000Z"
}
```

Dans le dashboard :

```
- Full endpoint catalog
- Method
- Path pattern
- Auth status
- Sensitive data
- Risk score
- First seen
- Last seen
- Traffic count
```

Shadow API detection MVP :

```
- si endpoint observé mais absent d’un OpenAPI spec importé
- alors flag shadow_api = true
```

Zombie API detection MVP :

```
- si endpoint existe mais lastSeenAt > 30 jours
- alors flag zombie_api = true
```

---

# 13. Redaction engine

Le cahier des charges demande le principe **scrub at the source** : les données sensibles doivent être masquées dans l’agent avant toute sortie réseau.

À implémenter dans le MVP :

```
Email address          => SHA-256 hash
Password fields        => [REDACTED]
Token / secret / api_key => [REDACTED]
Authorization header   => [REDACTED]
Credit card pattern    => ****-****-****-LAST4
IP address             => hash ou mask last octet
SQL literal values     => [STRING], [INT], [BOOLEAN]
```

Modes à documenter :

```
Denylist mode  = masque les patterns sensibles connus
Allowlist mode = n’envoie que les champs explicitement autorisés
Metadata-only  = envoie uniquement type, endpoint, severity, timestamp
Local-only     = garde toute la télémétrie chez le client
Selective export = envoie seulement certains types d’events
```

Pour 3 jours :

```
- Denylist mode : à implémenter
- Metadata-only : config simple
- Allowlist mode : documenté
- Local-only : documenté
- Selective export : documenté
```

---

# 14. Platform security à couvrir

Dans le cahier des charges, la sécurité de la plateforme est un gros sujet : agent signing, SBOM, reproducible builds, CI/CD hardening, telemetry security, multi-tenant isolation, audit logs, kill-switch, incident response.

Pour 3 jours, tu fais ceci :

## Implémenté MVP

```
- API key hashée
- HMAC pour payload integrity
- Rate limiting collector
- Payload size limit
- Event redacted obligatoire
- Logs sans body brut
- Audit logs admin côté platform
- Local redaction audit logs côté client
- Fail-open agent
- Kill-switch field dans modèle Agent
```

## Documenté production-grade

```
- mTLS
- certificate pinning
- signed policy distribution
- SBOM CycloneDX/SPDX
- npm provenance
- reproducible builds
- SLSA Level 3
- SHA-pinned GitHub Actions
- no pull_request_target
- dependency quarantine
- HSM-backed signing
- tenant encryption
- immutable audit logs
- emergency out-of-band update
- global kill-switch
```

---

# 15. Agent lifecycle, upgrade et rollback

À mettre dans dashboard + docs.

## Champs dashboard agent

```
- agentId
- project
- language
- framework
- version
- channel
- status
- lastHeartbeatAt
- mode
- killSwitch
```

## Channels

```
stable
early
edge
```

## Versioning

```
Major  = breaking changes
Minor  = new detections / improvements
Patch  = bug fixes / security fixes
```

## Rollback à documenter

```
1. Agent self-rollback
2. Control plane rollback
3. Emergency kill-switch
```

Pour 3 jours :

```
- modèle de données : oui
- page dashboard agent lifecycle : oui simple
- killSwitch dans heartbeat response : oui
- vrai auto-rollback : documenté, pas implémenté
```

---

# 16. Compatibility testing matrix

Le document donne une matrice multi-langage. Pour ton MVP, tu concentres l’implémentation sur Node.js, mais tu documentes les autres.

## Node.js P1

```
Runtime:
- Node 18 LTS
- Node 20 LTS
- Node 22 LTS

Frameworks:
- Express 4
- Express 5
- Fastify 4
- NestJS 10
- Koa 2
- Next.js API Routes 14/15

DB Drivers:
- pg
- mysql2
- mongodb native
- mongoose
- Prisma
- Sequelize
- Knex

HTTP Clients:
- axios
- undici / node-fetch
- got
- superagent
```

## À documenter pour plus tard

```
Python:
- Django
- Flask
- FastAPI
- Celery
- SQLAlchemy

Java:
- Spring Boot
- Spring MVC
- Tomcat
- JDBC
- Hibernate

.NET:
- ASP.NET Core MVC
- Minimal APIs
- SignalR
- Entity Framework Core
- Dapper
```

---

# 17. Roadmap complet en 3 jours

# Jour 1 - Architecture + plateforme Next.js

## Objectif du jour

À la fin du jour 1 :

```
- repos créés
- architecture posée
- dashboard fonctionnel
- backend de gestion Next.js fonctionnel
- base de données prête
- modèles Prisma
- pages principales
- docs initiales
- AGENTS.md initiaux
```

---

## 08h00 – 09h00 : créer les repos

Créer :

```
rasp-platform
rasp-collector
rasp-agent-node
rasp-docs
```

Chaque repo doit contenir :

```
README.md
AGENTS.md
LICENSE
.gitignore
.env.example
```

---

## 09h00 – 10h30 : initialiser `rasp-platform`

Stack :

```
Next.js
TypeScript
TailwindCSS
shadcn/ui
Prisma
PostgreSQL
Auth.js / NextAuth
Zod
```

Pages :

```
/login
/dashboard
/dashboard/projects
/dashboard/agents
/dashboard/events
/dashboard/alerts
/dashboard/api-discovery
/dashboard/redaction-policies
/dashboard/agent-lifecycle
/dashboard/audit-logs
/backoffice
```

---

## 10h30 – 12h30 : Prisma + seed

À faire :

```
- schema Prisma
- migration
- seed demo data
- Organization demo
- Project demo
- Agent demo
- SecurityEvent demo
- DiscoveredEndpoint demo
```

---

## 13h30 – 15h30 : dashboard pages

Pages à livrer :

```
Dashboard Overview
Projects
Agents
Security Events
Alerts
API Discovery
Redaction Policies
Agent Lifecycle
Audit Logs
```

Dashboard overview :

```
- applications protégées
- agents actifs
- alertes ouvertes
- endpoints découverts
- événements récents
- top endpoints attaqués
```

---

## 15h30 – 17h00 : API routes management

Endpoints :

```
GET    /api/projects
POST   /api/projects
GET    /api/agents
GET    /api/events
GET    /api/alerts
PATCH  /api/alerts/:id
GET    /api/api-discovery
GET    /api/redaction-policies
POST   /api/redaction-policies
GET    /api/audit-logs
```

---

## 17h00 – 18h30 : API Discovery + Redaction Policy UI

À afficher :

```
API Discovery:
- method
- path pattern
- auth status
- sensitive data
- risk score
- first seen
- last seen

Redaction Policies:
- mode denylist / allowlist / metadata-only
- custom rules JSON
- environment
```

---

## 20h00 – 23h00 : docs jour 1

Dans `rasp-docs`, créer :

```
01-architecture-overview.md
02-repository-strategy.md
03-data-model.md
04-api-discovery-spec.md
```

---

# Jour 2 - Collector + Agent Node.js + audit local

## Objectif du jour

À la fin du jour 2 :

```
- collector fonctionnel
- agent Node.js fonctionnel
- Express middleware
- détections basiques
- redaction engine
- local redaction audit log
- telemetry buffer
- heartbeat
- exemple Express
```

---

## 08h00 – 09h30 : initialiser `rasp-collector`

Stack :

```
Node.js
TypeScript
Fastify
Zod
Redis
BullMQ
Pino
Vitest
```

Endpoints :

```
GET  /health
POST /v1/events
POST /v1/heartbeat
```

---

## 09h30 – 11h00 : ingestion events

À implémenter :

```
- validation Zod
- API key authentication
- HMAC verification
- payload size limit
- redacted=true obligatoire
- structured logs sans body brut
- 202 Accepted
```

---

## 11h00 – 12h30 : rate limit + queue + heartbeat

À implémenter :

```
- rate limit par API key
- queue Redis / BullMQ
- update agent lastHeartbeatAt
- killSwitch dans response heartbeat
```

---

## 13h30 – 15h00 : initialiser `rasp-agent-node`

Stack :

```
TypeScript
tsup
Vitest
Zod
pino
```

API publique :

```tsx
import { createRaspAgent } from "rasp-agent-node";

const rasp = createRaspAgent({
  apiKey: process.env.RASP_API_KEY,
  projectId: process.env.RASP_PROJECT_ID,
  agentId: process.env.RASP_AGENT_ID,
  collectorUrl: process.env.RASP_COLLECTOR_URL,
  mode: "monitor",
  auditLogPath: process.env.RASP_AUDIT_LOG_PATH,
});

app.use(rasp.express());
```

---

## 15h00 – 16h30 : middleware + detectors

À créer :

```
src/middleware/express.ts
src/detectors/sql-injection.detector.ts
src/detectors/path-traversal.detector.ts
src/detectors/command-injection.detector.ts
```

---

## 16h30 – 18h30 : redaction + audit local + transport

À créer :

```
src/redaction/redaction-engine.ts
src/redaction/patterns.ts
src/audit/local-audit-logger.ts
src/audit/audit-rotation.ts
src/transport/collector-client.ts
src/transport/retry-buffer.ts
src/transport/hmac.ts
```

Flux obligatoire :

```
detect attack
↓
build event
↓
redact event
↓
write local redaction audit log
↓
if redaction failed: drop event
↓
send event to collector
```

---

## 20h00 – 21h30 : exemple Express

Dans :

```
rasp-agent-node/examples/express-app
```

Créer :

```
GET /hello
GET /users?id=1 OR 1=1
GET /files?path=../../etc/passwd
GET /ping?host=8.8.8.8;cat /etc/passwd
```

---

## 21h30 – 23h30 : tests agent + collector

Tests prioritaires :

```
- detection SQLi
- detection path traversal
- detection command injection
- redaction email
- redaction password
- local audit log
- collector down fail-open
- collector validates payload
- collector rejects invalid API key
```

---

# Jour 3 - Intégration, tests, docs, livraison

## Objectif du jour

À la fin du jour 3 :

```
- démo complète
- dashboard connecté aux events
- test cases prêts
- GitHub Actions basique
- README complets
- AGENTS.md complets
- docs senior complètes
- delivery note
- backlog clair
```

---

## 08h00 – 10h00 : intégration end-to-end

Flux à faire marcher :

```
Express app cliente
↓
rasp-agent-node
↓
local redaction audit log
↓
rasp-collector
↓
PostgreSQL / queue
↓
rasp-platform dashboard
```

---

## 10h00 – 12h30 : dashboard events + alerts

À faire :

```
- afficher les events réels
- créer alert automatiquement pour high/critical
- filtrer par severity
- filtrer par project
- changer status open → investigating → resolved
```

---

## 13h30 – 15h30 : test cases + GitHub Actions

Créer :

```
.github/workflows/ci.yml
```

Pour chaque repo :

```
- install
- lint
- typecheck
- test
```

Pour `rasp-agent-node`, préparer matrix :

```yaml
strategy:
  matrix:
    node-version: [18, 20, 22]
```

---

## 15h30 – 17h30 : docs finales

Dans `rasp-docs`, créer :

```
01-architecture-overview.md
02-repository-strategy.md
03-data-model.md
04-api-discovery-spec.md
05-data-privacy-redaction.md
06-local-redaction-audit-log.md
07-collector-api-spec.md
08-agent-node-spec.md
09-agent-lifecycle-upgrade-rollback.md
10-compatibility-testing-matrix.md
11-platform-security-architecture.md
12-telemetry-channel-security.md
13-test-plan.md
14-demo-script.md
15-known-limitations-and-roadmap.md
16-delivery-note.md
```

---

## 17h30 – 18h30 : clean README + screenshots

Chaque repo doit avoir :

```
- overview
- architecture
- features
- setup
- env vars
- test commands
- security principles
- known limitations
```

---

## 20h00 – 21h30 : demo script

Scénario :

```
1. Je crée une application dans le dashboard.
2. La plateforme génère une API key.
3. J’installe l’agent Node.js dans une app Express.
4. Je lance le collector.
5. J’envoie une requête normale.
6. Rien de critique n’est remonté.
7. J’envoie une requête SQLi.
8. L’agent détecte l’attaque.
9. L’agent redacted les données sensibles.
10. L’agent écrit un audit log local chez le client.
11. L’agent envoie l’event au collector.
12. Le collector valide API key + HMAC + redacted=true.
13. Le dashboard affiche l’alerte.
14. Je passe une règle en block mode.
15. La prochaine attaque est bloquée.
```

---

## 21h30 – 23h30 : polish final

À faire :

```
- vérifier que tous les README sont propres
- vérifier AGENTS.md
- vérifier docs
- vérifier tests
- vérifier demo
- préparer delivery note
- préparer backlog
```

---

# 18. AGENTS.md complets

## `rasp-platform/AGENTS.md`

```markdown
# AGENTS.md - rasp-platform

This repository contains the RASP management platform.

## Scope

This is a monolithic Next.js application containing:
- dashboard
- backoffice
- authentication
- organization management
- project management
- API key management
- agent inventory
- API discovery inventory
- security events
- alerts
- rules
- redaction policies
- agent lifecycle view
- audit logs

## Architecture Rules

- Use TypeScript everywhere.
- Keep business logic inside `/modules`.
- Keep UI components inside `/components`.
- Do not put database queries directly inside UI components.
- Use Prisma for database access.
- Use Zod for input validation.
- Use server actions or route handlers for backend operations.
- Every sensitive admin action must create an audit log.
- Never store raw agent API keys, only hashes.
- Never expose full secrets in API responses.
- Keep dashboard logic separate from collector logic.

## Security Rules

- Validate all request bodies.
- Enforce authentication on dashboard and backoffice routes.
- Enforce authorization by organization and project.
- Redact secrets in logs.
- Do not store raw sensitive telemetry in the management database.
- Do not expose cross-tenant data.
- Admin actions must be auditable.
```

---

## `rasp-collector/AGENTS.md`

```markdown
# AGENTS.md - rasp-collector

This repository contains the RASP event collector.

## Scope

The collector receives telemetry from RASP agents.

Responsibilities:
- authenticate agents
- validate telemetry payloads
- enforce payload size limits
- verify payload integrity
- apply per-agent and per-tenant rate limits
- normalize events
- enqueue events for asynchronous processing
- persist accepted events
- expose health checks

## Architecture Rules

- Use Fastify and TypeScript.
- Validate all inputs with Zod.
- Never trust agent payloads.
- Keep ingestion fast.
- Return quickly after validation and queueing.
- Do not include dashboard or backoffice logic.
- Do not include UI code.
- Do not perform heavy analytics in request handlers.
- Use structured logs.
- Never log raw request bodies.

## Security Rules

- Reject unsigned or invalid payloads when HMAC is required.
- Enforce rate limiting.
- Reject events that are not marked as redacted.
- Reject oversized payloads.
- Never log raw secrets.
- Never store raw API keys.
- Fail safely under overload.
- Return 202 for accepted events.
```

---

## `rasp-agent-node/AGENTS.md`

```markdown
# AGENTS.md - rasp-agent-node

This repository contains the Node.js RASP agent.

## Scope

The agent is installed inside customer applications.

Responsibilities:
- observe HTTP requests
- detect suspicious runtime behavior
- detect API endpoints at runtime
- redact sensitive data before telemetry leaves the application
- write local redaction audit logs inside the customer environment
- support monitor and block modes
- send security events to the collector
- send heartbeat events
- avoid crashing the host application

## Architecture Rules

- Keep the package lightweight.
- Avoid heavy dependencies.
- Never crash the host application.
- Fail open by default if the collector is unavailable.
- Do not log sensitive data by default.
- All telemetry must pass through the redaction engine before buffering.
- If redaction fails, drop the event.
- Provide Express, Fastify, and NestJS integrations.
- Keep detectors isolated and testable.
- Keep transport logic separate from detection logic.

## Local Redaction Audit Log

Every redaction action must be logged locally inside the customer environment.

Rules:
- Redaction audit logs are written locally by the agent.
- Redaction audit logs are never sent to the collector by default.
- Audit logs must never contain raw sensitive values.
- Audit logs must only contain metadata about the redaction action.
- If redaction fails, the event must be dropped and the failure must be logged locally.
- The local audit log path must be configurable.
- Log rotation must be supported to avoid filling customer disks.
- If audit logging fails, the host application must continue running.

## Security Rules

- Do not send raw passwords, tokens, API keys, or authorization headers.
- Do not send raw request bodies by default.
- Do not perform arbitrary outbound network calls.
- Only communicate with the configured collector URL.
- Monitor mode is the default.
- Block mode must be explicitly enabled.
- The agent must fail open by default.
```

---

## `rasp-docs/AGENTS.md`

```markdown
# AGENTS.md - rasp-docs

This repository contains the technical documentation for the RASP platform.

## Scope

Documentation must cover:
- architecture
- repository strategy
- data model
- API discovery
- data privacy and redaction
- local redaction audit logging
- collector API
- Node.js agent specification
- agent lifecycle
- upgrade and rollback strategy
- compatibility testing matrix
- platform security architecture
- telemetry channel security
- test plan
- demo script
- known limitations and roadmap

## Writing Rules

- Be precise and technical.
- Separate MVP implementation from production-grade roadmap.
- Document security assumptions clearly.
- Do not claim advanced features are implemented if they are only planned.
- Use diagrams or text flows when helpful.
- Keep every document readable for engineering reviewers.
```

---

# 19. README courts à mettre

## `rasp-platform/README.md`

```markdown
# RASP Platform

RASP Platform is the management control plane for an AI-native Runtime Application Self-Protection system.

## Features

- Dashboard and backoffice
- Organization and project management
- Agent inventory
- API key management
- Security events and alerts
- Runtime API discovery inventory
- Redaction policy management
- Agent lifecycle overview
- Audit logs

## Architecture

This repository is a Next.js monolith containing the dashboard, backoffice, and management APIs.

The event collector and runtime agents are intentionally separated because they have different scalability, security, and runtime requirements.

## Getting Started

1. Copy `.env.example` to `.env`
2. Start PostgreSQL with Docker Compose
3. Run Prisma migrations
4. Start the development server

## Security Principles

- No raw API keys are stored.
- Sensitive telemetry is expected to be redacted before ingestion.
- Admin actions are audited.
- Access is scoped by organization and project.
```

---

## `rasp-collector/README.md`

```markdown
# RASP Collector

RASP Collector is the ingestion service that receives runtime security telemetry from RASP agents.

## Features

- Agent authentication
- Event validation
- HMAC payload integrity verification
- Rate limiting
- Queue-based ingestion
- Heartbeat endpoint
- Structured logging
- Health check endpoint

## Endpoints

- `GET /health`
- `POST /v1/events`
- `POST /v1/heartbeat`

## Security

The collector never trusts agent payloads. All events must be validated, authenticated, rate-limited, integrity-checked, and marked as redacted before processing.
```

---

## `rasp-agent-node/README.md`

```markdown
# RASP Agent Node.js

Node.js RASP agent for detecting suspicious runtime behavior inside customer applications.

## Supported Integrations

- Express
- Fastify
- NestJS

## Features

- SQL injection detection
- Path traversal detection
- Command injection pattern detection
- Runtime API discovery foundation
- Monitor mode
- Block mode
- Agent-side redaction
- Local redaction audit log
- Telemetry buffering
- Collector transport
- Heartbeat

## Example

```ts
import { createRaspAgent } from "rasp-agent-node";

const rasp = createRaspAgent({
  apiKey: process.env.RASP_API_KEY,
  projectId: process.env.RASP_PROJECT_ID,
  agentId: process.env.RASP_AGENT_ID,
  collectorUrl: process.env.RASP_COLLECTOR_URL,
  mode: "monitor",
  auditLogPath: process.env.RASP_AUDIT_LOG_PATH
});

app.use(rasp.express());
```

## Safety Principle

The agent must never crash the host application. If the collector is unavailable, the agent fails open by default.

## Local Redaction Audit

Every redaction action is logged locally in the customer environment. These logs never contain raw sensitive values and are not sent to the collector by default.

```

---

# 20. Test cases complets

## A. Agent Node.js

| ID | Cas de test | Entrée | Résultat attendu |
|---|---|---|---|
| AG-001 | SQLi basique | `/users?id=1 OR 1=1` | Event `sql_injection` |
| AG-002 | Union select | `/search?q=UNION SELECT password` | Event high severity |
| AG-003 | Path traversal | `/file?path=../../etc/passwd` | Event `path_traversal` |
| AG-004 | Command injection | `/ping?host=8.8.8.8;cat /etc/passwd` | Event `command_injection` |
| AG-005 | Redaction email | `john@example.com` | Email hashé |
| AG-006 | Redaction password | `{password:"secret"}` | `[REDACTED]` |
| AG-007 | Redaction token | Authorization header | `[REDACTED]` |
| AG-008 | Collector down | collector inaccessible | App continue |
| AG-009 | Monitor mode | attaque détectée | requête non bloquée |
| AG-010 | Block mode | attaque détectée | réponse 403 |
| AG-011 | Audit local email | email redacted | ligne audit locale écrite |
| AG-012 | Audit local token | token redacted | ligne audit locale écrite |
| AG-013 | Pas de raw value | audit log | aucune valeur brute |
| AG-014 | Redaction failure | erreur redaction | event dropped |
| AG-015 | Redaction failure audit | erreur redaction | `event_dropped` loggé localement |
| AG-016 | Audit file unavailable | permission denied | app continue |
| AG-017 | Custom audit path | `RASP_AUDIT_LOG_PATH` | fichier créé au bon endroit |
| AG-018 | Log rotation | taille/date dépassée | rotation appliquée |
| AG-019 | Heartbeat | agent running | heartbeat envoyé |
| AG-020 | API discovery | route appelée | endpoint observé |

---

## B. Collector

| ID | Cas de test | Entrée | Résultat attendu |
|---|---|---|---|
| CO-001 | Event valide | payload complet | 202 Accepted |
| CO-002 | API key absente | pas d’Authorization | 401 |
| CO-003 | API key invalide | mauvaise clé | 401 |
| CO-004 | Payload invalide | champ manquant | 400 |
| CO-005 | Payload trop gros | body énorme | 413 |
| CO-006 | Event non redacted | `redacted:false` | 422 |
| CO-007 | HMAC invalide | signature incorrecte | 401 |
| CO-008 | Rate limit | trop d’events | 429 |
| CO-009 | Heartbeat valide | agent info | 200 |
| CO-010 | Queue failure | Redis down | 503 ou fallback |
| CO-011 | Raw body logging | request sensible | body non loggé |
| CO-012 | Unknown agent | agentId inconnu | 401 ou 403 |
| CO-013 | Kill-switch response | agent désactivé | `killSwitch:true` |
| CO-014 | Endpoint discovery event | payload discovery | endpoint persisté |

---

## C. Platform

| ID | Cas de test | Action | Résultat attendu |
|---|---|---|---|
| PF-001 | Créer projet | submit form | projet créé |
| PF-002 | Générer API key | click generate | clé affichée une seule fois |
| PF-003 | Lister agents | page agents | agents affichés |
| PF-004 | Voir events | page events | events affichés |
| PF-005 | Filtrer alertes | severity high | seulement high |
| PF-006 | Changer statut | open → resolved | statut modifié |
| PF-007 | API discovery | endpoint reçu | endpoint listé |
| PF-008 | Redaction policy | create policy | policy sauvegardée |
| PF-009 | Audit log | action admin | log créé |
| PF-010 | Accès non autorisé | autre org | accès refusé |
| PF-011 | Agent lifecycle | page agent | version/channel/status affichés |
| PF-012 | Kill-switch | toggle admin | flag mis à jour |
| PF-013 | Shadow API | endpoint absent spec | flag shadow |
| PF-014 | Zombie API | lastSeen > 30 jours | flag zombie |

---

## D. Sécurité

| ID | Cas de test | Résultat attendu |
|---|---|
| SEC-001 | Raw password dans payload | refus ou redaction |
| SEC-002 | API key stockée | jamais en clair |
| SEC-003 | Logs collector | pas de body sensible |
| SEC-004 | HMAC incorrect | rejet |
| SEC-005 | Admin action | audit log créé |
| SEC-006 | Agent crash interne | app cliente continue |
| SEC-007 | Collector indisponible | agent fail open |
| SEC-008 | Block mode désactivé | aucune requête légitime bloquée |
| SEC-009 | Audit local contient raw email | test échoue |
| SEC-010 | Event non redacted envoyé | collector refuse |
| SEC-011 | Payload oversized | collector refuse |
| SEC-012 | Rate limit abuse | collector limite |

---

# 21. Checklist des spécifications du cahier des charges

| Exigence | Traitement MVP 3 jours |
|---|---|
| Dashboard | Implémenté |
| Backoffice | Implémenté simple |
| Backend de gestion | Implémenté dans Next.js |
| Collector | Implémenté séparément |
| Agent Node.js | Implémenté |
| API Discovery | Implémenté basique |
| Shadow API detection | Basique ou simulé |
| Zombie API detection | Basique via `lastSeenAt` |
| BOLA / IDOR | Documenté, backlog |
| Redaction côté agent | Implémenté |
| Audit local redaction chez client | Implémenté |
| Denylist mode | Implémenté |
| Allowlist mode | Documenté |
| Metadata-only mode | Config simple ou documenté |
| Local-only mode | Documenté |
| Selective export | Documenté |
| HMAC | Implémenté |
| Rate limiting | Implémenté |
| Payload size limit | Implémenté |
| Heartbeat | Implémenté |
| Kill-switch | Partiel : heartbeat + flag |
| Agent lifecycle | Dashboard + docs |
| Rollback | Documenté |
| Compatibility matrix | Documenté |
| CI matrix Node.js | Préparé |
| Platform security | Documenté + quelques contrôles |
| SBOM/signing | Documenté backlog |
| mTLS/cert pinning | Documenté backlog |
| Audit logs platform | Implémenté simple |
| Fail-open agent | Implémenté |
| No raw logs | Implémenté comme règle + tests |

---

# 22. Delivery note finale

```md
# Delivery Note

This delivery implements a functional MVP of the AI-native RASP platform with:

- Next.js management platform
- dashboard and backoffice
- management APIs
- dedicated event collector
- Node.js RASP agent
- Express integration
- basic SQL injection detection
- basic path traversal detection
- basic command injection detection
- agent-side redaction
- local redaction audit logs inside the customer environment
- event ingestion
- HMAC payload integrity
- rate limiting
- dashboard visualization
- API discovery inventory foundation
- agent heartbeat
- agent lifecycle view
- test plan
- compatibility testing strategy
- platform security architecture documentation

Advanced enterprise features are intentionally documented but not fully implemented in the 3-day MVP, including:

- full BOLA/IDOR taint tracking
- mTLS and certificate pinning
- signed policy distribution
- full canary upgrade system
- automatic agent self-rollback
- SBOM publication
- reproducible builds
- HSM-backed signing
- multi-language agents for Python, Java, and .NET
- full multi-tenant cryptographic isolation
```

---

# 23. Priorité absolue pour ta livraison

Ton ordre de priorité doit être :

```
1. Architecture propre
2. Démo end-to-end fonctionnelle
3. Agent Node.js qui détecte
4. Redaction côté agent
5. Audit local de redaction chez le client
6. Collector qui valide et accepte les events
7. Dashboard qui affiche events, alerts, agents, endpoints
8. Docs senior
9. Tests essentiels
10. Backlog clair
```

Le point très important : **l’audit local des redactions doit être visible dans la démo ou dans les tests**.

Dans ta démo, tu dois pouvoir montrer :

```
cat .rasp/audit/redaction-audit.log
```

Et prouver que :

```
- une redaction a eu lieu
- elle est auditée localement
- aucune donnée sensible brute n’est présente
- l’event envoyé au collector est déjà redacted
```

C’est un détail qui montre vraiment que tu as compris la partie privacy/security du cahier des charges.