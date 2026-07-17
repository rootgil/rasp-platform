# Déploiement VPS (production)

Stack : **Caddy** (TLS :80/:443) → **rasp** (Next.js interne :3000) + **collector** (Fastify interne :4000) + **Redis** + **Neon** (Postgres externe).

> **Ne jamais exposer les ports 3000 et 4000 sur Internet.** Seuls 80 et 443 sont publics.

---

## 1. Prérequis : installer Docker sur le VPS (Ubuntu/Debian)

```bash
curl -fsSL https://get.docker.com | sh
sudo usermod -aG docker $USER && newgrp docker
docker compose version   # doit afficher v2.x
```

---

## 2. Cloner les repos côte à côte

```bash
mkdir -p ~/app && cd ~/app
git clone git@github.com:<toi>/rasp.git
git clone git@github.com:<toi>/collector.git
```

Structure attendue :

```
~/app/
├── rasp/
└── collector/
```

---

## 3. Générer les secrets

```bash
# AUTH_SECRET et NEXTAUTH_SECRET (deux valeurs distinctes et fortes)
openssl rand -base64 32
openssl rand -base64 32

# KEK_MASTER_KEY - doit être IDENTIQUE dans rasp et collector
openssl rand -base64 32

# HMAC_SECRET pour collector (si HMAC_REQUIRED=true)
openssl rand -base64 32
```

Les valeurs template (`change-me`, etc.) sont **rejetées au boot** en production.

---

## 3b. Générer le keypair Ed25519 pour la signature des policies - une seule fois

> **Ne pas répéter à chaque déploiement.** La même paire est réutilisée sur tous les déploiements suivants. Régénérer invaliderait toutes les policies chez les agents déjà installés.

```bash
cd ~/app/rasp

openssl genpkey -algorithm ed25519 -out policy_signing_private.pem
chmod 600 policy_signing_private.pem

openssl pkey -in policy_signing_private.pem -pubout -out policy_signing_public.pem

echo "POLICY_SIGNING_PRIVATE_KEY=\"$(awk 'NF{printf "%s\\n", $0}' policy_signing_private.pem)\""
echo "POLICY_SIGNING_PUBLIC_KEY=\"$(awk 'NF{printf "%s\\n", $0}' policy_signing_public.pem)\""
```

Copier les deux lignes dans `~/app/rasp/.env.production`.

> **Test uniquement :** la paire de `.env.example` (dev) est pinnée dans l'agent — ne jamais l'utiliser en production réelle.

---

## 4. Créer les fichiers d'environnement

### rasp

```bash
cp ~/app/rasp/.env.production.example ~/app/rasp/.env.production
nano ~/app/rasp/.env.production
```

Voir les annotations `REQUIRED` / `OPTIONAL` dans `.env.production.example`. Variables critiques :

| Variable | Valeur |
|---|---|
| `DATABASE_URL` | URL Neon (`sslmode=require` ou `verify-full`) |
| `AUTH_SECRET` / `NEXTAUTH_SECRET` | secrets forts distincts |
| `NEXTAUTH_URL` / `NEXT_PUBLIC_APP_URL` | `https://rasp.ton-domaine.com` (pas localhost) |
| `CORS_ALLOWED_ORIGINS` | même origine HTTPS |
| `COLLECTOR_INTERNAL_URL` | `http://collector:4000` |
| `KEK_MASTER_KEY` | même valeur que collector |
| `POLICY_SIGNING_*` | paire prod (étape 3b) |
| `DOCS_ENABLED` | `false` |
| `SMTP_*` | requis si invites / reset password |

### collector

```bash
cp ~/app/collector/.env.production.example ~/app/collector/.env
nano ~/app/collector/.env
```

| Variable | Valeur |
|---|---|
| `DATABASE_URL` | même URL Neon que rasp |
| `KEK_MASTER_KEY` | même valeur que rasp |
| `HMAC_REQUIRED` | `true` |
| `QUEUE_ENABLED` | `true` |
| `REDIS_URL` | `redis://redis:6379` |

### Caddyfile

Éditer `~/app/rasp/deploy/Caddyfile` : remplacer `rasp.example.com` / `collector.example.com` par tes domaines. DNS A/AAAA doivent pointer vers le VPS **avant** le premier démarrage (ACME).

---

## 5. Build et démarrage (production)

```bash
cd ~/app/rasp
docker compose -f docker-compose.prod.yml --env-file .env.production build
docker compose -f docker-compose.prod.yml --env-file .env.production up -d
docker compose -f docker-compose.prod.yml logs -f
```

Services : `migrate` → `redis` → `app` + `collector` → `caddy`.

---

## 6. Seed admin - une seule fois après le premier déploiement

```bash
cd ~/app/rasp
docker compose -f docker-compose.prod.yml --env-file .env.production run --rm migrate pnpm db:seed:prod
```

> Ensuite, supprimer `SEED_ADMIN_EMAIL` et `SEED_ADMIN_PASSWORD` de `.env.production`.

---

## 7. Vérifier que tout tourne

```bash
docker compose -f docker-compose.prod.yml ps
# Healthchecks internes (depuis le VPS) :
curl -fsS http://127.0.0.1:80/api/health   # via Caddy → app (si domain local / hosts)
curl -fsS https://rasp.ton-domaine.com/api/health
# Collector via sous-domaine :
curl -fsS https://collector.ton-domaine.com/health
```

Ne pas compter sur `localhost:3000` / `:4000` — ces ports ne sont pas publiés en prod.

---

## 8. Firewall (production)

```bash
sudo ufw allow OpenSSH
sudo ufw allow 80/tcp comment "HTTP ACME + redirect"
sudo ufw allow 443/tcp comment "HTTPS Caddy"
# NE PAS ouvrir 3000 ni 4000
sudo ufw enable
sudo ufw status
```

---

## 9. Mettre à jour (workflow habituel)

```bash
cd ~/app/rasp      && git pull
cd ~/app/collector && git pull
cd ~/app/rasp
docker compose -f docker-compose.prod.yml --env-file .env.production up -d --build
```

---

## Développement local

```bash
# Ports 3000/4000 exposés — pas de Caddy
# Source monté en volume → hot reload (pas besoin de rebuild pour chaque edit)
cp .env.example .env
cp ../collector/.env.example ../collector/.env
docker compose up -d --build
```

Rebuild uniquement après changement de `Dockerfile`, `package.json` / lockfile, ou deps.

---

## Commandes utiles

```bash
docker compose -f docker-compose.prod.yml logs app
docker compose -f docker-compose.prod.yml logs collector
docker compose -f docker-compose.prod.yml logs caddy
docker compose -f docker-compose.prod.yml restart app
docker compose -f docker-compose.prod.yml down
```

---

## Architecture des services (production)

```
Internet → Caddy :80/:443 (TLS)
              ├─ rasp.example.com      → app:3000
              └─ collector.example.com → collector:4000
                                              │
migrate (one-shot) ── prisma migrate deploy ──┤
redis (BullMQ) ←──────────────────────────────┘
                    │
                    └─ Neon PostgreSQL
```
