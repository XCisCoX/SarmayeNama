# syntax=docker/dockerfile:1

# ─────────────────────────────────────────────────────────────────────────────
# SarmayeNama — multi-stage build for the pnpm monorepo.
# Build with: docker compose up --build  (or docker build --target web .)
# ─────────────────────────────────────────────────────────────────────────────

FROM node:22-slim AS base
ENV PNPM_HOME=/pnpm PATH=/pnpm:$PATH
RUN npm install -g pnpm@11
WORKDIR /app

# Install dependencies (workspace manifest first for layer caching)
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
COPY apps/web/package.json apps/web/package.json
COPY apps/worker/package.json apps/worker/package.json
COPY packages/shared/package.json packages/shared/package.json
COPY packages/database/package.json packages/database/package.json
COPY packages/market-core/package.json packages/market-core/package.json
COPY packages/providers/package.json packages/providers/package.json
RUN pnpm install --frozen-lockfile

# ─────────────────────────────────────────────────────────────────────────────
FROM base AS build
COPY . .
# Generate the Prisma client, then build every workspace package + the web app.
RUN pnpm --filter @sarmaye/database db:generate \
 && pnpm --filter @sarmaye/shared --filter @sarmaye/market-core --filter @sarmaye/database --filter @sarmaye/providers --filter @sarmaye/worker build \
 && pnpm --filter @sarmaye/web build

# ─────────────────────────────────────────────────────────────────────────────
FROM node:22-slim AS web
ENV NODE_ENV=production PNPM_HOME=/pnpm PATH=/pnpm:$PATH
RUN npm install -g pnpm@11
WORKDIR /app
COPY --from=build /app/node_modules ./node_modules
COPY --from=build /app/packages ./packages
COPY --from=build /app/apps/web ./apps/web
COPY --from=build /app/pnpm-lock.yaml ./pnpm-lock.yaml
COPY --from=build /app/package.json ./package.json
COPY --from=build /app/pnpm-workspace.yaml ./pnpm-workspace.yaml
COPY apps/web/docker/entrypoint.sh /entrypoint.sh
RUN chmod +x /entrypoint.sh
EXPOSE 3000
HEALTHCHECK --interval=30s --timeout=5s --start-period=40s --retries=5 \
  CMD node -e "fetch('http://localhost:3000/api/health').then(r=>process.exit(r.ok?0:1)).catch(()=>process.exit(1))"
ENTRYPOINT ["/entrypoint.sh"]

# ─────────────────────────────────────────────────────────────────────────────
FROM node:22-slim AS worker
ENV NODE_ENV=production PNPM_HOME=/pnpm PATH=/pnpm:$PATH
RUN npm install -g pnpm@11
WORKDIR /app
COPY --from=build /app/node_modules ./node_modules
COPY --from=build /app/packages ./packages
COPY --from=build /app/apps/worker ./apps/worker
COPY --from=build /app/pnpm-lock.yaml ./pnpm-lock.yaml
COPY --from=build /app/package.json ./package.json
COPY --from=build /app/pnpm-workspace.yaml ./pnpm-workspace.yaml
CMD ["node", "apps/worker/dist/index.js"]
