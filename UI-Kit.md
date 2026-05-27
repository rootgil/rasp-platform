# UI Kit Frontend - RASP Platform

## 1. Direction visuelle

L’allure doit être :

**Clean enterprise + security + observability**

L’utilisateur doit sentir que la plateforme est :

* sérieuse ;
* fiable ;
* technique ;
* facile à lire ;
* orientée monitoring / audit / sécurité ;
* adaptée à des clients entreprise.

Évite un design trop “startup fun”. Il faut quelque chose de proche de **Datadog, Snyk, Vercel, Linear, GitHub, AWS Console**, mais plus simple.

---

# 2. Palette de couleurs

## Couleurs principales

```txt
Primary / Brand
Bleu sécurité : #2563EB

Primary hover
Bleu foncé : #1D4ED8

Primary light background
Bleu très clair : #EFF6FF
```

Le bleu inspire la confiance, la technologie et la sécurité.

---

## Couleurs secondaires

```txt
Background principal
#F8FAFC

Surface / Cards
#FFFFFF

Border
#E2E8F0

Border light
#F1F5F9

Text primary
#0F172A

Text secondary
#475569

Text muted
#94A3B8
```

---

## Couleurs de statut sécurité

```txt
Critical
Rouge : #DC2626
Background : #FEF2F2

High
Orange foncé : #EA580C
Background : #FFF7ED

Medium
Jaune / Amber : #D97706
Background : #FFFBEB

Low
Bleu / Info : #2563EB
Background : #EFF6FF

Safe / Resolved
Vert : #16A34A
Background : #F0FDF4

Neutral
Gris : #64748B
Background : #F8FAFC
```

À utiliser pour les alertes, risques, incidents, agents, statuts, logs, etc.

---

# 3. Typographie

## Police recommandée

```txt
Font principale : Inter
Fallback : system-ui, sans-serif
```

Pourquoi Inter ?

* très lisible ;
* utilisée dans beaucoup de dashboards SaaS ;
* propre pour les tableaux, logs, métriques ;
* très professionnelle.

CSS :

```css
font-family: Inter, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
```

---

## Tailles de texte

```txt
Page title
30px / 36px - font-weight 700

Section title
20px / 28px - font-weight 600

Card title
16px / 24px - font-weight 600

Body
14px / 22px - font-weight 400

Small text
13px / 20px

Metadata / Labels
12px / 16px - uppercase possible
```

---

# 4. Layout global

## Structure recommandée

```txt
App Shell
├── Sidebar gauche fixe
├── Topbar
└── Main content
```

## Sidebar

Largeur :

```txt
260px
```

Fond :

```txt
#FFFFFF
```

Bordure droite :

```txt
#E2E8F0
```

Sections de navigation :

```txt
Overview
Applications
Agents
Security Events
API Discovery
Redaction Logs
Policies
Integrations
Audit
Settings
```

---

## Topbar

Hauteur :

```txt
64px
```

Contenu :

* recherche globale ;
* environnement actif : Production / Staging ;
* organisation ;
* notifications ;
* avatar utilisateur.

---

## Main content

```txt
background: #F8FAFC
padding: 24px ou 32px
```

Largeur fluide, mais avec une bonne respiration.

---

# 5. Composants UI

## Buttons

### Primary button

```txt
Background: #2563EB
Text: #FFFFFF
Hover: #1D4ED8
Border-radius: 8px
Height: 40px
Padding: 12px 16px
Font-size: 14px
Font-weight: 500
```

Exemples :

```txt
Add Application
Create Policy
Deploy Agent
```

---

### Secondary button

```txt
Background: #FFFFFF
Text: #0F172A
Border: #CBD5E1
Hover background: #F8FAFC
```

---

### Danger button

```txt
Background: #DC2626
Text: #FFFFFF
Hover: #B91C1C
```

Exemples :

```txt
Disable Agent
Delete Policy
Revoke API Key
```

---

# 6. Cards

Les cards doivent être sobres.

```txt
Background: #FFFFFF
Border: 1px solid #E2E8F0
Border-radius: 12px
Padding: 20px ou 24px
Shadow: très légère
```

Shadow :

```css
box-shadow: 0 1px 2px rgba(15, 23, 42, 0.04);
```

Exemples de cards :

```txt
Total Events
Critical Threats
Protected Applications
Active Agents
Blocked Attacks
Redacted Payloads
```

---

# 7. Badges

## Exemples

```txt
Critical
High
Medium
Low
Resolved
Blocked
Monitoring
Disconnected
Online
Offline
```

Style :

```txt
Border-radius: 999px
Padding: 4px 10px
Font-size: 12px
Font-weight: 500
```

Exemple :

```txt
Critical
Text: #991B1B
Background: #FEE2E2
```

---

# 8. Tables

Les tables sont très importantes dans ton dashboard.

## Style

```txt
Header background: #F8FAFC
Header text: #475569
Row background: #FFFFFF
Row hover: #F8FAFC
Border bottom: #E2E8F0
Font-size: 14px
```

Colonnes possibles pour Security Events :

```txt
Severity
Application
Agent
Attack Type
Endpoint
Status
Detected At
Action
```

Évite les tables trop chargées. Ajoute des filtres au-dessus.

---

# 9. Forms

## Inputs

