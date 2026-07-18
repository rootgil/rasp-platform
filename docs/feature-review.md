# Review CTO — Améliorations & Sécurité RASP

> **Date :** 16 juillet 2026  
> **Périmètre :** `rasp-platform`, `rasp-collector`, `rasp-agent-node`  
> **Objectif :** Document unique pour le CTO — points d’amélioration, live events, maturité prod, review sécurité ultra plateforme.

---

## Sommaire

1. [Verdict global](#1-verdict-global)
2. [État des trois composants](#2-état-des-trois-composants)
3. [Axes d’amélioration consolidés](#3-axes-damélioration-consolidés)
4. [Polling vs Socket — live security events](#4-polling-vs-socket--live-security-events)
5. [Queue — collector](#5-queue--collector)
6. [Dev & Prod — Docker Compose & documentation](#6-dev--prod--docker-compose--documentation)
7. [UX / config — Error pages & mails](#7-ux--config--error-pages--mails)
8. [Review sécurité ultra — plateforme](#8-review-sécurité-ultra--plateforme)
9. [Roadmap P0 / P1 / P2](#9-roadmap-p0--p1--p2)
10. [Pitch CTO (30 secondes)](#10-pitch-cto-30-secondes)
11. [Annexes — fichiers clés](#11-annexes--fichiers-clés)

---

## 1. Verdict global

Le produit a déjà une **bonne base produit et sécurité** :

- Console RASP riche (dashboard + backoffice)
- Collector Fastify avec auth API key, Zod, HMAC optionnel
- Agent Node fail-open, redaction-first, intégrations Express / Fastify / NestJS

Ce qui manque pour un **pilote entreprise / régulé** :

| Domaine | État |
|---------|------|
| Maturité engineering (tests, CI build, obs) | Faible → moyen |
| Contrôles d’accès (RBAC, MFA login, rate-limit) | Partiel |
| Live events (temps réel) | Polling 30s uniquement |
| Ingestion scale (queue, idempotency) | Absente |
| Alignement claims pricing vs code | Écart |
| Docs / compose Dev vs Prod | À formaliser |

**Synthèse :** démo crédible → **pas encore prêt** pour un déploiement production régulé sans passer les P0.

---

## 2. État des trois composants

### 2.1 rasp-platform (contrôle plane)

| Signal | Évaluation |
|--------|------------|
| Features | Fortes (events, alerts, agents, API discovery, rules, redaction, BYOK, kill-switch, canary, audit hash-chain, break-glass) |
| Tests | Très faibles (~1 fichier Vitest) |
| CI | Lint / typecheck / test — **pas de `pnpm build`**, pas d’audit deps |
| Observabilité | Health minimal, pas d’OTel / Prometheus / Sentry |
| Architecture vs `AGENTS.md` | Partielle — beaucoup de Prisma direct dans les pages UI |
| Docs | Bonnes (`README`, `OPERATIONS`, `DEPLOY`) mais roadmap parfois stale |

### 2.2 rasp-collector (data plane)

| Signal | Évaluation |
|--------|------------|
| Auth / validation | Solide (Bearer bcrypt, Zod, HMAC, redaction gate, rate-limit) |
| Tests | 21 unit tests mockés — **pas d’intégration Postgres** |
| Ingestion | **Synchrone** avant le `202` — pas de queue |
| Scale | Rate-limit / volume monitor **in-memory** (casse en multi-réplica) |
| Roadmap README | Redis / BullMQ / Prometheus déjà identifiés |

### 2.3 rasp-agent-node

| Signal | Évaluation |
|--------|------------|
| Architecture | Solide (fail-open, redaction, audit local) |
| CI / publish | Fort (SBOM, builds reproductibles, publish gated) |
| Détection par défaut | **Gap critique** : `createDefaultDetectors()` → `[]` |
| Fastify | Body souvent invisible (`onRequest` avant parse) |
| Docs | Détaillées mais stale (versions, CI GitHub vs GitLab) |

---

## 3. Axes d’amélioration consolidés

Liste de tout ce qui a été identifié dans cette review (produit + tech + sécu).

| # | Axe | Composant | Priorité |
|---|-----|-----------|----------|
| A1 | Review sécurité structurée (Infra / Deps / Métier / Failles) | Platform | P0 |
| A2 | Secrets auth forts + refuse boot si template | Platform | P0 |
| A3 | Redacter `hmacSecret` des API agents | Platform | P0 |
| A4 | Rate limiting (login, MFA, reset, break-glass) | Platform | P0 |
| A5 | TLS reverse-proxy (ne pas exposer 3000/4000 nus) | Infra | P0 |
| A6 | Queue async + DLQ ingestion | Collector | P0 |
| A7 | Idempotency events | Collector | P0 |
| A8 | Détection agent out-of-the-box | Agent | P0 |
| A9 | Tests + `pnpm build` en CI | Platform | P0 |
| A10 | **Polling vs SSE** pour live security events | Platform | P1 |
| A11 | RBAC `owner` / `member` sur actions destructrices | Platform | P1 |
| A12 | MFA au login | Platform | P1 |
| A13 | Docker-compose + docs **Dev vs Prod** | All | P1 |
| A14 | Error pages brandées | Platform | P1 |
| A15 | Fix localhost dans les mails | Platform | P1 |
| A16 | Transaction event + alert | Collector | P1 |
| A17 | Observabilité (Prometheus / OTel) | Platform + Collector | P1 |
| A18 | Fastify body + audit log tests | Agent | P1 |
| A19 | Refactor UI → `/modules` | Platform | P1 |
| A20 | Claims pricing (SSO, Slack, plan limits, rétention auto) | Platform | P2 |
| A21 | Perf dashboard (N+1, pagination, pool Prisma) | Platform | P2 |
| A22 | Anti-ReDoS rules custom | Platform + Agent | P2 |

---

## 4. Polling vs Socket — live security events

> **Clarification importante :** il ne s’agit **pas** du connection pooling Neon / PostgreSQL.  
> Il s’agit du **chargement en live des security events** (et alerts) sur le dashboard.

### 4.1 État actuel

Mécanisme unique : composant `AutoRefresh` → `router.refresh()` toutes les **30 secondes**.

- Re-exécute les Server Components
- Re-query Prisma (page entière)
- **Aucun** WebSocket / SSE / EventSource / socket.io

| Page | Live ? |
|------|--------|
| `/dashboard` (overview) | Oui — `AutoRefresh` 30s |
| `/dashboard/events` | Oui — `AutoRefresh` 30s |
| `/dashboard/alerts` | Oui — `AutoRefresh` 30s |
| `/dashboard/events/[id]` | Non |
| Topbar notifications | `setInterval` 30s (APIs séparées) |

Les listes dashboard **ne passent pas** par `GET /api/events` : Prisma direct dans les RSC.

### 4.2 Comparatif

| Option | Latence | Coût DB | Infra | Complexité | Adapté à |
|--------|---------|---------|-------|------------|----------|
| **Polling actuel** (`router.refresh` 30s) | ≤ 30s | Élevé (full page) | Aucune | Faible | MVP / SOC périodique |
| **Polling API ciblé** (fetch table seule) | Configurable | Moyen | Aucune | Faible | Court terme |
| **SSE** (recommandé) | Quasi temps réel | Faible (push) | Léger | Moyen | Events / alerts one-way |
| **WebSocket** | Temps réel | Faible | Plus lourd | Élevé | Bidirectionnel (inutile ici) |

### 4.3 Recommandation

1. **Court terme :** garder `AutoRefresh`, ajuster l’intervalle (ex. 10s events, 60s overview) ou passer les listes sur `fetch('/api/events')` + polling ciblé.
2. **Moyen terme :** ajouter **SSE** `GET /api/events/stream` (filtrée par `organizationId`) pour events + alerts.
3. **Éviter WebSocket** sauf besoin collab bidirectionnelle.

**Fichiers clés :**

- `components/shared/auto-refresh.tsx`
- `app/(app)/dashboard/events/page.tsx`
- `app/(app)/dashboard/alerts/page.tsx`
- `app/(app)/dashboard/page.tsx`
- `app/api/events/route.ts` (REST existant, peu utilisé par l’UI)

---

## 5. Queue — collector

### Problème

Aujourd’hui le collector :

1. Valide la requête
2. **Attend** la persistence Prisma (`persistEvent`)
3. Puis répond `202`

Conséquences :

- Latence liée à la DB sur le hot path
- Pas de backpressure réelle sous charge
- Pas d’idempotency → retries agent = doublons events/alerts
- Event + Alert = deux writes séparés (pas de `$transaction`)

### Cible

```
Agent → Collector (validate + auth) → Queue (Redis/BullMQ) → Worker → Postgres
                ↓
              202 Accepted (rapide)
                ↓
           DLQ si échec
```

### Livrables

- Queue Redis + BullMQ (ou équivalent)
- DLQ + métriques profondeur de queue
- Clé d’idempotency (`eventId` / header)
- Transaction atomique event + alert
- Rate-limit / volume monitor **distribués** (pas in-memory)

**Réf. :** déjà listé dans `collector/README.md` roadmap.

---

## 6. Dev & Prod — Docker Compose & documentation

### État cible (implémenté)

| Artefact | Dev | Prod |
|----------|-----|------|
| Compose | `docker-compose.yml` — ports 3000/4000 exposés | `docker-compose.prod.yml` — Caddy 80/443, Redis, app/collector en `expose` seulement |
| Reverse-proxy | **Non** (local HTTP) | **Oui** — `deploy/Caddyfile` (TLS Let's Encrypt) |
| Env | `.env.example` (REQUIRED/OPTIONAL) | `.env.production.example` + `collector/.env.production.example` |
| Firewall | N/A | `ufw allow 80/443` uniquement — **jamais** 3000/4000 publics |
| CORS | `CORS_ALLOWED_ORIGINS` | Même var, origines HTTPS |
| Mails | fallback localhost OK en dev | `NEXT_PUBLIC_APP_URL` obligatoire ; boot refuse localhost |

---

## 7. UX / config — Error pages & mails

### 7.1 Error pages

**Gap :** pas de `error.tsx` / `global-error.tsx` / `not-found` produit → pages Next génériques.

**À faire :**

- `app/error.tsx` — erreur brandée, message safe (pas de stack en prod)
- `app/global-error.tsx` — fallback root
- `app/not-found.tsx` — 404 brandée
- Logging côté serveur sans fuite de secrets

### 7.2 Localhost dans les mails

**Preuve :** `lib/email.ts`

```ts
const APP_URL = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";
```

Impact : invites / reset password pointent vers **localhost** si la var est absente en prod.

**Fix :**

- En prod : fail fast si `NEXT_PUBLIC_APP_URL` manquante ou contient `localhost`
- Documenter dans `.env.production.example` et `DEPLOY.md`

---

## 8. Review sécurité ultra — plateforme

Périmètre : totalité de `rasp-platform` (`app/api/**`, `lib/**`, `modules/**`, `proxy.ts`, `next.config.ts`, Docker, docs).

### 8.1 Infra

| Point | Statut | Détail |
|-------|--------|--------|
| TLS terminaison | Risque | `DEPLOY.md` ouvre 3000/4000 sans reverse-proxy TLS |
| Headers sécu | Absent | Pas de CSP, HSTS, X-Frame-Options, etc. |
| CORS | Fragile | Origines hardcodées + IP prod dans `next.config.ts` + `Allow-Credentials: true` |
| Middleware | Gap | `proxy.ts` protège `/dashboard` et `/backoffice` — **pas** `/api/*` |
| `/docs` + OpenAPI | Public | Cartographie complète des endpoints sensibles |
| Swagger CDN | Risque | `unpkg.com` sans SRI + `withCredentials` |
| TLS Postgres | Faible | `rejectUnauthorized: false` dans `lib/prisma.ts` |
| SSRF | Faible | Peu de surface `fetch` pilotée utilisateur |

### 8.2 Deps

| Dépendance | Risque |
|------------|--------|
| `next-auth@5.0.0-beta.31` | Auth critique en **bêta** |
| Pas de rate-limit lib | Brute-force possible |
| Pas de `pnpm audit` en CI | Supply-chain non surveillée |
| `resend` inutilisé | Surface inutile |
| bcrypt rounds 10 vs 12 | Incohérent selon le type de secret |

### 8.3 Métier (autorisation)

| Contrôle | Évaluation |
|----------|------------|
| Isolation multi-tenant | **Bonne** — scoping org quasi systématique |
| RBAC `owner` / `member` | **Lacune majeure** — schéma présent, presque jamais appliqué |
| MFA | **Pas au login** — gate ponctuel sur 3 actions backoffice seulement |
| Dual-auth / approvals | Bien conçu — crypto-shred tenant peut encore bypasser |
| Break-glass | Bien conçu — dépend de `AUTH_SECRET` |
| Audit logs hash-chain | Bon anti-tampering append-only |
| Invite / reset password | Tokens one-time hashés — bon ; rate-limit manquant |

**Impact RBAC :** un `member` peut potentiellement supprimer un projet, purge + crypto-shred, kill-switch agent, gérer API keys / policies.

### 8.4 Failles concrètes

#### Critique

| ID | Finding | Preuve | Impact | Fix |
|----|---------|--------|--------|-----|
| **F1** | `AUTH_SECRET` / `NEXTAUTH_SECRET` faible ou template | `.env.example`, JWT session + break-glass HS256 partagé | Forge de session admin / break-glass | Secrets forts uniques ; refuse boot si valeur template ; secrets distincts session vs break-glass |

#### Élevé

| ID | Finding | Preuve | Impact | Fix |
|----|---------|--------|--------|-----|
| **F2** | Fuite `hmacSecret` agent | `modules/agents/agents.server.ts` — pas de `select` ; exposé via `GET /api/agents` | Forge télémétrie « intègre » | Exclure `hmacSecret` ; one-time à la création |
| **F3** | RBAC non appliqué | Quasi toutes les routes tenant | Member = owner sur actions destructrices | `requireRole(..., ["owner"])` |
| **F4** | MFA non vérifié au login | `lib/auth.ts` `authorize()` | Mot de passe volé = accès complet | Challenge TOTP si `mfaEnabled` |
| **F5** | Aucun rate limiting | Repo entier | Brute-force login / TOTP / spam | Rate-limit IP + compte |

#### Moyen

| ID | Finding | Preuve | Fix |
|----|---------|--------|-----|
| **F6** | Déploiement sans TLS documenté | `DEPLOY.md` | Reverse-proxy TLS obligatoire |
| **F7** | TLS DB désactivé | `lib/prisma.ts` | `rejectUnauthorized: true` / verify-full |
| **F8** | CORS + IP hardcodée | `next.config.ts` | Allow-list via env |
| **F9** | Docs / OpenAPI publics | `proxy.ts`, `app/api/openapi` | Auth admin ou désactiver en prod |
| **F10** | CDN Swagger sans SRI | `app/docs/page.tsx` | Vendoriser + SRI ; retirer `withCredentials` |
| **F11** | Open redirect `callbackUrl` | `login/page.tsx` | Accepter uniquement chemins relatifs `/...` |
| **F12** | ReDoS règles custom | `pattern-normalize.ts` | Limite taille + analyse anti-ReDoS |
| **F13** | NextAuth bêta | `package.json` | Figer + plan GA ; audit CI |

#### Faible

| ID | Finding | Fix |
|----|---------|-----|
| **F14** | bcrypt rounds incohérents | Harmoniser à 12+ |
| **F15** | Fallback localhost mails | Fail si URL prod absente |
| **F16** | Pas d’error pages | Ajouter `error.tsx` / `not-found.tsx` |
| **F17** | Dep `resend` inutilisée | Retirer |
| **F18** | Message seed confus | Ne pas logger de faux mots de passe |

---

## 9. Roadmap P0 / P1 / P2

### P0 — Avant pilote / exposition prod

| # | Action | Owner suggéré |
|---|--------|----------------|
| 1 | Secrets auth forts + guard au boot (F1) | Platform |
| 2 | Redacter `hmacSecret` (F2) | Platform |
| 3 | Rate limiting auth / MFA / reset / break-glass (F5) | Platform |
| 4 | Reverse-proxy TLS documenté et imposé (F6) | Infra |
| 5 | Queue collector + transaction event/alert | Collector |
| 6 | Idempotency events | Collector |
| 7 | Restateurs agent par défaut (ou policy bootstrap) | Agent |
| 8 | Tests API critiques + `pnpm build` CI | Platform |

### P1 — Hardening 30–60 jours

| # | Action |
|---|--------|
| 9 | RBAC owner sur actions destructrices (F3) |
| 10 | MFA au login (F4) |
| 11 | Décision + POC **SSE vs polling** live events |
| 12 | Docker-compose + docs Dev vs Prod |
| 13 | Error pages + fix localhost mails |
| 14 | Protéger `/docs`, CORS env, TLS DB verify |
| 15 | Observabilité Prometheus / OTel |
| 16 | Fastify body + tests audit log agent |
| 17 | Refactor pages dashboard → `/modules` |

### P2 — Produit & dette

| # | Action |
|---|--------|
| 18 | Plan limits / SSO / Slack / rétention auto (ou retirer des claims pricing) |
| 19 | Perf dashboard (N+1, pagination) |
| 20 | Anti-ReDoS + callbackUrl strict |
| 21 | Sortie NextAuth bêta + audit deps CI |
| 22 | Aligner docs agent (versions, LICENSE, CI) |

---

## 10. Pitch CTO (30 secondes)

> On a un contrôle plane et un pipeline agent→collector déjà riches. Pour passer de « démo crédible » à « pilote régulé », je propose :
>
> 1. **Fermer les P0 sécu** (secrets JWT, fuite HMAC, rate-limit, TLS)
> 2. **Fiabiliser le data plane** (queue + idempotency collector ; détection agent par défaut)
> 3. **Évaluer polling vs SSE** pour le live des security events (pas Neon)
> 4. **Séparer Dev/Prod** (compose + docs) et corriger error pages / mails localhost
>
> Une security review ultra (Infra / Deps / Métier / Failles) est documentée avec une roadmap claire.

---

## 11. Annexes — fichiers clés

### Platform

| Sujet | Chemin |
|-------|--------|
| Live refresh | `components/shared/auto-refresh.tsx` |
| Events UI | `app/(app)/dashboard/events/page.tsx` |
| Auth middleware | `proxy.ts` |
| Auth credentials | `lib/auth.ts` |
| Helpers auth / audit | `lib/auth-helpers.ts` |
| Emails | `lib/email.ts` |
| Prisma / TLS | `lib/prisma.ts` |
| CORS | `next.config.ts` |
| Agents API (hmac) | `modules/agents/agents.server.ts` |
| Crypto shred | `lib/envelope.ts`, `app/api/projects/[id]/purge/route.ts` |
| Compose | `docker-compose.yml` |
| Deploy | `DEPLOY.md`, `OPERATIONS.md` |

### Collector

| Sujet | Chemin |
|-------|--------|
| Ingestion sync | `src/routes/events.route.ts` |
| Persist event/alert | `src/modules/ingestion/persist-event.ts` |
| Rate-limit | `src/app.ts` |
| Roadmap queue | `README.md` |

### Agent

| Sujet | Chemin |
|-------|--------|
| Detectors vides | `src/detectors/index.ts` (`createDefaultDetectors`) |
| Fastify hook | `src/integrations/fastify.ts` |
| Audit log local | `src/redaction/audit-log.ts` |

---

## Historique de ce document

| Version | Date | Contenu |
|---------|------|---------|
| 1.0 | 2026-07-16 | Consolidation chat : améliorations écosystème + polling/SSE live events + queue + Dev/Prod + error/mails + security review ultra plateforme |

---

*Document interne — à utiliser pour priorisation sprint et discussions CTO. Ne pas exposer les secrets réels ; faire tourner immédiatement tout secret de template encore en place.*
