## Goal
- Deploy HK Camera project (frontend + backend) to production and fix responsive UI for mobile screens.

## Constraints & Preferences
- Frontend on Cloudflare, backend on Fly.io (since Cloudflare Workers can't run Express/Socket.io/Prisma/Redis).
- User wants everything to fit properly on phone screens.

## Progress
### Done
- Deployed backend on Fly.io (hk-camera-backend.fly.dev).
  - Created Fly app, attached Postgres (hk-camera-db), created Upstash Redis (hk-camera-redis).
  - Fixed Dockerfile (openssl install → switch to node:20-bookworm for Prisma).
  - Added docker-entrypoint.sh that runs prisma migrate deploy + db push before app start.
  - Set backend secrets: DATABASE_URL, REDIS_URL, JWT_SECRET, JWT_REFRESH_SECRET, CLIENT_URL, CLOUDFLARE_TURN_TOKEN_ID, CLOUDFLARE_TURN_API_TOKEN, etc.
  - Ran seed script: demo@hkcamera.app / Demo123! + admin@hkcamera.app / Admin123!.
- Deployed frontend on Cloudflare Pages (hk-camera.pages.dev).
  - Built with VITE_API_URL and VITE_SOCKET_URL pointing to Fly backend.
  - Added _redirects (/* /index.html 200) for SPA client-side routing.
- Login works from both API and browser. TURN credentials configured for WebRTC across networks.
- Rewrote index.css, Layout.jsx, and Dashboard.jsx for responsive mobile layout (clamp font-size, safe-area-insets, bottom tab bar, compact stats/grid/cards, overflow handling).
- Rewrote CameraStream.jsx for mobile: smaller button sizes (w-9 h-9 sm:w-10 sm:h-11), responsive text (text-[10px] sm:text-xs labels, text-[11px] sm:text-sm main button), overflow-x-auto on controls bar, min-height for empty state, flex-shrink-0 to prevent collapse.
- Rewrote CameraView.jsx for mobile: all buttons use w-9 h-9 sm:w-10 sm:h-11, responsive headings (text-base sm:text-xl), stats grid: grid-cols-1 sm:grid-cols-2 with gap-2 sm:gap-4, card text sizing with sm: prefixes, page-container max-w-3xl.
- Rewrote CameraControlsPanel.jsx: button uses w-9 h-9 sm:w-10 sm:h-11, text-[10px] sm:text-xs labels, removed debug logs, removed unused ChevronDown import.
- Rewrote Viewer.jsx bottom controls: all buttons use w-9 h-9 sm:w-10 sm:h-11 with flex-shrink-0, text-[10px] sm:text-xs labels.
- Rewrote Recordings.jsx: responsive title (text-xl sm:text-2xl), reduced gaps on mobile, smaller icons (14px), responsive text (text-[10px] sm:text-xs), smaller checkboxes/play button on mobile (w-9 h-9 sm:w-10 sm:h-10/14).
- Rewrote Alerts.jsx: responsive title, reduced gaps on mobile, smaller icon/thumbnail on mobile, responsive text throughout.
- Rewrote Settings.jsx: responsive title/card headings, reduced gaps on mobile, min-h-[44px] for toggle rows (touch target), smaller icon sizes, responsive labels.
- Rebuilt & redeployed frontend to Cloudflare Pages production (hk-camera.pages.dev).

### Blocked
- (none)

## Key Decisions
- Backend on Fly.io (not Workers) because Express, Socket.io, Prisma (TCP), Redis, multer need Node.js runtime.
- node:20-bookworm base image instead of slim because Prisma's OpenSSL detection fails on slim.
- Cloudflare Pages (not Workers) for frontend SPA; Workers would serve source files not dist/.
- TURN from Cloudflare Calls to bridge WebRTC across different networks (cellular ↔ WiFi).

## Next Steps
- (none — all mobile rewrites complete)

## Critical Context
- Backend health: GET /api/health → 200.
- Login: POST /api/auth/login with demo@hkcamera.app / Demo123! returns accessToken + refreshToken.
- TURN endpoint (GET /api/turn-credentials) returns Cloudflare TURN ICE servers.
- Console errors about "message channel closed" are browser extension noise (DevTools), not app bugs.
- Frontend built JS contains the backend URL (hk-camera-backend.fly.dev) correctly.
- CORS headers allow origin hk-camera.pages.dev with credentials.

## Relevant Files
- frontend/src/index.css: global styles, safe-area-insets, clamp font-size, component classes.
- frontend/src/components/Layout.jsx: sidebar (desktop) + bottom tab bar (mobile) + main content area.
- frontend/src/pages/Dashboard.jsx: camera grid, stats strip, add-camera modal.
- frontend/src/pages/CameraView.jsx: live camera broadcast page, WebRTC, motion detection, recording, night vision, torch, screen dim, background mode.
- frontend/src/pages/Viewer.jsx: live viewer page for watching a camera.
- frontend/src/components/CameraStream.jsx: video stream display with responsive overlay controls (flip, mic, record, camera controls panel, go-live button).
- frontend/src/components/CameraControlsPanel.jsx: camera action buttons (torch, flip, mic, etc.).
- frontend/src/components/ViewerStream.jsx: viewer-side stream display.
- frontend/src/pages/Recordings.jsx: recording list and playback.
- frontend/src/pages/Alerts.jsx: alert list.
- frontend/src/pages/Settings.jsx: user settings page.
- backend/src/controllers/turnController.js: Cloudflare TURN credential generation.
- backend/src/index.js: Express app, CORS config, Socket.io signaling, routes.
