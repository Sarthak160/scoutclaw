FROM ghcr.io/openclaw/openclaw:latest

USER root

WORKDIR /scoutclaw

RUN mkdir -p /scoutclaw && chown -R node:node /scoutclaw

COPY --chown=node:node package.json package-lock.json ./
RUN npm install

COPY --chown=node:node prisma ./prisma
RUN npm run prisma:generate

COPY --chown=node:node . .
RUN npm run build

COPY docker/scoutclaw-entrypoint.sh /usr/local/bin/scoutclaw-entrypoint
RUN chmod +x /usr/local/bin/scoutclaw-entrypoint

ENV NODE_ENV=production
ENV PORT=3000
ENV APP_URL=http://localhost:3000
ENV HOME=/home/node
ENV OPENCLAW_HOME=/home/node/.openclaw
ENV OPENCLAW_GATEWAY_PORT=18789
ENV OPEN_CLAW_CMD=openclaw

EXPOSE 3000 18789

ENTRYPOINT ["scoutclaw-entrypoint"]
