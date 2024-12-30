FROM node:23.5-bookworm-slim AS base

# Production image, copy all the files and start node
FROM base AS runner
ARG SERVICE_NAME
ENV NODE_ENV production

COPY --from=datadog/serverless-init:1 /datadog-init /app/datadog-init

WORKDIR /app

#Install packages
RUN apt-get update -y
RUN apt-get -y install mupdf-tools curl
RUN curl https://github.com/jgm/pandoc/releases/download/3.3/pandoc-3.3-1-amd64.deb -L -o pandoc.deb
RUN dpkg -i pandoc.deb


RUN addgroup --system --gid 1001 composable
RUN adduser --system --uid 1001 composable

COPY --chown=zeno:composable out .

ARG PORT=8080
ENV PORT=$PORT
EXPOSE $PORT

USER composable

ENV SERVICE_NAME=$SERVICE_NAME
ENTRYPOINT ["/app/datadog-init"]
CMD /usr/local/bin/node /app/lib/main.js
