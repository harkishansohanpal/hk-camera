FROM node:20-bookworm AS base
WORKDIR /app

# ── Install dependencies ──────────────────────────────────────
FROM base AS deps
COPY package*.json ./
RUN npm ci --omit=dev

# ── Generate Prisma client ────────────────────────────────────
FROM deps AS prisma
COPY src/prisma ./src/prisma
RUN npx prisma generate

# ── Production image ──────────────────────────────────────────
FROM base AS runner
ENV NODE_ENV=production

COPY --from=prisma /app/node_modules ./node_modules
COPY --from=prisma /app/src/prisma  ./src/prisma
COPY src ./src

COPY docker-entrypoint.sh /app/docker-entrypoint.sh
RUN chmod +x /app/docker-entrypoint.sh \
    && mkdir -p uploads recordings \
    && chown -R node:node /app

USER node

EXPOSE 5000

ENTRYPOINT ["/app/docker-entrypoint.sh"]
