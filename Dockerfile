# syntax=docker/dockerfile:1.7

FROM node:22-alpine AS dependencies
WORKDIR /app
RUN apk add --no-cache libc6-compat
COPY package.json package-lock.json ./
RUN npm ci

FROM node:22-alpine AS builder
WORKDIR /app
ENV NEXT_TELEMETRY_DISABLED=1
ARG APP_TARGET=vendor
ARG NEXT_PUBLIC_API_URL=/api/v1
ARG INTERNAL_API_URL=http://backend:8080
ENV APP_TARGET=${APP_TARGET}
ENV NEXT_PUBLIC_API_URL=${NEXT_PUBLIC_API_URL}
ENV INTERNAL_API_URL=${INTERNAL_API_URL}
COPY --from=dependencies /app/node_modules ./node_modules
COPY . .
RUN npm run build:${APP_TARGET}

FROM node:22-alpine AS runner
WORKDIR /app
ENV NODE_ENV=production \
    NEXT_TELEMETRY_DISABLED=1 \
    HOSTNAME=0.0.0.0 \
    PORT=3000 \
    INTERNAL_API_URL=http://backend:8080
ARG APP_TARGET=vendor
ENV APP_TARGET=${APP_TARGET}

RUN addgroup --system --gid 1001 nodejs \
    && adduser --system --uid 1001 nextjs

COPY --from=dependencies --chown=nextjs:nodejs /app/node_modules ./node_modules
COPY --from=builder --chown=nextjs:nodejs /app/package.json ./package.json
COPY --from=builder --chown=nextjs:nodejs /app/apps ./apps

USER nextjs
EXPOSE 3000

HEALTHCHECK --interval=10s --timeout=3s --start-period=20s --retries=5 \
  CMD if [ "$APP_TARGET" = "dish" ]; then wget --no-verbose --tries=1 --spider http://127.0.0.1:3000/healthz; else wget --no-verbose --tries=1 --spider http://127.0.0.1:3000/; fi

CMD ["sh", "-c", "./node_modules/.bin/next start apps/${APP_TARGET} -p 3000"]
