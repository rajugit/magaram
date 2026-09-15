FROM node:22-bookworm-slim AS build
RUN apt-get update && apt-get install -y --no-install-recommends openssl ca-certificates && rm -rf /var/lib/apt/lists/*
RUN npm install --global pnpm@10.33.0
WORKDIR /app
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
COPY apps/api/package.json apps/api/package.json
COPY apps/web/package.json apps/web/package.json
COPY apps/worker/package.json apps/worker/package.json
RUN pnpm install --frozen-lockfile
COPY . .
RUN pnpm --filter @magaram/api db:generate
ENV NEXT_TELEMETRY_DISABLED=1
RUN pnpm build
RUN chown -R node:node /app/apps/web/.next
ENV NODE_ENV=production
USER node
CMD ["pnpm", "--filter", "@magaram/web", "start", "--hostname", "127.0.0.1"]
