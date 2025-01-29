FROM node:22-slim AS base
ENV PNPM_HOME="/pnpm"
ENV PATH="$PNPM_HOME:$PATH"
RUN corepack enable
COPY . /workspace
WORKDIR /workspace/apps/github-agent

FROM base AS prod-deps
RUN --mount=type=cache,id=pnpm,target=/pnpm/store pnpm install --prod --frozen-lockfile

FROM base AS build
RUN --mount=type=cache,id=pnpm,target=/pnpm/store pnpm install --frozen-lockfile
RUN pnpm run -r build

FROM base
RUN apt-get update -y && \
    apt-get install -y openssl ca-certificates

COPY --from=prod-deps /workspace/node_modules /workspace/node_modules
COPY --from=build /workspace/apps/github-agent/lib /workspace/apps/github-agent/lib
COPY --from=build /workspace/apps/github-agent/bin /workspace/apps/github-agent/bin

COPY --from=datadog/serverless-init:1 /datadog-init /workspace/datadog-init

ENV SERVICE_NAME=vertesia_github-agent

ENTRYPOINT ["/workspace/datadog-init"]
CMD ["pnpm", "start"]
