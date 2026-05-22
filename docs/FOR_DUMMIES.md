# Build Your Own HK Camera For Dummies

**A totally serious guide to building a real-time camera streaming platform without losing your mind**

---

## About This Book

You want to build what HK Camera does: turn a phone into a live-streaming security camera, watch it from a browser, detect motion, record clips, all in real-time. This book walks through the entire architecture, the hard-won lessons, and the gotchas that'll make you question your career choices.

**Assumed knowledge:** You know JavaScript, React, Node.js, and have heard of WebRTC. You may or may not have blocked WebRTC from your memory. That's fine. We'll fix that.

---

## Part I: The Big Picture

### Chapter 1: What Are We Building?

```
┌─────────────────────┐       WebSocket + WebRTC       ┌──────────────────────┐
│   Camera (Phone)    │ ◄────────────────────────────► │   Viewer (Browser)   │
│  - Captures video   │                                 │  - Displays video    │
│  - Sends via WebRTC │                                 │  - Records clips     │
│  - Detects motion   │                                 │  - Sends commands    │
│  - Receives commands│                                 │  - Torch / zoom etc  │
└─────────┬───────────┘                                 └──────────┬───────────┘
          │                                                        │
          │              ┌──────────────────────────┐              │
          └──────────────►   Signaling Server (WS)   ◄──────────────┘
                         │  - Socket.IO              │
                         │  - Routes messages         │
                         │  - Tracks online status    │
                         │  - Forwards offers/answers │
                         └────────────┬───────────────┘
                                      │
                         ┌────────────▼───────────────┐
                         │   REST API (Express)        │
                         │  - CRUD cameras/users       │
                         │  - Auth (JWT)               │
                         │  - TURN credentials         │
                         │  - Admin routes             │
                         └────────────────────────────┘
```

**The core insight:** Video never touches the server. The server just helps the camera and viewer find each other (signaling) and then gets out of the way. The video flows peer-to-peer via WebRTC. This means your server can be a tiny $5 VPS and still support HD streaming.

### Chapter 2: Tech Stack (Why We Picked What We Picked)

| Piece | Choice | Why |
|-------|--------|-----|
| Backend runtime | Node.js + Express | Everyone knows it. Huge ecosystem. Async I/O is perfect for signaling. |
| Real-time transport | Socket.IO | WebSocket with fallbacks, rooms, auto-reconnection. Saves thousands of lines of boilerplate. |
| WebRTC | Native browser APIs | No libraries. The browser APIs are surprisingly good (once you understand them). |
| Database | PostgreSQL via Prisma ORM | Reliable, migrations are smooth, Prisma gives type safety without TypeScript. |
| Cache | Redis | For rate limiting, session management, future scalability. |
| Frontend | React (Vite) | Fast dev server, simple build, good tree-shaking. |
| Deployment | Cloudflare Pages (frontend) + Fly.io (backend) | Edge CDN + global VMs. Cheap. Easy. |
| TURN | Cloudflare TURN + Coturn fallback | Cloudflare gives free TURN up to 10 TB. Coturn self-hosted as backup. |
| Bot protection | Cloudflare Turnstile | Free, no captcha, privacy-friendly. |
| CI/CD | GitHub Actions | Runs tests, lints, audits, deploys on push to master. |

> **Technical Stuff:** You can swap any of these. The architecture is decoupled. PostgreSQL can be SQLite for local dev. Fly.io can be any VPS. The key is the signaling pattern, not the specific tools.

---

## Part II: The Signaling Server (The Brain)

### Chapter 3: What Is Signaling?

Before two browsers can send video to each other, they need to:
1. **Find each other** — "Hey, camera X exists and wants to connect"
2. **Agree on how to talk** — "I support H.264 and VP9. Pick one."
3. **Exchange network info** — "I'm at 192.168.1.5 and here's my public IP too"
4. **Actually connect** — ICE does its magic

Steps 1-3 are **signaling**. Step 4 is **WebRTC**. The server only participates in 1-3. After that, video flows directly.

