# HK Camera

> A production-grade home security camera platform. Turn any browser-equipped device into a live security camera with real-time WebRTC streaming, ML-based motion detection, two-way audio, and cloud recordings.

---

## Features

- **Live streaming** – Peer-to-peer WebRTC video from any browser (no plugins)
- **Motion detection** – Canvas pixel-diff algorithm *or* YOLOv8-nano ML detection (ONNX Runtime Web), configurable per-camera
- **Two-way audio** – Speak back through the camera device from the viewer
- **Night vision** – Camera2 native Android low-light + canvas IR phosphor overlay modes
- **Torch / flashlight** – Native torch control via WebRTC constraint and Capacitor plugin
- **Granular camera controls** – Exposure, focus, white balance, ISO, brightness, contrast
- **Remote camera control** – Control host camera settings (torch, focus, zoom, etc.) from the viewer
- **Cloud recordings** – Auto-record on motion; store locally or on AWS S3
- **Alerts** – In-app, email (SMTP), and browser push notifications
- **Multi-camera** – Manage multiple cameras per account
- **JWT auth** – Short-lived access tokens with rotating refresh tokens
- **Stripe billing** – Subscription plans, checkout, customer portal
- **TURN server** – Coturn (self-hosted) or Cloudflare TURN with STUN fallback
- **Mobile apps** – Native iOS and Android via Capacitor, installable as PWA
- **User registration** – Self-service account creation

---

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Frontend | React 18, Vite, Tailwind CSS, TypeScript, Zustand, Socket.io client |
| ML Detection | ONNX Runtime Web, YOLOv8-nano |
| Backend | Node.js 20, Express, Socket.io |
| Database | PostgreSQL + Prisma ORM |
| Cache | Redis |
| Real-time | WebRTC (P2P), Socket.io (signaling) |
| Storage | AWS S3 or local disk |
| Billing | Stripe |
| Notifications | Nodemailer (SMTP) + web-push (VAPID) |
| Mobile | Capacitor (Android + iOS), `@capawesome/capacitor-torch` |
| Containers | Docker + Docker Compose |
| Proxy | Nginx |
| Deploy (prod) | Fly.io (backend) + Cloudflare Pages (frontend) |

---

## Quick Start (local dev)

```bash
# 1. Start infrastructure
docker compose up postgres redis -d

# 2. Install dependencies
cd backend && npm install
cd ../frontend && npm install

# 3. Configure environment
cp backend/.env.example backend/.env   # edit DATABASE_URL + JWT secrets

# 4. Set up database
cd backend && npm run db:generate && npm run db:migrate:dev && npm run db:seed

# 5. Start servers
cd backend  && npm run dev   # port 5000
cd frontend && npm run dev   # port 5173
```

Open http://localhost:5173 and log in. The seed script prints credentials to the terminal — set `ADMIN_PASSWORD` / `DEMO_PASSWORD` in `backend/.env` to use custom passwords, or leave them blank for randomly generated ones.

> **Mobile:** Run `npx cap sync` then `npx cap open ios` / `npx cap open android` to build native apps.

---

## Testing

| Suite | Framework | Count | Location |
|-------|-----------|-------|----------|
| Unit tests | Vitest | 35 | `frontend/src/**/*.test.js` |
| Integration | Jest + Supertest | 30 | `backend/src/__tests__/` |
| E2E | Playwright | 16 | `frontend/e2e/` |
| **Total** | | **81** | |

Run tests:

```bash
cd frontend && npm test          # unit tests
cd backend  && npm test          # integration tests
cd frontend && npm run test:e2e  # E2E (requires preview server)
cd frontend && npm run test:e2e:ci  # E2E with CI mode
```

See [docs/TESTING.md](docs/TESTING.md) for full details.

---

## Documentation

