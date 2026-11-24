# syntax=docker/dockerfile:1
# Build from the repo root: docker build -f apps/api/Dockerfile -t studex-api .
FROM node:24-slim AS build
ENV PNPM_HOME=/pnpm
ENV PATH=$PNPM_HOME:$PATH
RUN corepack enable
WORKDIR /repo
COPY pnpm-workspace.yaml pnpm-lock.yaml package.json ./
COPY packages/contracts packages/contracts
COPY apps/api apps/api
RUN pnpm install --frozen-lockfile --filter @studex/api...
# Deploy a self-contained dir with production deps only (workspace deps injected).
RUN pnpm --filter @studex/api deploy --prod /out

FROM node:24-slim
ENV NODE_ENV=production
WORKDIR /app
COPY --from=build /out ./
USER node
EXPOSE 8080
CMD ["./node_modules/.bin/tsx", "src/index.ts"]
