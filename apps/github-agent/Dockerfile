FROM node:23.5-bookworm-slim AS base
ENV PNPM_HOME="/pnpm"
ENV PATH="$PNPM_HOME:$PATH"
RUN corepack enable


FROM base as build
COPY . /app
WORKDIR /app

RUN pnpm add -g google-artifactregistry-auth
# Use a cache layer for the pnpm store
RUN --mount=type=cache,id=pnpm,target=/pnpm/store pnpm install --frozen-lockfile
RUN pnpm run -r build


FROM base as app
RUN apt-get update -y && \
    apt-get install -y curl

COPY --from=datadog/serverless-init:1 /datadog-init /app/datadog-init
COPY --from=build /app /app

ENTRYPOINT ["/app/datadog-init"]
CMD ["node", "/app/apps/github-agent/lib/main.js"]