**File:** `backend/src/socket/signalingServer.js`

### Chapter 4: Authentication — Two Types of Users

The signaling server supports two auth methods in one middleware:

```js
// Socket.IO middleware — runs on every connection attempt
io.use(async (socket, next) => {
  const { token, streamKey } = socket.handshake.auth;

  if (streamKey) {
    // Camera: authenticate by stream key (a UUID)
    const camera = await prisma.camera.findUnique({ where: { streamKey } });
    if (!camera) return next(new Error('Invalid stream key'));
    socket.cameraId  = camera.id;
    socket.streamKey = streamKey;
    socket.role      = 'camera';
    socket.userId    = camera.user.id;
  } else if (token) {
    // Viewer: authenticate by JWT
    const payload = jwt.verify(token, process.env.JWT_SECRET);
    socket.userId = payload.sub;
    socket.role   = 'viewer';
  } else {
    return next(new Error('Authentication required'));
  }
  next();
});
```

> **Remember:** Cameras use stream keys (no session, no expiry, designed for headless devices). Viewers use JWTs (short-lived, session-based). They're different auth models for different use cases. Don't mix them up.

### Chapter 5: The Two Maps That Run Everything

The entire signaling server runs on two in-memory Maps:

```js
const cameras = new Map(); // streamKey → socket.id
const viewers = new Map(); // streamKey → Set<socket.id>
```

**`cameras`** — Maps a stream key to the camera's socket ID. Only one camera per stream key at a time.
**`viewers`** — Maps a stream key to a Set of viewer socket IDs. Multiple viewers can watch one camera.

> **Warning:** These Maps are in-memory. If the server restarts, they're gone. This means every camera has to reconnect. Existing viewers will lose their connection and need to retry. This is a known limitation. For production, you'd persist this state in Redis.

### Chapter 6: The Camera Connect/Disconnect Dance

**Camera connects:**
```js
// signalingServer.js
cameras.set(key, socket.id);
socket.join(`camera:${key}`);
prisma.camera.update({ where: { id: socket.cameraId }, data: { isOnline: true } });
io.to(`camera:${key}`).emit('camera:online', { cameraId: socket.cameraId });
```

**Camera disconnects:**
```js
socket.on('disconnect', () => {
  // GUARD: only if this socket is still the registered camera
  if (cameras.get(key) === socket.id) {
    cameras.delete(key);
    prisma.camera.update({ where: { id: socket.cameraId }, data: { isOnline: false } });
    io.to(`camera:${key}`).emit('camera:offline', { cameraId: socket.cameraId });
  }
});
```

> **Technical Stuff:** The guard `cameras.get(key) === socket.id` is critical. It prevents a race where:
> 1. Camera disconnects (event queued)
> 2. Camera reconnects with new socket → `cameras.set(key, newSocketId)`
> 3. Old disconnect handler runs → guard fails → no spurious `camera:offline`
>
> Without this guard, a quick stop/start would broadcast a false offline event, confusing viewers.

### Chapter 7: The Viewer Join Flow

When a viewer wants to watch:

```js
socket.on('viewer:join', async ({ streamKey }) => {
  // 1. Look up camera in DB
  const camera = await prisma.camera.findUnique({ where: { streamKey } });
  if (!camera) { socket.emit('error', { message: 'Camera not found' }); return; }

  // 2. Verify ownership (or access control)
  if (camera.userId !== socket.userId) { socket.emit('error', { message: 'Access denied' }); return; }

  // 3. Join the camera room
  socket.join(`camera:${streamKey}`);

  // 4. Track the viewer
  viewers.get(streamKey)?.add(socket.id);

  // 5. Tell the viewer if camera is online
  socket.emit('camera:status', { online: cameras.has(streamKey), cameraId: camera.id });

  // 6. If camera is online, tell the camera a viewer is ready
  if (cameras.has(streamKey)) {
    io.to(cameras.get(streamKey)).emit('viewer:joined', { viewerSocketId: socket.id });
  }
});
```