| Doc | Description |
|-----|-------------|
| [ARCHITECTURE.md](docs/ARCHITECTURE.md) | System design, WebRTC flow, data models, auth |
| [TESTING.md](docs/TESTING.md) | Test suite structure, CI integration, writing new tests |
| [SETUP.md](docs/SETUP.md) | Step-by-step local dev setup for new developers |
| [API.md](docs/API.md) | Full REST + WebSocket API reference |
| [DEPLOYMENT.md](docs/DEPLOYMENT.md) | Docker, Fly.io, Cloudflare, SSL, TURN, CI/CD |

---

## Project Structure

```
hk-camera/
├── backend/
│   ├── src/
│   │   ├── __tests__/        # Integration tests (jest + supertest)
│   │   ├── config/           # DB, logger, Redis, storage
│   │   ├── controllers/      # auth, camera, recording, alert, user, turn, subscription
│   │   ├── middleware/        # auth, rate limiter, validator, error handler
│   │   ├── prisma/           # schema.prisma, migrations, seed.js
│   │   ├── routes/           # auth, cameras, recordings, alerts, users, turn, subscriptions, webhook
│   │   ├── services/         # notificationService.js (email + push)
│   │   ├── socket/           # WebRTC signaling server
│   │   └── index.js          # App entry point
│   ├── fly.toml              # Fly.io deployment config
│   ├── Dockerfile
│   ├── jest.config.js
│   └── package.json
├── frontend/
│   ├── src/
│   │   ├── components/       # CameraStream, ViewerStream, CameraControlsPanel, Layout, ProtectedRoute
│   │   ├── contexts/         # AuthContext
│   │   ├── hooks/            # useWebRTC, useMotionDetection, useYoloDetection, useMediaRecorder, ...
│   │   ├── ml/               # Pure detection logic (parseDetections, preprocessFrame, constants)
│   │   ├── pages/            # Landing, Pricing, Billing, Dashboard, CameraView, Viewer, ...
│   │   ├── services/         # api.js (Axios + auto-refresh), advancedCamera.js
│   │   ├── App.jsx
│   │   ├── main.jsx
│   │   └── index.css
│   ├── e2e/                  # Playwright E2E tests
│   ├── public/
│   │   ├── _redirects        # Cloudflare Pages SPA fallback
│   │   ├── models/           # YOLOv8n.onnx (downloaded during CI)
│   │   ├── manifest.json     # PWA manifest
│   │   └── icons/
│   ├── capacitor.config.ts
│   ├── playwright.config.js
│   ├── nginx.conf
│   ├── Dockerfile
│   └── package.json
├── docs/
│   ├── ARCHITECTURE.md
│   ├── TESTING.md
│   ├── SETUP.md
│   ├── API.md
│   └── DEPLOYMENT.md
├── nginx/
│   └── nginx.conf
├── docker-compose.yml
├── coturn/
│   └── turnserver.conf       # Coturn TURN server config
├── setup-oracle.sh
├── tunnel.sh
├── .env.example
└── README.md
```

---

## Demo credentials

Credentials are **never stored in the repo**. Set them via environment variables:

| Variable | Default Email | Purpose |
|----------|---------------|---------|
| `ADMIN_PASSWORD` | `admin@hkcamera.app` | Admin user (set in `backend/.env`) |
| `DEMO_PASSWORD` | `demo@hkcamera.app` | Demo user (set `SEED_DEMO=true` in `backend/.env`) |

If a password env var is empty, the seed script generates a random 16-character password and prints it to the terminal.

---

## Deployment

- **Backend** — Fly.io (`hk-camera-backend`, config in `backend/fly.toml`)
- **Frontend** — Cloudflare Pages (`_redirects` for SPA routing)
- **CI/CD** — GitHub Actions: `ci.yml` (lint, test, build on every push), `deploy.yml` (auto-deploy on master)
- **Self-hosted** — See [DEPLOYMENT.md](docs/DEPLOYMENT.md) for Docker Compose + Oracle Cloud setup

---

## License

MIT
