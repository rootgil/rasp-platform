# Break-Glass — Guide de test (local)

Ce document décrit comment tester le mécanisme **Break-Glass Emergency Access** en
environnement de développement local.

Pour le runbook opérationnel (production, DR, révocation), voir
[OPERATIONS.md §8 — Break-Glass Emergency Access](../OPERATIONS.md#8-break-glass-emergency-access).

---

## Prérequis

| Prérequis | Détail |
|---|---|
| Serveur Next.js | `pnpm dev` en cours d'exécution sur `http://localhost:3000` |
| Base de données | `DATABASE_URL` configurée dans `.env` |
| Compte admin | ex. `admin@rasp.io` / `admin1234` (seed dev) |
| Session admin | Connecté au backoffice pour générer un token |

> **Important :** si `curl` ne renvoie rien et que `jq .` affiche une ligne vide,
> vérifiez d'abord que le serveur tourne (`ss -tlnp | grep 3000`). Une connexion
> refusée donne un exit code `7` et un body vide.

---

## Architecture (rappel)

Le break-glass fonctionne en **deux étapes** :

1. **Génération (admin connecté)** — `POST /api/admin/break-glass`  
   Retourne un `rawToken` hex (64 caractères). Affiché **une seule fois** ; seul
   son hash SHA-256 est stocké en base.

2. **Échange (sans session)** — `POST /api/auth/break-glass`  
   Échange le `rawToken` contre un JWT d'urgence (30 min, usage unique).

| Propriété | Valeur |
|---|---|
| Durée de vie du token brut | 4 heures |
| Durée de vie du JWT (après échange) | 30 minutes |
| Utilisations par token | 1 (single-use) |
| Secret stocké | Hash SHA-256 uniquement |
| Audit | `break_glass.created`, `break_glass.used`, `break_glass.revoked` |

---

## Test via l'UI

1. Démarrer l'app : `pnpm dev`
2. Se connecter en admin → **Backoffice → Security Center**
3. Section **Break-Glass Emergency Access**
4. Saisir une raison (minimum 10 caractères)
5. Cliquer **Generate Token**
6. **Copier immédiatement** le token affiché (il ne sera plus jamais montré)
7. Vérifier qu'il apparaît dans **Active Tokens**

Pour révoquer : bouton **Revoke** sur un token actif (session admin requise).

---

## Test via curl

Remplacez `<COOKIE>` par le cookie de session Next-Auth (DevTools → Application →
Cookies → `next-auth.session-token` ou `__Secure-next-auth.session-token`).

### Étape 1 — Générer un token (session admin requise)

```bash
curl -s -X POST http://localhost:3000/api/admin/break-glass \
  -H "Content-Type: application/json" \
  -H "Cookie: next-auth.session-token=<COOKIE>" \
  -d '{"action":"create","reason":"Test break-glass procedure"}' | jq .
```

Réponse attendue (201) :

```json
{
  "id": "cuid...",
  "rawToken": "a3f9c2...64_hex_chars...",
  "expiresAt": "2026-06-23T08:32:00.000Z",
  "warning": "Store this token securely. It will not be shown again."
}
```

Conserver `rawToken` pour l'étape suivante.

### Étape 2 — Échanger le token contre un JWT (sans session)

Endpoint **public** — aucun cookie requis :

```bash
curl -s -i -X POST http://localhost:3000/api/auth/break-glass \
  -H "Content-Type: application/json" \
  -d '{"token":"<RAW_TOKEN>"}' | jq .
```

Réponse attendue (200) :

```json
{
  "jwt": "eyJhbGci...",
  "expiresIn": 1800,
  "message": "Emergency JWT issued. Valid for 30 minutes. Single use only."
}
```

Le token brut est **consommé immédiatement** (`usedAt` en base).

### Étape 3 — Appeler un endpoint admin avec le JWT d'urgence

```bash
curl -s http://localhost:3000/api/backoffice/kill-switch \
  -H "Authorization: Bearer <JWT>" | jq .
```

Les actions sensibles (kill-switch, rollback, etc.) peuvent encore exiger
`x-mfa-token` en plus du Bearer JWT.

### Étape 4 — Vérifier l'usage unique

Relancer l'étape 2 avec le **même** `rawToken` :

```bash
curl -s -X POST http://localhost:3000/api/auth/break-glass \
  -H "Content-Type: application/json" \
  -d '{"token":"<RAW_TOKEN>"}' | jq .
```

Réponse attendue (401) :

```json
{
  "error": "Invalid, expired, or already-used token"
}
```

### Révoquer un token (session admin)

```bash
curl -s -X POST http://localhost:3000/api/admin/break-glass \
  -H "Content-Type: application/json" \
  -H "Cookie: next-auth.session-token=<COOKIE>" \
  -d '{"action":"revoke","tokenId":"<TOKEN_ID>"}' | jq .
```

---

## Checklist de validation

| Vérification | Résultat attendu |
|---|---|
| 2ᵉ échange du même `rawToken` | HTTP 401 |
| Token révoqué via UI ou API | HTTP 401 à l'échange |
| Token expiré (après 4 h) | HTTP 401 |
| `rawToken` absent de la DB | Oui — seule la colonne `tokenHash` (SHA-256) |
| Audit `break_glass.created` | Après génération |
| Audit `break_glass.used` | Après échange (inclut IP) |
| Audit `break_glass.revoked` | Après révocation |
| Champ `usedAt` en base | Renseigné après le 1ᵉʳ échange réussi |

---

## Vérifier les audit logs

**UI :** Backoffice → Audit Logs — filtrer sur `break_glass.*`

**SQL :**

```bash
psql "$DATABASE_URL" -c "
  SELECT action, target, metadata, \"createdAt\"
  FROM \"AuditLog\"
  WHERE action LIKE 'break_glass.%'
  ORDER BY \"createdAt\" DESC
  LIMIT 10;
"
```

---

## Dépannage

### `curl` + `jq .` sans sortie

- Vérifier que `pnpm dev` tourne : `curl -s -o /dev/null -w "%{http_code}" http://localhost:3000`
- Utiliser `curl -i` pour voir status et headers sans `jq`
- Exit code `7` = connexion refusée (serveur arrêté ou mauvais port)

### HTTP 401 à l'échange

- Token déjà utilisé (single-use)
- Token révoqué
- Token expiré (> 4 h)
- Mauvaise copie du `rawToken` (doit faire 64 caractères hex)

### HTTP 403 à la génération

- Session admin absente ou expirée — se reconnecter et mettre à jour le cookie

### Fichiers source

| Fichier | Rôle |
|---|---|
| `app/api/admin/break-glass/route.ts` | Génération et révocation (admin) |
| `app/api/auth/break-glass/route.ts` | Échange public token → JWT |
| `app/(admin)/backoffice/security-center/page.tsx` | UI Security Center |
