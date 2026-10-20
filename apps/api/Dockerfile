# lineagraph API (Express). Build context is the monorepo root:
#   docker build -f apps/api/Dockerfile .
# Runs from TypeScript source with tsx, because @lineagraph/core ships source, not a build.
FROM node:26.12-bookworm-slim
WORKDIR /app
RUN corepack enable

# Manifests first, so the install layer is reused until a dependency changes.
COPY package.json pnpm-workspace.yaml pnpm-lock.yaml ./
COPY apps/api/package.json apps/api/
COPY packages/core/package.json packages/core/
# Dev dependencies stay: the pre-deploy migration needs drizzle-kit.
RUN pnpm install --frozen-lockfile --filter @lineagraph/api...

COPY tsconfig.base.json ./
COPY packages/core packages/core
COPY apps/api apps/api

ENV NODE_ENV=production
# Nothing here needs root: run as the unprivileged user the node image provides.
RUN chown -R node:node /app
USER node
WORKDIR /app/apps/api
EXPOSE 4200
CMD ["pnpm", "exec", "tsx", "src/index.ts"]
