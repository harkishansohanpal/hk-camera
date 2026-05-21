# HK Camera – System Architecture

## Overview

HK Camera is a full-stack web application that turns any browser-equipped device into a live security camera system. It supports real-time peer-to-peer video streaming, motion detection, two-way audio, and cloud-based recording.

---

## High-Level Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                        Client Browser                           │
│                                                                 │
│  ┌─────────────────┐          ┌───────────────────────────┐    │
│  │  Camera Device  │          │     Viewer Device          │    │
│  │  (broadcaster)  │          │     (consumer)             │    │
│  │                 │          │                             │    │
│  │  getUserMedia() │          │  <video> remote stream      │    │
│  │  WebRTC offer   │◄────────►│  WebRTC answer              │    │
│  │  Motion detect  │          │  Two-way audio              │    │
│  └────────┬────────┘          └──────────────┬─────────────┘    │
│           │ Socket.io signaling               │                  │
└───────────┼──────────────────────────────────┼──────────────────┘
            │                                  │
            ▼                                  ▼
┌─────────────────────────────────────────────────────────────────┐
│                    Node.js / Express Backend                     │
│                                                                 │
│  ┌─────────────────┐   ┌─────────────────┐  ┌──────────────┐  │
│  │  REST API       │   │  Socket.io       │  │  Static      │  │
│  │  /api/auth      │   │  Signaling       │  │  /recordings │  │
│  │  /api/cameras   │   │  Server          │  │  /uploads    │  │
│  │  /api/recordings│   │  (WebRTC relay)  │  │              │  │
│  │  /api/alerts    │   └─────────────────┘  └──────────────┘  │
│  └────────┬────────┘                                            │
│           │                                                     │
└───────────┼─────────────────────────────────────────────────────┘
            │
    ┌───────┼────────┐
    │       │        │
    ▼       ▼        ▼
┌──────┐ ┌──────┐ ┌────────────────┐
│ PG   │ │Redis │ │  S3 / Local    │
│ DB   │ │Cache │ │  File Storage  │
└──────┘ └──────┘ └────────────────┘
```

---

## Component Breakdown

### Frontend (React + Vite)

| Component | Responsibility |
|-----------|---------------|
| `AuthContext` | Global auth state, JWT management, auto-refresh |
| `ThemeContext` | Dark/light theme toggle, persisted to localStorage via `dark` class on `<html>` |
| `useWebRTC` | WebRTC peer connection lifecycle for both camera and viewer roles |
| `useMotionDetection` | Canvas pixel-diff algorithm for detecting movement |
| `useMediaRecorder` | MediaRecorder API wrapper, upload to backend on stop |
| `CameraView` page | Camera-device page – captures local stream, broadcasts, runs detection |
| `Viewer` page | Viewer page – receives remote stream via WebRTC |
| `Dashboard` | Camera management CRUD |
| `Recordings` | Browse, play, delete recorded clips |
| `Alerts` | View and manage motion/status alerts |
| `Layout` | Sidebar + tab bar with navigation, user menu, theme toggle |

### Backend (Node.js + Express)

| Module | Responsibility |
|--------|---------------|
| `src/index.js` | App bootstrap, middleware registration, graceful shutdown |
| `src/socket/signalingServer.js` | Socket.io WebRTC signaling (offer/answer/ICE relay) |
| `src/routes/` | Express routers for each resource |
| `src/controllers/` | Business logic, DB queries, service calls |
| `src/middleware/auth.js` | JWT verification, role checks, camera ownership guard |
| `src/services/notificationService.js` | Email (Nodemailer) + Web Push notifications |
| `src/config/storage.js` | Multer disk / S3 upload strategies |
| `src/prisma/schema.prisma` | Database schema (User, Camera, Recording, Alert) |

---

## WebRTC Signaling Flow

WebRTC requires an out-of-band "signaling" channel to exchange SDP and ICE candidates. We use Socket.io for this.

```
Camera Browser                  Signaling Server              Viewer Browser
      │                               │                              │
      │── connect (auth: streamKey) ──►│                              │
      │                               │◄─── connect (auth: JWT) ─────│
      │                               │                              │
      │                               │◄─── viewer:join(streamKey) ──│
      │◄──── viewer:joined ───────────│                              │
      │                               │◄─── viewer:offer(sdp) ───────│
      │◄──── viewer:offer(sdp) ───────│                              │
      │                               │                              │
      │── camera:answer(sdp) ────────►│                              │
      │                               │──── camera:answer(sdp) ─────►│
      │                               │                              │
      │── ice:candidate ─────────────►│──── ice:candidate ──────────►│
      │◄─────────────────────────────-│◄──── ice:candidate ──────────│
      │                               │                              │
      │◄══════ Direct P2P WebRTC ══════════════════════════════════►│
```

Once the peer connection is established, media flows **directly between the two browsers** (P2P). The signaling server is no longer involved.

---

## Motion Detection Algorithm

The `useMotionDetection` hook uses a canvas-based pixel-difference approach:

1. Every 200 ms, the current video frame is drawn onto an offscreen `<canvas>` scaled down to 160×90 px for performance.
2. The raw RGBA pixel data is compared to the previous frame using `getImageData()`.
3. For each pixel, the mean absolute difference across RGB channels is computed.
4. If the difference exceeds 25/255, the pixel is counted as "changed".
5. If the ratio of changed pixels exceeds the `sensitivity` threshold (1–100%), `onMotion()` fires.
6. A cooldown period (default 3 s) prevents alert storms.

---

## Data Models

```
User ──── Camera ──── Recording
 │          └──────── Alert
 └─────────────────── Alert
 └── RefreshToken
```

**User** – account, notification preferences, push subscription.  
**Camera** – stream key, settings (sensitivity, record-on-motion, etc.).  
**Recording** – video file reference, trigger type, duration.  
**Alert** – motion/offline events, read state, optional thumbnail.

---

## Theming System

The app uses CSS custom properties with Tailwind's `darkMode: 'class'` strategy for light/dark theme support:

- **`<html class="dark">`** toggles all CSS variables from their `:root` (light) defaults to `.dark` overrides
- Variables defined for: page bg, card bg, text (primary/secondary/tertiary), input bg, shadows, Apple system colors
- Tailwind extension classes (`bg-page`, `bg-card`, `text-text-primary`, etc.) map to these variables
- All component styles use variable-based classes — no hardcoded light/dark color pairs
- Theme preference persisted in `localStorage('hk-camera-theme')`, defaults to `dark`

## Authentication

- **Access token** – short-lived JWT (15 min), attached to every API request via `Authorization: Bearer`.
- **Refresh token** – long-lived (7 days), stored in DB. On 401 the frontend auto-requests a new access token.
- **Token rotation** – each refresh issues a new refresh token and invalidates the old one.
- **Camera auth** – camera devices authenticate via `streamKey` (UUID) on the Socket.io handshake rather than JWT.

---

## Storage Strategies

Controlled by `STORAGE_STRATEGY` env var:

| Strategy | Description |
|----------|-------------|
| `local`  | Files saved to `./uploads` and `./recordings` on disk. Served via Express static. Default for development. |
| `s3`     | Files uploaded to AWS S3. URLs returned from API are public S3 object URLs. |

---

## Notification Channels

| Channel | Library | Trigger |
|---------|---------|---------|
| Email | Nodemailer (SMTP) | Motion detected, recording saved, camera offline |
| Web Push | web-push (VAPID) | Motion detected |

Both channels are optional – the system degrades gracefully if SMTP or VAPID keys are not configured.
