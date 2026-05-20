# HK Camera – Developer Setup Guide

This guide gets a new developer from zero to a running local environment.

---

## Prerequisites

| Tool | Minimum version | Install |
|------|----------------|---------|
| Node.js | 20.x | https://nodejs.org |
| npm | 10.x | bundled with Node |
| Docker + Docker Compose | 24.x | https://www.docker.com |
| Git | any | https://git-scm.com |
| PostgreSQL | 15 (optional – Docker preferred) | https://postgresql.org |

> **macOS shortcut:** `brew install node git` + install Docker Desktop.  
> **Windows:** Use WSL 2 for the best experience.

---

## 1. Clone the repository

```bash
git clone https://github.com/your-org/hk-camera.git
cd hk-camera
```

---

## 2. Start infrastructure with Docker

The quickest way to get Postgres + Redis running:

```bash
docker compose up postgres redis -d
```

Verify they're healthy:

```bash
docker compose ps
```

Both should show `healthy`.

---

## 3. Configure environment variables

### Backend

```bash
cp backend/.env.example backend/.env
```

Open `backend/.env` and set at minimum:

```env
DATABASE_URL=postgresql://hk:secret@localhost:5432/hkdb
JWT_SECRET=any_long_random_string_here
JWT_REFRESH_SECRET=another_long_random_string_here
```

Leave the AWS / SMTP / VAPID fields blank for now – the app works without them in development.

### Frontend

```bash
cp frontend/.env.example frontend/.env   # or create manually
```

Create `frontend/.env`:

```env
VITE_API_URL=http://localhost:5000
VITE_SOCKET_URL=http://localhost:5000
```

---

## 4. Install dependencies

Run both in parallel from the repo root:

```bash
# Terminal 1
cd backend && npm install

# Terminal 2
cd frontend && npm install
```

---

## 5. Set up the database

```bash
cd backend

# Generate the Prisma client (must run after any schema change)
npm run db:generate

# Apply migrations to create all tables
npm run db:migrate:dev

# Seed database (creates plans + optional admin + demo accounts)
# Set ADMIN_PASSWORD / DEMO_PASSWORD in backend/.env for custom passwords,
# or leave blank for randomly generated ones (printed to terminal).
npm run db:seed
```

After seeding you'll see output like:
```
✅ Seed complete
   Admin → admin@hkcamera.app / <random-password>
   Demo  → demo@hkcamera.app  / <random-password>
```
Save the printed passwords — they won't be stored anywhere else.

---

## 6. Start the dev servers

```bash
# Terminal 1 – backend (with hot-reload via nodemon)
cd backend && npm run dev

# Terminal 2 – frontend (Vite HMR)
cd frontend && npm run dev
```

| Service | URL |
|---------|-----|
| React frontend | http://localhost:5173 |
| Express API | http://localhost:5000 |
| Prisma Studio | http://localhost:5555 (run `npm run db:studio` in backend/) |

---

## 7. Test the app end-to-end

1. Open http://localhost:5173 in your browser.
2. Log in with `demo@hkcamera.app` (password was printed during seeding).
3. Click a camera on the Dashboard.
4. Click **Start Broadcasting** – grant camera/microphone permissions when prompted.
5. Open a second browser tab to http://localhost:5173/viewer/`<streamKey>`.
   - Find the stream key by clicking the camera on the dashboard and checking the URL, or by running `npm run db:studio` and inspecting the Camera table.
6. You should see the live feed appear within a few seconds.

---

## Project scripts reference

### Backend (`backend/`)

| Script | What it does |
|--------|-------------|
| `npm run dev` | Start with nodemon (auto-reload) |
| `npm start` | Start in production mode |
| `npm run db:generate` | Regenerate Prisma client after schema changes |
| `npm run db:migrate:dev` | Create a new migration + apply it |
| `npm run db:migrate` | Apply pending migrations (production) |
| `npm run db:seed` | Seed demo data |
| `npm run db:studio` | Open Prisma Studio GUI |
| `npm test` | Run Jest tests |

### Frontend (`frontend/`)

| Script | What it does |
|--------|-------------|
| `npm run dev` | Vite dev server with HMR |
| `npm run build` | Production build to `dist/` |
| `npm run preview` | Preview production build locally |
| `npm run lint` | ESLint |

---

## Common issues

### `DATABASE_URL` error on `npm run db:migrate:dev`
Make sure the Docker postgres container is running (`docker compose up postgres -d`) and that the `DATABASE_URL` in `backend/.env` points to `localhost:5432`.

### Camera permission denied
The browser will only grant camera/microphone access over **HTTPS** or **localhost**. When testing from another device on your network (e.g. a phone), you'll need to serve over HTTPS. Use [`mkcert`](https://github.com/FiloSottile/mkcert) to generate a local certificate and configure Vite/nginx accordingly.

### WebRTC connection fails (no video in viewer)
WebRTC uses STUN servers to negotiate the connection. The default config uses Google's public STUN servers. If you're behind a symmetric NAT or corporate firewall, add TURN server credentials to `useWebRTC.js`:

```js
const ICE_SERVERS = [
  { urls: 'stun:stun.l.google.com:19302' },
  {
    urls: 'turn:your-turn.example.com:3478',
    username: 'user',
    credential: 'password',
  },
];
```

### `LIMIT_FILE_SIZE` error when uploading recordings
The default limit is 500 MB. Adjust `limits.fileSize` in `backend/src/config/storage.js` if needed.

---

## Adding a new API endpoint (step-by-step for new devs)

1. **Schema** – if you need a new table, add the model to `backend/src/prisma/schema.prisma` and run `npm run db:migrate:dev`.
2. **Controller** – create `backend/src/controllers/myFeatureController.js` with async functions that call `prisma.*` and call `next(err)` on errors.
3. **Route** – create `backend/src/routes/myFeature.js` and register it with `app.use('/api/my-feature', myFeatureRoutes)` in `src/index.js`.
4. **Frontend service** – add the API call to `frontend/src/services/api.js`.
5. **Component/page** – build the UI in `frontend/src/pages/` or `frontend/src/components/`.
