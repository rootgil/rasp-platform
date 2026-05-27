# AGENTS.md — rasp-platform

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