**Key insight:** The `viewer:join` event is idempotent. A viewer can emit it multiple times (e.g., when retrying). The server handles it gracefully — joining an already-joined room is a no-op for Socket.IO.

### Chapter 8: The Offer/Answer Relay

This is the core WebRTC signaling pattern:

```
Viewer                          Server                        Camera
  │                               │                              │
  │── viewer:offer { offer } ────►│                              │
  │                               │── forward to camera ────────►│
  │                               │                              │── createAnswer()
  │                               │◄── camera:answer { answer } ──│
  │◄── forward to viewer ────────│                              │
  │                               │                              │
  │── ice:candidate { cand } ────►│                              │
  │                               │── forward to camera ────────►│
  │                               │◄── ice:candidate { cand } ───│
  │◄── forward to viewer ────────│                              │
```

**Server-side relay** (signalingServer.js):

```js
// Viewer sends offer → forward to camera
socket.on('viewer:offer', ({ offer }) => {
  const cameraSocketId = cameras.get(socket.streamKey);
  if (!cameraSocketId) { socket.emit('error', { message: 'Camera offline' }); return; }
  io.to(cameraSocketId).emit('viewer:offer', { viewerSocketId: socket.id, offer });
});

// Camera sends answer → forward to viewer
socket.on('camera:answer', ({ viewerSocketId, answer }) => {
  io.to(viewerSocketId).emit('camera:answer', { answer });
});

// ICE candidates flow both ways
socket.on('ice:candidate', ({ candidate, viewerSocketId }) => {
  io.to(viewerSocketId).emit('ice:candidate', { candidate, from: 'camera' });
});
```

> **Remember:** The server is a dumb pipe for WebRTC messages. It doesn't inspect offers or candidates. It just forwards them. This is by design — the less the server does, the less can break.

---

## Part III: The Frontend — useWebRTC Hook (The Heart)

### Chapter 9: Why a Shared Hook?

Both the Camera page and the Viewer page need to:
- Open a Socket.IO connection
- Handle WebRTC peer connections
- Exchange offers/answers/ICE
- Track connection state

Duplicating this logic would be madness. Instead, there's one hook:

```js
const { status, remoteStream, startBroadcast, stopBroadcast,
        connectViewer, disconnectViewer, rejoinViewer, sendCommand }
  = useWebRTC({ role: 'camera'|'viewer', streamKey, onCommand });
```

**File:** `frontend/src/hooks/useWebRTC.js`

### Chapter 10: The Viewer Side

```js
const connectViewer = useCallback(async () => {
  setStatus('connecting');
  closePeerConnection(); // Clean slate

  const socket = io(SOCKET_URL, {
    auth: { token: localStorage.getItem('accessToken') },
    transports: ['websocket'],
    reconnection: false, // We manage reconnection ourselves
  });

  let isActive = true;

  socket.on('connect', () => {
    socket.emit('viewer:join', { streamKey });
  });

  socket.on('camera:status', async ({ online, cameraId }) => {
    if (!isActive) return;
    if (online) {
      await initiateOffer(socket, isActive);
    } else {
      setStatus('waiting');
    }
  });

  socket.on('camera:online', async () => {
    if (!isActive) return;
    closePeerConnection();   // <-- Reset stale state
    await initiateOffer(socket, isActive);
  });

  socket.on('camera:offline', () => {
    if (isActive) {
      closePeerConnection();
      setStatus('waiting');
    }
  });

  socket.on('camera:answer', async ({ answer }) => {
    const pc = pcRef.current;
    if (!pc) return;
    await pc.setRemoteDescription(new RTCSessionDescription(answer));
    // Flush buffered ICE candidates
    for (const c of pendingCandidates.current) {
      await pc.addIceCandidate(new RTCIceCandidate(c));
    }
  });

  return () => { isActive = false; /* cleanup listeners */ };
}, [streamKey]);
```

