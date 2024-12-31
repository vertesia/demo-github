FROM node:23.5-bookworm-slim

ARG SERVICE_NAME

WORKDIR /app

RUN apt-get update -y && \
    apt-get install -y curl

RUN addgroup --system --gid 1001 composable
RUN adduser --system --uid 1001 composable

COPY --from=datadog/serverless-init:1 /datadog-init /app/datadog-init
COPY --chown=zeno:composable . .

USER composable

ENV NODE_ENV=production
ENV SERVICE_NAME=$SERVICE_NAME

ENTRYPOINT ["/app/datadog-init"]
CMD ["node", "/app/apps/github-agent/lib/main.js"]
