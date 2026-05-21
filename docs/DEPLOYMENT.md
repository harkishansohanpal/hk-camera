# HK Camera – Deployment Guide

This document covers deploying HK Camera to production using Docker Compose (single-server) and provides notes for scaling to AWS/GCP.

---

## 1. Prerequisites

- A Linux server (Ubuntu 22.04 recommended) with at least 2 GB RAM
- Docker + Docker Compose installed
- A domain name pointed at the server's IP (A record)
- Ports 80 and 443 open in your firewall

---

## 2. Server setup (one-time)

```bash
# Install Docker
curl -fsSL https://get.docker.com | sh
sudo usermod -aG docker $USER
newgrp docker

# Install Docker Compose v2
sudo apt-get install -y docker-compose-plugin

# Clone the repo
git clone https://github.com/your-org/hk-camera.git
cd hk-camera
```

---

## 3. TLS / SSL certificate

HK Camera requires HTTPS in production (browsers only allow camera access over secure origins).

**Option A – Certbot (Let's Encrypt, recommended):**

```bash
sudo apt-get install -y certbot
sudo certbot certonly --standalone -d yourdomain.com

# Symlink to nginx ssl folder
mkdir -p nginx/ssl
sudo ln -s /etc/letsencrypt/live/yourdomain.com/fullchain.pem nginx/ssl/cert.pem
sudo ln -s /etc/letsencrypt/live/yourdomain.com/privkey.pem  nginx/ssl/key.pem
```

Set up auto-renewal:
```bash
echo "0 3 * * * root certbot renew --quiet && docker compose restart nginx" | sudo tee /etc/cron.d/certbot-renew
```

**Option B – Self-signed (for internal/testing only):**
```bash
mkdir -p nginx/ssl
openssl req -x509 -nodes -days 365 -newkey rsa:2048 \
  -keyout nginx/ssl/key.pem -out nginx/ssl/cert.pem \
  -subj "/CN=yourdomain.com"
```

---

## 4. Production environment variables

Copy the example file and fill in all values:

```bash
cp backend/.env.example backend/.env
nano backend/.env
```

Critical values for production:

```env
NODE_ENV=production
CLIENT_URL=https://yourdomain.com

DATABASE_URL=postgresql://hk:STRONG_PASSWORD@postgres:5432/hkdb

JWT_SECRET=<64-char random string>
JWT_REFRESH_SECRET=<another 64-char random string>

# Use S3 in production for recordings
STORAGE_STRATEGY=s3
AWS_ACCESS_KEY_ID=...
AWS_SECRET_ACCESS_KEY=...
AWS_REGION=us-east-1
S3_BUCKET=your-recordings-bucket

# SMTP for alerts
SMTP_HOST=smtp.yourprovider.com
SMTP_PORT=587
SMTP_USER=alerts@yourdomain.com
SMTP_PASS=...

# Generate VAPID keys: npx web-push generate-vapid-keys
VAPID_PUBLIC_KEY=...
VAPID_PRIVATE_KEY=...
VAPID_SUBJECT=mailto:admin@yourdomain.com
```

Generate secrets:
```bash
node -e "console.log(require('crypto').randomBytes(64).toString('hex'))"
```

---

## 5. Build and launch

```bash
# Build all images
docker compose build

# Run database migrations and seed (first deploy only)
# Note: In production, seed skips demo accounts for security.
docker compose run --rm backend sh -c "npx prisma migrate deploy && node src/prisma/seed.js"

# Start all services
docker compose up -d

# Verify
docker compose ps
docker compose logs -f backend
```

The app will be live at `https://yourdomain.com`.

---

## 6. Deploying updates

```bash
git pull origin main
docker compose build backend frontend
docker compose up -d --no-deps backend frontend

# If schema changed:
docker compose run --rm backend npx prisma migrate deploy
```

---

## 7. Zero-downtime deployments (advanced)

For zero-downtime updates, use a blue-green approach:

```bash
# Build new images without stopping current containers
docker compose build

# Replace containers one at a time
docker compose up -d --no-deps --scale backend=2 backend
sleep 30   # wait for health checks
docker compose up -d --no-deps --scale backend=1 backend
```

Or consider switching to **Kubernetes** / **AWS ECS** for production at scale.

---

## 8. TURN Server (required for production WebRTC)

Google's STUN servers work for most consumer NATs, but users behind symmetric NAT or corporate firewalls need a TURN server.

**Deploy coturn on the same server:**

```bash
sudo apt-get install -y coturn
sudo nano /etc/turnserver.conf
```

Minimal config:
```
listening-port=3478
fingerprint
lt-cred-mech
user=hk:STRONG_TURN_PASSWORD
realm=yourdomain.com
```

Then update `frontend/src/hooks/useWebRTC.js`:
```js
const ICE_SERVERS = [
  { urls: 'stun:stun.l.google.com:19302' },
  {
    urls:       'turn:yourdomain.com:3478',
    username:   'hk',
    credential: 'STRONG_TURN_PASSWORD',
  },
];
```

Open UDP/TCP 3478 and 3479 in your firewall.

---

## 9. AWS production architecture (scaling)

For high availability at scale:

```
         ┌─────────────────────────────────────────────┐
         │            CloudFront CDN                    │
         │    (static assets + recordings from S3)      │
         └──────────────┬──────────────────────────────┘
                        │
         ┌──────────────▼──────────────────────────────┐
         │     Application Load Balancer (HTTPS)        │
         └──────────────┬──────────────────────────────┘
                        │
            ┌───────────┴───────────┐
            │                       │
   ┌────────▼────────┐     ┌────────▼────────┐
   │  ECS Task       │     │  ECS Task       │  ← Backend containers
   │  (backend)      │     │  (backend)      │    (auto-scaling group)
   └────────┬────────┘     └────────┬────────┘
            │                       │
   ┌────────▼───────────────────────▼────────┐
   │            AWS ElastiCache (Redis)       │  ← Socket.io adapter for multi-node
   └─────────────────────────────────────────┘
            │
   ┌────────▼─────────────────────────────────┐
   │          AWS RDS (PostgreSQL)             │
   └──────────────────────────────────────────┘
```

**Important for multi-node Socket.io:** Install the Redis adapter so signaling works across nodes:

```bash
npm install @socket.io/redis-adapter
```

```js
// src/index.js
const { createAdapter } = require('@socket.io/redis-adapter');
const { getRedis } = require('./config/redis');

const pubClient = getRedis();
const subClient = pubClient.duplicate();
io.adapter(createAdapter(pubClient, subClient));
```

---

## 10. Monitoring

### Application logs
```bash
docker compose logs -f backend    # live backend logs
docker compose logs -f --tail=100 # last 100 lines all services
```

### Database backups
```bash
# Automated daily backup via cron
echo "0 2 * * * docker compose exec postgres pg_dump -U hk hkdb | gzip > /backups/hk-$(date +\%Y\%m\%d).sql.gz" | sudo tee /etc/cron.d/hk-backup

mkdir -p /backups
```

### Health check endpoint
```
GET https://yourdomain.com/api/health
→ { "success": true, "uptime": 3600, "timestamp": "..." }
```

Use this with uptime monitoring tools (UptimeRobot, Pingdom, AWS CloudWatch).

---

## 11. CI/CD with GitHub Actions

Two workflows in `.github/workflows/`:

### CI Pipeline (`ci.yml`)

Runs on every push to `master` and `hk-camera-beta`, and on PRs to `master`:

| Job | What it runs |
|-----|-------------|
| `frontend` | ESLint lint (with `eslint-plugin-security` rules), `npm audit --audit-level=high` (blocks on high severity), Vitest unit tests (39), Vite production build |
| `backend` | `npm audit --audit-level=high` (blocks on high severity), Prisma generate, ESLint lint (with `eslint-plugin-security` rules), Jest integration + regression tests (57) |
| `e2e` | Playwright E2E tests (16) + regression tests (20) against preview server + production backend |
| `smoke` | Fast Playwright smoke tests (4) against preview server |
| `security` | Checks HTTP security headers (CSP, XFO, HSTS, XCTO) on Cloudflare Pages and Fly.io |

### CodeQL SAST (`codeql.yml`)

Runs on every push/PR to master + weekly scheduled scan:

- Uses GitHub's CodeQL analysis engine with `security-extended` and `security-and-quality` query suites
- Targets `javascript-typescript` language (build-mode: none — no compilation needed)
- Results appear as code scanning alerts on GitHub

### Dependabot (`dependabot.yml`)

Weekly automated PRs for:

- `npm` dependencies in `/frontend` and `/backend` (grouped by dev/prod, minor/patch)
- `github-actions` dependencies monthly

### Deploy Pipeline (`deploy.yml`)

Runs only on pushes to `master`:

1. Builds frontend with `VITE_API_URL` + `VITE_SOCKET_URL` pointing to production
2. Downloads YOLOv8n ML model from ultralytics assets
3. Runs unit + integration tests
4. Deploys frontend to Cloudflare Pages via `wrangler pages deploy`
5. Runs frontend regression tests against deployed production pages
6. Deploys backend to Fly.io via `flyctl deploy`
7. Runs smoke tests against production URLs (frontend + backend)

### Required Secrets

| Secret | Used by | Value |
|--------|---------|-------|
| `CLOUDFLARE_API_TOKEN` | deploy.yml | Cloudflare API token with Pages write |
| `FLY_API_TOKEN` | deploy.yml | Fly.io deploy token (`flyctl tokens create deploy -a hk-camera-backend`) |

No additional secrets are required for CodeQL or Dependabot — they are built-in GitHub features that work on public repositories.