**The `isActive` pattern:** A closure variable that goes `false` when the component unmounts or the socket disconnects. Every handler checks it before acting. This prevents stale closures from modifying state after cleanup.

> **Warning:** The `isActive` flag is one-way. Once `false`, it stays `false`. If the socket disconnects and reconnects, a new `connectViewer` call creates a new socket and a new `isActive`. The old one is dead. Garbage collected. Gone.

### Chapter 11: The Camera Side

```js
const startBroadcast = useCallback(async (mediaStream) => {
  setStatus('connecting');

  // Dispose old socket if any
  socketRef.current?.disconnect();

  const socket = io(SOCKET_URL, {
    auth: { streamKey },
    transports: ['websocket'],
  });

  socket.on('connect', () => setStatus('connected'));

  // Handle multiple viewers — one PC per viewer
  socket.on('viewer:offer', async ({ viewerSocketId, offer }) => {
    const iceServers = await fetchIceServers();

    // Close existing connection for this specific viewer (if re-offer)
    if (viewerPCsRef.current.has(viewerSocketId)) {
      viewerPCsRef.current.get(viewerSocketId).pc.close();
    }

    const pc = createPeerConnection(iceServers, (candidate) => {
      socket.emit('ice:candidate', { viewerSocketId, candidate });
    });

    mediaStream.getTracks().forEach(track => pc.addTrack(track, mediaStream));
    await pc.setRemoteDescription(new RTCSessionDescription(offer));

    const answer = await pc.createAnswer();
    await pc.setLocalDescription(answer);
    socket.emit('camera:answer', { viewerSocketId, answer });
  });
}, [streamKey]);
```

> **Technical Stuff:** The camera uses a Map of peer connections (`viewerPCsRef`), one per viewer. This allows multiple viewers to watch simultaneously. Each viewer gets their own WebRTC session. Yes, this means the camera uploads video N times for N viewers. For a phone on cellular, this kills the data plan. On Wi-Fi, it's fine for 2-3 viewers.

### Chapter 12: The initiateOffer Function

This is where things get real:

```js
async function initiateOffer(socket, isActive) {
  if (offerInFlightRef.current) return; // Guard against double offers
  offerInFlightRef.current = true;

  try {
    // Close old PC
    pcRef.current?.close();

    // Fetch ICE servers (TURN/STUN) — cached for 24h
    const iceServers = await fetchIceServers();

    // Create new PC
    const pc = createPeerConnection(iceServers, (candidate) => {
      socket.emit('ice:candidate', { candidate });
    });

    pc.ontrack = (e) => setRemoteStream(e.streams[0]);

    pc.onconnectionstatechange = () => {
      const s = pc.connectionState;
      if (s === 'connected')  setStatus('connected');
      if (s === 'disconnected') setStatus('disconnected');
      if (s === 'failed')     setStatus('error');
    };

    pc.addTransceiver('video', { direction: 'recvonly' });
    pc.addTransceiver('audio', { direction: 'recvonly' });

    const offer = await pc.createOffer();
    await pc.setLocalDescription(offer);
    socket.emit('viewer:offer', { offer });
  } catch (err) {
    offerInFlightRef.current = false;
    setStatus('error');
  }
}
```

**The `offerInFlightRef` guard:** Prevents double offers when `camera:status` and `camera:online` arrive at the same time. One sets the flag, the other sees it's set and skips. Without this, you get two parallel offers, two answers, two peer connections — chaos.

> **Remember:** The `offerInFlightRef` kept us up at night. We originally had a bug where it would get stuck `true` if an offer failed mid-way, and then every subsequent `camera:online` would be silently skipped. The fix: always call `closePeerConnection()` before `initiateOffer()` in the `camera:online` handler, which resets the flag. This is why code review matters.

### Chapter 13: ICE Candidate Buffering

Here's a subtle issue: ICE candidates can arrive before the remote description is set. If you try to add a candidate without a remote description, the browser throws.

**Solution:** Buffer candidates until the remote description is set:

