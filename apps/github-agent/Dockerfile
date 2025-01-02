FROM node:23.5-bookworm-slim AS base
ENV PNPM_HOME="/pnpm"
ENV PATH="$PNPM_HOME:$PATH"
RUN corepack enable


FROM base AS build
COPY . /app
WORKDIR /app

# Authenticate with Google Artifact Registry
RUN --mount=type=secret,id=gcp,target=/root/.config/gcloud/application_default_credentials.json \
    pnpm add -g google-artifactregistry-auth && \
    pnpm run registry-auth

RUN pnpm install --frozen-lockfile && \
    pnpm run -r build


FROM base AS app
RUN apt-get update -y && \
    apt-get install -y curl

COPY --from=datadog/serverless-init:1 /datadog-init /app/datadog-init
COPY --from=build /app /app

ENV SERVICE_NAME=github-agent

ENTRYPOINT ["/app/datadog-init"]
CMD ["node", "/app/apps/github-agent/lib/main.js"]
