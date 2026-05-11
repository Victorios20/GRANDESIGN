FROM node:20-bookworm-slim AS deps

WORKDIR /app

ENV NEXT_TELEMETRY_DISABLED=1

RUN apt-get update \
  && apt-get install -y --no-install-recommends ca-certificates openssl \
  && rm -rf /var/lib/apt/lists/*

COPY package.json package-lock.json ./
RUN npm ci --ignore-scripts

FROM deps AS builder

WORKDIR /app

ENV NEXT_TELEMETRY_DISABLED=1

ARG NEXT_PUBLIC_ENDPOINT_GERAR_PDF
ARG NEXT_PUBLIC_ENDPOINT_LOGS_ORCAMENTO
ARG GIT_SHA

ENV NEXT_PUBLIC_ENDPOINT_GERAR_PDF=$NEXT_PUBLIC_ENDPOINT_GERAR_PDF
ENV NEXT_PUBLIC_ENDPOINT_LOGS_ORCAMENTO=$NEXT_PUBLIC_ENDPOINT_LOGS_ORCAMENTO
ENV GIT_SHA=$GIT_SHA
ENV DATABASE_URL=postgresql://build:build@localhost:5432/build

COPY . .

RUN npx prisma generate && npm run build && npm prune --omit=dev

FROM node:20-bookworm-slim AS runner

WORKDIR /app

ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1
ENV PORT=3000
ENV HOSTNAME=0.0.0.0
ARG GIT_SHA

ENV GIT_SHA=$GIT_SHA

RUN apt-get update \
  && apt-get install -y --no-install-recommends ca-certificates openssl \
  && rm -rf /var/lib/apt/lists/*

COPY --from=builder /app/package.json ./package.json
COPY --from=builder /app/.next ./.next
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/public ./public
COPY --from=builder /app/prisma ./prisma

EXPOSE 3000

CMD ["npm", "start"]
