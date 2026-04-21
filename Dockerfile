# gestion-conges-professeurs — Next.js standalone production image
# Stages: deps → builder → runner. Runtime: entrypoint (optional pg_dump backup, migrate, then server.js)

FROM node:20-alpine AS base
RUN apk add --no-cache libc6-compat
WORKDIR /app

# --- Dependencies ---
FROM base AS deps
COPY package.json package-lock.json* ./
RUN npm ci

# --- Build ---
FROM base AS builder
COPY --from=deps /app/node_modules ./node_modules
COPY . .

# Prisma Client only (isolated dummy URL for generate; no migrate at build)
ENV DATABASE_URL="postgresql://dummy:dummy@localhost:5432/dummy"
RUN npx prisma generate --schema=prisma/schema.prisma

ENV NEXT_TELEMETRY_DISABLED=1
RUN npm run build

# Slim runtime node_modules for runner (keep Prisma CLI + prod deps; drop devDependencies)
RUN npm prune --omit=dev

# --- Runtime (standalone + Prisma CLI for migrate deploy at startup) ---
FROM base AS runner
WORKDIR /app

ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1

# pg_dump/psql for optional pre-migrate backup + manual restore; su-exec so entrypoint can chown /backups then drop to nextjs
RUN apk add --no-cache postgresql-client su-exec

RUN addgroup --system --gid 1001 nodejs \
  && adduser --system --uid 1001 nextjs

COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static
COPY --from=builder --chown=nextjs:nodejs /app/public ./public
COPY --from=builder --chown=nextjs:nodejs /app/prisma ./prisma
COPY --from=builder --chown=nextjs:nodejs /app/prisma.config.js ./prisma.config.js

# Replace standalone’s traced node_modules with pruned prod tree so `npx prisma migrate deploy` resolves hoisted CLI deps
COPY --from=builder --chown=nextjs:nodejs /app/node_modules ./node_modules

COPY docker/entrypoint.sh /entrypoint.sh
COPY --chown=nextjs:nodejs docker/scan-pending-migrations.cjs /app/docker/scan-pending-migrations.cjs
COPY docker/restore-backup.sh /usr/local/bin/restore-backup
RUN chmod 755 /entrypoint.sh /usr/local/bin/restore-backup

# Entrypoint starts as root to chown /backups for the volume, then re-execs as nextjs (see entrypoint.sh).
USER root

EXPOSE 3000
ENV PORT=3000
ENV HOSTNAME=0.0.0.0

ENTRYPOINT ["/entrypoint.sh"]
