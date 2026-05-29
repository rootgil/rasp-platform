FROM node:22-alpine AS base
RUN corepack enable pnpm

# ── deps: install all dependencies ──────────────────────────────────────────
FROM base AS deps
WORKDIR /app

COPY package.json pnpm-lock.yaml pnpm-workspace.yaml .npmrc ./
RUN pnpm install --frozen-lockfile

# ── builder: generate Prisma client + compile Next.js ───────────────────────
FROM base AS builder
WORKDIR /app

# DATABASE_URL is only needed at build time for `prisma generate`
# The real value is injected at runtime via docker-compose env_file
ARG DATABASE_URL="postgresql://build:build@localhost/build"
ENV DATABASE_URL=$DATABASE_URL

COPY --from=deps /app/node_modules ./node_modules
COPY . .

RUN pnpm db:generate
RUN pnpm build

# ── migrator: one-shot prisma migrate deploy ────────────────────────────────
FROM builder AS migrator
CMD ["pnpm", "db:deploy"]

# ── runner: minimal production image ────────────────────────────────────────
FROM node:22-alpine AS runner
WORKDIR /app

ENV NODE_ENV=production
ENV PORT=3000
ENV HOSTNAME=0.0.0.0

RUN addgroup --system --gid 1001 nodejs \
  && adduser --system --uid 1001 nextjs

# standalone output contains its own node_modules copy
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static
COPY --from=builder --chown=nextjs:nodejs /app/public ./public

USER nextjs

EXPOSE 3000

CMD ["node", "server.js"]
