# lineagraph admin (Vite, served as static files). Build context is the monorepo root:
#   docker build -f apps/admin/Dockerfile .
FROM node:22-bookworm-slim AS base
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
# Inlined into the bundle at build time: changing either needs a redeploy.
ARG VITE_API_URL=
ARG VITE_WEB_URL=
ENV VITE_API_URL=$VITE_API_URL
ENV VITE_WEB_URL=$VITE_WEB_URL
RUN pnpm --filter @lineagraph/admin build

FROM base AS runner
ENV NODE_ENV=production
COPY --from=builder /app /app
WORKDIR /app/apps/admin
EXPOSE 4100
CMD ["sh", "-c", "pnpm exec serve -s dist -l tcp://0.0.0.0:${PORT:-4100}"]