```js
const pendingCandidates = useRef([]);

// When candidate arrives:
if (!pc.remoteDescription) {
  pendingCandidates.current.push(candidate);
} else {
  await pc.addIceCandidate(new RTCIceCandidate(candidate));
}

// When remote description is set:
for (const c of pendingCandidates.current) {
  await pc.addIceCandidate(new RTCIceCandidate(c));
}
pendingCandidates.current = [];
```

---

## Part IV: Retry Logic (Staying Alive)

### Chapter 14: The Viewer Retry State Machine

```
        ┌─────────┐
        │  idle   │
        └────┬────┘
             │ connectViewer()
             ▼
        ┌───────────┐
        │ connecting │ ← timeout 15s → handleRetry()
        └─────┬─────┘
              │
    ┌─────────┼─────────┐
    ▼         ▼         ▼
┌───────┐ ┌────────┐ ┌───────┐
│connected│ │ waiting│ │ error │
└───────┘ └───┬────┘ └───┬───┘
              │          │
              │ camera:  │
              │ online   │ handleRetry() ──► disconnectViewer()
              │          │                     │ 500ms delay
              ▼          │                     ▼
         initiateOffer() │               connectViewer()
                          │
                    [back to
                     connecting]
```

**Viewer.jsx implements this with two effects:**

```js
// Retry on disconnect/error (exponential backoff)
useEffect(() => {
  if (status !== 'disconnected' && status !== 'error') return;
  const delay = RETRY_DELAYS[Math.min(retryCount, RETRY_DELAYS.length - 1)];
  // RETRY_DELAYS = [1, 2, 5, 15, 30, 60] seconds
  const timer = setTimeout(() => handleRetry(), delay * 1000);
  return () => clearTimeout(timer);
}, [status]);

// Re-check camera status while waiting (every 8s)
useEffect(() => {
  if (status !== 'waiting') return;
  const interval = setInterval(() => rejoinViewer(), 8000);
  return () => clearInterval(interval);
}, [status]);
```

`rejoinViewer` just re-emits `viewer:join`. The server responds with the current `camera:status`. If the camera is back, the offer flow starts. If not, the viewer stays in `waiting`.

> **Technical Stuff:** The `waiting` state is distinct from `disconnected`. `waiting` means "the socket is fine, but the camera isn't here." `disconnected` means "the socket itself died." Different causes, different recovery strategies.

---

## Part V: The REST API

### Chapter 15: What the REST API Does

While signaling handles real-time communication, the REST API handles everything else:

| Endpoint | Purpose |
|----------|---------|
| `POST /api/auth/register` | Create account |
| `POST /api/auth/login` | Get JWT |
| `POST /api/auth/refresh` | Refresh JWT |
| `GET /api/cameras` | List cameras (patches `isOnline` from in-memory Map) |
| `POST /api/cameras` | Create camera |
| `GET /api/cameras/:id` | Get camera details |
| `PATCH /api/cameras/:id` | Update camera settings |
| `DELETE /api/cameras/:id` | Delete camera |
| `POST /api/cameras/:id/heartbeat` | Camera liveness check (every 30s) |
| `GET /api/turn-credentials` | Get TURN/STUN servers for WebRTC |
| `GET /api/admin/users` | Admin: user lookup |
| `PATCH /api/admin/users/suspend` | Admin: suspend user |
| `PATCH /api/admin/users/unsuspend` | Admin: unsuspend user |

**The critical detail** — `isOnline` patching:

```js
// cameraController.js
const patched = cameras.map(c => ({
  ...c,
  isOnline: isCameraOnline(c.streamKey) // checks the in-memory Map, NOT the DB
}));
```

The database has an `isOnline` column, but it's updated asynchronously (fire-and-forget). The source of truth is the in-memory Map in the signaling server. The REST API consults the Map before returning camera data.

> **Remember:** The DB `isOnline` column is eventually consistent with the Map. There's a window where a camera has connected but the DB hasn't updated yet. The Map is always correct. This is intentional — DB writes can fail silently (`.catch(() => {})`), but the Map is transactional.