```txt
Height: 40px
Border: #CBD5E1
Border-radius: 8px
Background: #FFFFFF
Focus border: #2563EB
Focus ring: #DBEAFE
```

Labels :

```txt
Font-size: 14px
Font-weight: 500
Color: #334155
```

Helper text :

```txt
Font-size: 13px
Color: #64748B
```

---

# 10. Graphiques et métriques

Pour les charts :

```txt
Bleu principal : #2563EB
Rouge critique : #DC2626
Orange high : #EA580C
Jaune medium : #D97706
Vert safe : #16A34A
Gris neutral : #94A3B8
```

Types de graphiques utiles :

* line chart : évolution des attaques ;
* bar chart : attaques par application ;
* donut chart : répartition par sévérité ;
* area chart : trafic analysé ;
* timeline : événements récents.

---

# 11. Icônes

Utilise :

```txt
lucide-react
```

Icônes recommandées :

```txt
Shield
ShieldAlert
Activity
Server
Database
KeyRound
Lock
Bug
Webhook
Bell
Settings
FileSearch
ScrollText
Terminal
```

Style :

```txt
Taille : 18px ou 20px
Stroke width : 2
```

---

# 12. Design des pages principales

## Dashboard Overview

Sections :

```txt
Page title: Security Overview

KPI cards:
- Protected Applications
- Active Agents
- Critical Events
- Blocked Attacks
- Redacted Payloads

Charts:
- Events over time
- Threats by severity
- Top attacked endpoints

Recent events table
```

---

## Applications

Objectif : voir les apps protégées.

```txt
Application name
Environment
Language
Framework
Agents connected
Risk level
Last activity
```

---

## Agents

Objectif : monitorer les agents Node, Python, Java, .NET.

```txt
Agent ID
Application
Language
Version
Status
Last heartbeat
Mode
```

Statuts :

```txt
Online
Offline
Outdated
Error
```

---

## Security Events

Objectif : lister les attaques détectées.

Filtres :

```txt
Severity
Application
Attack type
Environment
Status
Date range
```

Types d’attaques :

```txt
SQL Injection
XSS
SSRF
Path Traversal
Command Injection
Deserialization
Suspicious Payload
```

---

## Redaction Logs

Important pour ton cahier des charges.

Cette page doit montrer uniquement les preuves de redaction, sans exposer les données sensibles.

Colonnes :

```txt
Timestamp
Agent
Application
Field redacted
Pattern type
Action
Local audit status
```

Exemple :

```txt
email_address
credit_card
jwt_token
api_key
phone_number
```

---

# 13. Ton visuel recommandé

Le style final doit ressembler à ceci :

```txt
Fond gris très clair
Cards blanches
Bordures fines
Peu d’ombres
Beaucoup d’espace
Texte très lisible
Couleurs de risque très claires
Actions principales en bleu
Actions dangereuses en rouge
```

---

# 14. Design tokens CSS

Tu peux mettre ça dans ton frontend :

```css
:root {
  --color-primary: #2563eb;
  --color-primary-hover: #1d4ed8;
  --color-primary-light: #eff6ff;

  --color-background: #f8fafc;
  --color-surface: #ffffff;

  --color-border: #e2e8f0;
  --color-border-light: #f1f5f9;

  --color-text-primary: #0f172a;
  --color-text-secondary: #475569;
  --color-text-muted: #94a3b8;

  --color-critical: #dc2626;
  --color-critical-bg: #fef2f2;

  --color-high: #ea580c;
  --color-high-bg: #fff7ed;

  --color-medium: #d97706;
  --color-medium-bg: #fffbeb;

  --color-low: #2563eb;
  --color-low-bg: #eff6ff;

  --color-success: #16a34a;
  --color-success-bg: #f0fdf4;

  --radius-sm: 6px;
  --radius-md: 8px;
  --radius-lg: 12px;
  --radius-xl: 16px;

  --shadow-card: 0 1px 2px rgba(15, 23, 42, 0.04);
}
```

---

# 15. Avec Tailwind

Dans `tailwind.config.ts`, tu peux partir sur ça :

```ts
theme: {
  extend: {
    colors: {
      brand: {
        DEFAULT: "#2563EB",
        hover: "#1D4ED8",
        light: "#EFF6FF",
      },
      background: "#F8FAFC",
      surface: "#FFFFFF",
      border: "#E2E8F0",
      text: {
        primary: "#0F172A",
        secondary: "#475569",
        muted: "#94A3B8",
      },
      severity: {
        critical: "#DC2626",
        high: "#EA580C",
        medium: "#D97706",
        low: "#2563EB",
        success: "#16A34A",
      },
    },
    borderRadius: {
      card: "12px",
      button: "8px",
    },
    boxShadow: {
      card: "0 1px 2px rgba(15, 23, 42, 0.04)",
    },
  },
}
```

---

# 16. Ma recommandation finale

Pour ton projet, je partirais sur :

```txt
Police : Inter
Style : SaaS enterprise clair
Mode : Light uniquement
Couleur principale : Bleu sécurité #2563EB
Background : #F8FAFC
Cards : blanches avec bordures fines
Design : clean, dashboard, monitoring, audit
Lib UI : shadcn/ui + Tailwind CSS + lucide-react + Recharts
```

C’est le meilleur choix pour un projet RASP sérieux, surtout si tu veux montrer un rendu professionnel à une entreprise canadienne.