# lineagraph web (Next.js). Build context is the monorepo root:
#   docker build -f apps/web/Dockerfile .
FROM node:22.20-bookworm-slim AS base
WORKDIR /app
ENV NEXT_TELEMETRY_DISABLED=1
RUN corepack enable

FROM base AS deps
COPY package.json pnpm-workspace.yaml pnpm-lock.yaml ./
COPY apps/web/package.json apps/web/
COPY packages/ui/package.json packages/ui/
RUN pnpm install --frozen-lockfile --filter @lineagraph/web...

FROM deps AS builder
COPY tsconfig.base.json ./
COPY packages/ui packages/ui
COPY apps/web apps/web
# Railway passes Variables with these names as build arguments. NEXT_PUBLIC_* is inlined into the
# browser code at build time, so changing it needs a redeploy. The build fails if they are unset
# or point at localhost (see apps/web/next.config.ts).
ARG NEXT_PUBLIC_API_URL=
ARG SITE_URL=
ENV NEXT_PUBLIC_API_URL=$NEXT_PUBLIC_API_URL
ENV SITE_URL=$SITE_URL
RUN pnpm --filter @lineagraph/web build

FROM base AS runner
ENV NODE_ENV=production
COPY --from=builder --chown=node:node /app /app
USER node
WORKDIR /app/apps/web
EXPOSE 3200
CMD ["sh", "-c", "pnpm exec next start -H 0.0.0.0 -p ${PORT:-3200}"]