---

## Part VI: WebRTC Deep Dive

### Chapter 16: What Actually Happens in a WebRTC Connection

1. **Gather candidates:** Both sides figure out how they can be reached (local IP, public IP, TURN relay)
2. **Offer/Answer:** One side (the viewer) creates an SDP offer describing what codecs it supports. The other side (the camera) responds with its answer.
3. **ICE:** Both sides try every candidate pair until one works
4. **Send media:** Once connected, video flows directly (or via TURN if needed)

**The SDP (Session Description Protocol):**
```
v=0
o=- 123456 2 IN IP4 0.0.0.0
s=-
t=0 0
a=group:BUNDLE 0 1
m=video 9 UDP/TLS/RTP/SAVPF 96 97 98
a=rtpmap:96 H264/90000
a=rtpmap:97 VP8/90000
a=rtpmap:98 VP9/90000
a=recvonly
```

Don't worry about parsing this. The browser does it for you. Just know that it describes:
- What media is being exchanged (video, audio)
- What codecs are supported (H.264, VP8, VP9)
- Which direction (sendrecv, recvonly, sendonly)
- Network info (candidates)

### Chapter 17: Why TURN Matters

**STUN:** Helps devices discover their public IP and port. Works if both devices can talk directly (no NAT issues).

**TURN:** Relays traffic through a server when direct connection fails. Needed when:
- Both devices are behind symmetric NATs
- One device is on a corporate VPN
- You're behind a firewall that blocks UDP

**Without TURN, ~15% of connections fail.** With TURN, it's ~99%.

**Cloudflare TURN** is free for up to 10 TB/month. HK Camera uses it by default:

```js
async function fetchIceServers() {
  const { data } = await turnAPI.getCredentials();
  return data.data.iceServers; // [{ urls: 'turn:...', username: '...', credential: '...' }]
}
```

The credentials are cached in a module-level variable for 24 hours. This prevents hammering the backend on every reconnect attempt.

> **Technical Stuff:** TURN credentials are time-limited (default 24h). The server generates them with a shared secret. The client caches them and refreshes when expired. The cache is module-level, shared across all hook instances, so multiple viewers don't each fetch their own.

---

## Part VII: Deployment

### Chapter 18: The CI/CD Pipeline

Every push to `master` triggers:

```
┌─────────┐   ┌──────────┐   ┌───────┐
│ Lint    │──►│ Tests    │──►│ Build │
│ eslint  │   │ vitest + │   │ vite  │
│ audit   │   │ jest     │   │       │
└─────────┘   └─────┬────┘   └───┬───┘
                    │            │
                    ▼            ▼
              ┌─────────┐  ┌──────────┐
              │ Deploy  │  │  Deploy  │
              │ Frontend│  │ Backend  │
              │ Pages   │  │ Fly.io   │
              └────┬────┘  └────┬─────┘
                   │            │
                   ▼            ▼
              ┌─────────────────────┐
              │  Smoke Tests (E2E)  │
              │  against production │
              └─────────────────────┘
```

**Frontend:** `npm run build` → `wrangler pages deploy` → Cloudflare Pages
**Backend:** `flyctl deploy` → Fly.io with Docker

> **Warning:** Deploying automatically to production on every push to master is brave. Make sure your tests actually cover the critical paths. HK Camera runs 96 tests (39 frontend, 57 backend) including integration tests with a real test database.

### Chapter 19: Environment Variables That Matter

```bash
# Backend
DATABASE_URL=postgresql://user:pass@host:5432/db
JWT_SECRET=replace_me_with_something_long_and_random
TURNSTILE_SECRET_KEY=1x0000000000000000000000000000000AA  # Test key (always passes)
ADMIN_PASSWORD=change_me                                  # For admin seed script
STORAGE_STRATEGY=local                                     # or 's3'

# Frontend
VITE_API_URL=https://your-backend.fly.dev
VITE_SOCKET_URL=https://your-backend.fly.dev
VITE_TURNSTILE_SITE_KEY=1x00000000000000000AA  # Test key (use real one in prod)
```

