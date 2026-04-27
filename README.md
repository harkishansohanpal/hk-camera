# HK Camera

> A production-grade home security camera platform. Turn any browser-equipped device into a live security camera with real-time WebRTC streaming, motion detection, two-way audio, and cloud recordings.

---

## Features

- **Live streaming** – Peer-to-peer WebRTC video from any browser (no plugins)
- **Motion detection** – Canvas pixel-diff algorithm with configurable sensitivity and cooldown
- **Two-way audio** – Speak back through the camera device from the viewer
- **Cloud recordings** – Auto-record on motion; store locally or on AWS S3
- **Alerts** – In-app, email (SMTP), and browser push notifications
- **Multi-camera** – Manage multiple cameras per account
- **JWT auth** – Short-lived access tokens with rotating refresh tokens

---

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Frontend | React 18, Vite, Tailwind CSS, Socket.io client |
| Backend | Node.js 20, Express, Socket.io |
| Database | PostgreSQL + Prisma ORM |
| Cache | Redis |
| Real-time | WebRTC (P2P), Socket.io (signaling) |
| Storage | AWS S3 or local disk |
| Notifications | Nodemailer (SMTP) + web-push (VAPID) |
| Containers | Docker + Docker Compose |
| Proxy | Nginx |

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

---

## Documentation

| Doc | Description |
|-----|-------------|
| [ARCHITECTURE.md](docs/ARCHITECTURE.md) | System design, WebRTC flow, data models, auth |
| [SETUP.md](docs/SETUP.md) | Step-by-step local dev setup for new developers |
| [API.md](docs/API.md) | Full REST + WebSocket API reference |
| [DEPLOYMENT.md](docs/DEPLOYMENT.md) | Docker, SSL, TURN server, CI/CD, AWS scaling |

---

## Project Structure

```
hk-camera/
├── backend/
│   ├── src/
│   │   ├── config/          # DB, logger, Redis, storage
│   │   ├── controllers/     # Route handlers
│   │   ├── middleware/       # Auth, rate limiter, validator, error handler
│   │   ├── prisma/          # Schema + seed
│   │   ├── routes/          # Express routers
│   │   ├── services/        # Notifications, storage
│   │   ├── socket/          # WebRTC signaling server
│   │   └── index.js         # App entry point
│   ├── Dockerfile
│   └── package.json
├── frontend/
│   ├── src/
│   │   ├── components/      # CameraStream, ViewerStream, Layout, …
│   │   ├── contexts/        # AuthContext
│   │   ├── hooks/           # useWebRTC, useMotionDetection, useMediaRecorder
│   │   ├── pages/           # Dashboard, CameraView, Viewer, Recordings, Alerts, Settings
│   │   ├── services/        # api.js (Axios + auto-refresh)
│   │   └── App.jsx
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
└── README.md
```

---

## Demo credentials

| Role | Email | Password |
|------|-------|----------|
| Admin | admin@hkcamera.app | Admin123! |
| Demo user | demo@hkcamera.app | Demo123! |

---

## License

MIT
