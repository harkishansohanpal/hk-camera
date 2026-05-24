FROM node:20-bookworm AS base
WORKDIR /app

# ── Install dependencies ──────────────────────────────────────
FROM base AS deps
COPY backend/package*.json ./
RUN npm ci --omit=dev

# ── Generate Prisma client ────────────────────────────────────
FROM deps AS prisma
COPY backend/src/prisma ./src/prisma
RUN npx prisma generate

# ── Download ML model (yolo11m) ───────────────────────────────
FROM base AS model-dl
RUN apt-get update && apt-get install -y --no-install-recommends ca-certificates curl \
    && rm -rf /var/lib/apt/lists/*
RUN mkdir -p /app/models && \
    curl -fsSL -o /app/models/yolo11m.onnx \
    https://huggingface.co/deepghs/yolos/resolve/main/yolo11m/model.onnx

# ── Production image ──────────────────────────────────────────
FROM base AS runner
RUN apt-get update && apt-get install -y --no-install-recommends \
    ca-certificates curl \
    && rm -rf /var/lib/apt/lists/*

ENV NODE_ENV=production

COPY --from=prisma /app/node_modules ./node_modules
COPY --from=prisma /app/src/prisma  ./src/prisma
COPY --from=model-dl /app/models ./models
COPY backend/src ./src

COPY docker-entrypoint.sh /app/docker-entrypoint.sh
RUN chmod +x /app/docker-entrypoint.sh \
    && mkdir -p uploads recordings \
    && chown -R node:node /app

USER node

EXPOSE 5000

ENTRYPOINT ["/app/docker-entrypoint.sh"]
