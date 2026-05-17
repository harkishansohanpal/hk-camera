# HK Camera

> A production-grade home security camera platform. Turn any browser-equipped device into a live security camera with real-time WebRTC streaming, motion detection, two-way audio, and cloud recordings.

---

## Features

- **Live streaming** – Peer-to-peer WebRTC video from any browser (no plugins)
- **Motion detection** – Canvas pixel-diff algorithm with configurable sensitivity and cooldown
- **Two-way audio** – Speak back through the camera device from the viewer
- **Night vision** – Camera2 native Android low-light + canvas IR phosphor overlay modes
- **Torch / flashlight** – Native torch control via WebRTC constraint and Capacitor plugin
- **Granular camera controls** – Exposure, focus, white balance, ISO, brightness, contrast
- **Remote camera control** – Control host camera settings (torch, focus, zoom, etc.) from the viewer
- **Cloud recordings** – Auto-record on motion; store locally or on AWS S3
- **Alerts** – In-app, email (SMTP), and browser push notifications
- **Multi-camera** – Manage multiple cameras per account
- **JWT auth** – Short-lived access tokens with rotating refresh tokens
- **Mobile apps** – Native iOS and Android via Capacitor, installable as PWA
- **User registration** – Self-service account creation

---

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Frontend | React 18, Vite, Tailwind CSS, TypeScript, Zustand, Socket.io client |
| Backend | Node.js 20, Express, Socket.io |
| Database | PostgreSQL + Prisma ORM |
| Cache | Redis |
| Real-time | WebRTC (P2P), Socket.io (signaling) |
| Storage | AWS S3 or local disk |
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

Open http://localhost:5173 and log in with `demo@hkcamera.app` / `Demo123!`.

> **Mobile:** Run `npx cap sync` then `npx cap open ios` / `npx cap open android` to build native apps.

---

## Documentation

| Doc | Description |
|-----|-------------|
| [ARCHITECTURE.md](docs/ARCHITECTURE.md) | System design, WebRTC flow, data models, auth |
| [SETUP.md](docs/SETUP.md) | Step-by-step local dev setup for new developers |
| [API.md](docs/API.md) | Full REST + WebSocket API reference |
| [DEPLOYMENT.md](docs/DEPLOYMENT.md) | Docker, Fly.io, Cloudflare, SSL, TURN, CI/CD |

---

## Project Structure

```
hk-camera/
├── backend/
│   ├── src/
│   │   ├── config/           # DB, logger, Redis, storage
│   │   ├── controllers/      # auth, camera, recording, alert, user, turn
│   │   ├── middleware/        # auth, rate limiter, validator, error handler
│   │   ├── prisma/           # schema.prisma, migrations, seed.js
│   │   ├── routes/           # auth, cameras, recordings, alerts, users, turn
│   │   ├── services/         # notificationService.js (email + push)
│   │   ├── socket/           # WebRTC signaling server
│   │   └── index.js          # App entry point
│   ├── fly.toml              # Fly.io deployment config
│   ├── Dockerfile
│   └── package.json
├── frontend/
│   ├── src/
│   │   ├── components/       # CameraStream, ViewerStream, CameraControlsPanel, Layout, ProtectedRoute
│   │   ├── contexts/         # AuthContext
│   │   ├── hooks/            # useWebRTC, useMotionDetection, useMediaRecorder, useNightVision, useCameraControls
│   │   ├── pages/            # Dashboard, CameraView, Viewer, Recordings, Alerts, Settings, Login, Register
│   │   ├── services/         # api.js (Axios + auto-refresh), advancedCamera.js
│   │   ├── App.jsx
│   │   ├── main.jsx
│   │   └── index.css
│   ├── public/
│   │   ├── _redirects        # Cloudflare Pages SPA fallback
│   │   ├── manifest.json     # PWA manifest
│   │   └── icons/
│   ├── capacitor.config.ts   # Capacitor mobile config
│   ├── android/              # Native Android project
│   ├── ios/                  # Native iOS project
│   ├── nginx.conf
│   ├── Dockerfile
│   └── package.json
├── docs/
│   ├── ARCHITECTURE.md
│   ├── SETUP.md
│   ├── API.md
│   └── DEPLOYMENT.md
├── nginx/
│   └── nginx.conf
├── docker-compose.yml
├── setup-oracle.sh           # Oracle Cloud provisioning script
├── tunnel.sh                 # Tailscale Funnel script
├── .env.example
└── README.md
```

---

## Demo credentials

| Role | Email | Password |
|------|-------|----------|
| Admin | admin@hkcamera.app | Admin123! |
| Demo user | demo@hkcamera.app | Demo123! |

---

## Deployment

- **Backend** — Fly.io (`hk-camera-backend`, config in `backend/fly.toml`)
- **Frontend** — Cloudflare Pages (`_redirects` for SPA routing)
- **Alternative** — `cloudflare/workers-autoconfig` branch has a unified Cloudflare Workers deployment
- **Self-hosted** — See [DEPLOYMENT.md](docs/DEPLOYMENT.md) for Docker Compose + Oracle Cloud setup

---

## License

MIT
