# Déploiement VPS

Stack : **rasp** (Next.js :3000) + **collector** (Fastify :4000) + **Neon** (Postgres externe).

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
# AUTH_SECRET et NEXTAUTH_SECRET (deux valeurs distinctes)
openssl rand -base64 32
openssl rand -base64 32

# KEK_MASTER_KEY — doit être IDENTIQUE dans rasp et collector
openssl rand -base64 32

# HMAC_SECRET pour collector (si HMAC_REQUIRED=true)
openssl rand -base64 32
```

---

## 3b. Générer le keypair Ed25519 pour la signature des policies — une seule fois

> **Ne pas répéter à chaque déploiement.** La même paire est réutilisée sur tous les déploiements suivants. Régénérer invaliderait toutes les policies chez les agents déjà installés.

```bash
cd ~/app/rasp

# Clé privée — reste sur le VPS uniquement, jamais commitée
openssl genpkey -algorithm ed25519 -out policy_signing_private.pem
chmod 600 policy_signing_private.pem

# Clé publique — non-secrète, à pinner dans le package agent-node
openssl pkey -in policy_signing_private.pem -pubout -out policy_signing_public.pem

# Convertir en une seule ligne pour le fichier .env (échappe les sauts de ligne)
echo "POLICY_SIGNING_PRIVATE_KEY=\"$(awk 'NF{printf "%s\\n", $0}' policy_signing_private.pem)\""
echo "POLICY_SIGNING_PUBLIC_KEY=\"$(awk 'NF{printf "%s\\n", $0}' policy_signing_public.pem)\""
```

Copier les deux lignes affichées dans `~/app/rasp/.env.production` (étape suivante).

> **Pour un déploiement de test uniquement**, tu peux utiliser la paire de dev déjà présente dans `.env.example` — elle est déjà pinnée dans l'agent. Ne pas faire ça en production réelle.

---

## 4. Créer les fichiers d'environnement

### rasp

```bash
cp ~/app/rasp/.env.production.example ~/app/rasp/.env.production
nano ~/app/rasp/.env.production
```

Variables à renseigner :

| Variable | Valeur |
|---|---|
| `DATABASE_URL` | URL Neon avec `?sslmode=require` |
| `AUTH_SECRET` | secret généré ci-dessus |
| `NEXTAUTH_SECRET` | secret généré ci-dessus |
| `NEXTAUTH_URL` | `https://rasp.ton-domaine.com` (ou IP) |
| `COLLECTOR_INTERNAL_URL` | `http://collector:4000` ← DNS interne compose |
| `KEK_MASTER_KEY` | même valeur que collector |
| `POLICY_SIGNING_PRIVATE_KEY` | clé privée générée à l'étape 3b (PEM, `\n` échappés) |
| `POLICY_SIGNING_PUBLIC_KEY` | clé publique correspondante (PEM, `\n` échappés) |
| `SEED_ADMIN_EMAIL` | email admin (seed one-shot uniquement) |
| `SEED_ADMIN_PASSWORD` | mot de passe fort (seed one-shot uniquement) |

### collector

```bash
cp ~/app/collector/.env.example ~/app/collector/.env
nano ~/app/collector/.env
```

Variables à renseigner :

| Variable | Valeur |
|---|---|
| `DATABASE_URL` | même URL Neon que rasp |
| `KEK_MASTER_KEY` | même valeur que rasp |
| `HMAC_REQUIRED` | `true` en production |
| `HMAC_SECRET` | secret généré ci-dessus |

---

## 5. Build et démarrage

```bash
cd ~/app/rasp
docker compose build          # construit les 3 images (migrate, app, collector)
docker compose up -d          # migrate tourne en premier, puis app + collector
docker compose logs -f        # suivre tous les logs en temps réel
```

---

## 6. Seed admin — une seule fois après le premier déploiement

```bash
cd ~/app/rasp
docker compose run --rm migrate pnpm db:seed:prod
```

> Ensuite, supprimer `SEED_ADMIN_EMAIL` et `SEED_ADMIN_PASSWORD` de `.env.production`.

---

## 7. Vérifier que tout tourne

```bash
docker compose ps                          # tous les services doivent être "healthy"
curl http://localhost:3000/api/health      # {"status":"ok",...}
curl http://localhost:4000/health          # {"status":"ok",...}
```

---

## 8. Ouvrir le firewall

```bash
sudo ufw allow 3000/tcp comment "rasp platform"
sudo ufw allow 4000/tcp comment "rasp collector"
sudo ufw status
```

---

## 9. Mettre à jour (workflow habituel)

```bash
cd ~/app/rasp      && git pull
cd ~/app/collector && git pull
cd ~/app/rasp
docker compose up -d --build   # rebuild + redémarre ; migrate repasse avant app
```

---

## Commandes utiles

```bash
# Logs par service
docker compose logs app
docker compose logs collector
docker compose logs migrate

# Redémarrer un service
docker compose restart app

# Tout arrêter
docker compose down

# Tout arrêter + supprimer les volumes (⚠ irréversible)
docker compose down -v
```

---

## Architecture des services

```
migrate (one-shot)
  └─ prisma migrate deploy
        ↓ completed_successfully
  ┌─────────────────┐     réseau rasp-net     ┌──────────────────────┐
  │  app (rasp)     │ ──────────────────────→ │  collector (Fastify) │
  │  :3000          │  http://collector:4000   │  :4000               │
  └────────┬────────┘                         └──────────┬───────────┘
           │                                             │
           └─────────────────────┬───────────────────────┘
                                 ↓
                         Neon PostgreSQL
```