> **Tip:** Turnstile test keys always pass verification. Use them in dev. In production, get real keys from the Cloudflare Dashboard. They're free.

---

## Part VIII: The Bugs We Fixed (So You Don't Have To)

### Chapter 20: The Stale Dashboard Bug

**Symptoms:** Camera goes live but the Dashboard shows it as offline. User has to refresh.

**Root cause:** Dashboard only fetched camera data once on mount via REST. No socket connection. Never received real-time events.

**Fix:** 
1. Added `user:{userId}` rooms on the signaling server
2. On camera connect/disconnect, broadcast to both `camera:{streamKey}` AND `user:{ownerId}`
3. Dashboard opens a socket with `reconnection: true`, listens for `camera:online`/`camera:offline`

```js
// Dashboard.jsx
useEffect(() => {
  const socket = io(SOCKET_URL, {
    auth: { token: localStorage.getItem('accessToken') },
    reconnection: true,
  });
  socket.on('camera:online', ({ cameraId }) => {
    setCameras(prev => prev.map(c => c.id === cameraId ? { ...c, isOnline: true } : c));
  });
  socket.on('camera:offline', ({ cameraId }) => {
    setCameras(prev => prev.map(c => c.id === cameraId ? { ...c, isOnline: false } : c));
  });
  return () => socket.disconnect();
}, []);
```

### Chapter 21: The Viewer Stuck After Camera Restart Bug

**Symptoms:** Camera stops and restarts. Viewer stays on "waiting" forever.

**Root cause:** `handleCameraOnline` had `if (!offerInFlightRef.current)` guard. If a previous offer attempt was stuck (flag never reset), every subsequent `camera:online` was silently ignored.

**Fix:** Always reset stale state before reconnecting:

```js
const handleCameraOnline = async () => {
  if (!isActive) return;
  closePeerConnection(); // Reset offerInFlightRef, close old PC
  await initiateOffer(socket, isActive);
};
```

Also applied the same fix to `handleCameraStatus` — calling `closePeerConnection()` before `initiateOffer()` ensures a clean slate regardless of what state the previous attempt left behind.

### Chapter 22: The Stale Camera Disconnect Bug

**Symptoms:** Camera reconnects quickly, then all viewers get a spurious offline event.

**Root cause:** The old socket's `disconnect` event handler ran after the new socket had already registered. It deleted the camera from the Map even though the new socket was active.

**Fix:** The guard on every camera disconnect handler:

```js
if (cameras.get(key) === socket.id) {
  // Only clean up if this socket is still the registered one
}
```

If a new camera has already connected (and updated `cameras.set(key, newSocketId)`), the old socket's handler sees a mismatch and does nothing.

---

## Part IX: Appendices

### Appendix A: The Complete File Map

