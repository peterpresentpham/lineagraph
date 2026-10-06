# lineagraph admin (Vite, served as static files). Build context is the monorepo root:
#   docker build -f apps/admin/Dockerfile .
FROM node:22.20-bookworm-slim AS base
WORKDIR /app
RUN corepack enable

FROM base AS deps
COPY package.json pnpm-workspace.yaml pnpm-lock.yaml ./
COPY apps/admin/package.json apps/admin/
COPY packages/ui/package.json packages/ui/
RUN pnpm install --frozen-lockfile --filter @lineagraph/admin...

FROM deps AS builder
COPY tsconfig.base.json ./
COPY packages/ui packages/ui
COPY apps/admin apps/admin
# Inlined into the bundle at build time: changing either needs a redeploy. The build fails when
# VITE_API_URL is unset or points at localhost (see apps/admin/vite.config.ts).
ARG VITE_API_URL=
ARG VITE_WEB_URL=
ENV VITE_API_URL=$VITE_API_URL
ENV VITE_WEB_URL=$VITE_WEB_URL
RUN pnpm --filter @lineagraph/admin build

# The runtime image holds only the built files and a pinned static server, not the source tree
# or any dev dependency. `serve` pins a vulnerable `compression`; the override installs the patched one.
FROM node:22.20-bookworm-slim AS runner
ENV NODE_ENV=production
WORKDIR /srv
RUN printf '%s' '{"name":"admin-host","private":true,"dependencies":{"serve":"14.2.6"},"overrides":{"compression":"^1.8.2"}}' > package.json \
  && npm install --omit=dev --no-audit --no-fund && npm cache clean --force
COPY --from=builder --chown=node:node /app/apps/admin/dist ./dist
USER node
EXPOSE 4100
# dist/serve.json (from apps/admin/public) adds the security headers.
CMD ["sh", "-c", "node_modules/.bin/serve -s dist -l tcp://0.0.0.0:${PORT:-4100}"]
