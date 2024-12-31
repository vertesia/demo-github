FROM node:23.5-bookworm-slim AS base

# Production image, copy all the files and start node
FROM base AS runner
ARG SERVICE_NAME
ENV NODE_ENV production

COPY --from=datadog/serverless-init:1 /datadog-init /app/datadog-init

WORKDIR /app

RUN apt-get update -y \
    && apt-get install -y openssl

RUN addgroup --system --gid 1001 composable
RUN adduser --system --uid 1001 composable

COPY --chown=zeno:composable . .

ARG PORT=8080
ENV PORT=$PORT
EXPOSE $PORT

USER composable

ENV SERVICE_NAME=$SERVICE_NAME
ENTRYPOINT ["/app/datadog-init"]
CMD /usr/local/bin/node /app/apps/github-agent/lib/main.js