```
hk-camera/
├── backend/
│   ├── src/
│   │   ├── socket/
│   │   │   └── signalingServer.js   ← The brain. All WebSocket signaling.
│   │   ├── routes/
│   │   │   ├── auth.js              ← Register, login, refresh
│   │   │   ├── cameras.js           ← CRUD, heartbeat, stream key
│   │   │   ├── turn.js              ← TURN credentials
│   │   │   ├── adminUsers.js        ← User management
│   │   │   └── admin.js             ← Admin dashboard stats
│   │   ├── middleware/
│   │   │   ├── auth.js              ← JWT verification + suspended check
│   │   │   └── turnstile.js         ← Cloudflare Turnstile verification
│   │   ├── controllers/
│   │   │   ├── authController.js
│   │   │   └── cameraController.js  ← isOnline patching from Map
│   │   ├── prisma/
│   │   │   ├── schema.prisma        ← User, Camera, Recording, Alert models
│   │   │   ├── seed.js              ← Creates admin + demo accounts
│   │   │   └── migrations/
│   │   └── index.js                 ← Express + Socket.IO bootstrap
│   ├── Dockerfile
│   └── fly.toml
├── frontend/
│   ├── src/
│   │   ├── hooks/
│   │   │   ├── useWebRTC.js         ← THE hook. Both camera and viewer.
│   │   │   ├── useMotionDetection.js ← Pixel-diff motion
│   │   │   ├── useYoloDetection.js   ← ML-based detection
│   │   │   └── useMediaRecorder.js   ← Record video to server
│   │   ├── pages/
│   │   │   ├── Dashboard.jsx        ← Camera list + stats
│   │   │   ├── CameraView.jsx       ← Broadcast page
│   │   │   ├── Viewer.jsx           ← Watch + controls + retry logic
│   │   │   └── ...
│   │   ├── components/
│   │   │   ├── CameraStream.jsx     ← Camera preview + Go Live button
│   │   │   ├── ViewerStream.jsx     ← Remote video + status overlay
│   │   │   └── ...
│   │   └── services/
│   │       └── api.js               ← Axios client
│   └── e2e/
│       ├── auth-flow.spec.js        ← Register, login, tour, logout
│       └── ...
├── docs/
│   ├── ARCHITECTURE.md
│   ├── SETUP.md
│   ├── DEPLOYMENT.md
│   └── FOR_DUMMIES.md               ← You are here
└── .github/workflows/
    ├── ci.yml                       ← Tests + lint on every PR/push
    └── deploy.yml                   ← Deploy on push to master
```

### Appendix B: Glossary

| Term | Meaning |
|------|---------|
| **Signaling** | The process of setting up a WebRTC connection — finding peers, exchanging offers/answers, sharing ICE candidates |
| **WebRTC** | Browser API for peer-to-peer audio/video communication. No plugins. No servers (after signaling). |
| **SDP** | Session Description Protocol. A text format describing media capabilities (codecs, resolutions, directions). |
| **ICE** | Interactive Connectivity Establishment. The process of finding the best network path between two peers. |
| **TURN** | Traversal Using Relays around NAT. A server that relays traffic when direct P2P fails. |
| **STUN** | Session Traversal Utilities for NAT. A server that tells a client its own public IP and port. |
| **Offer/Answer** | The SDP exchange pattern: Viewer creates an offer, Camera creates an answer. |
| **ICE Candidate** | A potential network path: IP + port + protocol (UDP/TCP). Both sides gather and exchange candidates. |
| **PeerConnection** | The JS object that manages the entire WebRTC session. `RTCPeerConnection`. |
| **Transceiver** | A sender/receiver pair for a media type. `addTransceiver('video', { direction: 'recvonly' })`. |
| **Stream Key** | A UUID that identifies a camera. Like a password. Keep it secret. |
| **Turnstile** | Cloudflare's bot detection. Privacy-friendly captcha alternative. |

### Appendix C: Further Reading

- **WebRTC MDN docs** — https://developer.mozilla.org/en-US/docs/Web/API/WebRTC_API
- **Socket.IO docs** — https://socket.io/docs/v4/
- **Prisma docs** — https://www.prisma.io/docs
- **Cloudflare TURN** — https://developers.cloudflare.com/calls/turn/
- **The original WebRTC spec** — https://www.w3.org/TR/webrtc/
- **ICE RFC 8445** — https://datatracker.ietf.org/doc/html/rfc8445 (for insomniacs)

### Appendix D: About the Author

**Harkishan Sohanpal** spent approximately 4,000 hours building HK Camera so you don't have to. He learned that WebRTC is simultaneously the most impressive and most infuriating browser API ever created. He also learned that `pc.close()` doesn't always fire `connectionstatechange`, that ICE candidates can arrive before the remote description, and that the answer to "should I use a library for WebRTC?" is "no, but you'll wish you had."

Every bug fixed in this guide was paid for in blood, sweat, and sleepless nights. You're welcome.

---

*"For Dummies" is a trademark of John Wiley & Sons, Inc. We are not affiliated. We just like the format. Please don't sue us. We're developers, we have no money.*
