# HK Camera – API Reference

Base URL: `http://localhost:5000/api`

All endpoints return JSON with the shape:
```json
{ "success": true, "data": { ... } }
```
or on error:
```json
{ "success": false, "message": "Human-readable error", "errors": [ ... ] }
```

All protected endpoints require an `Authorization: Bearer <accessToken>` header.

---

## Authentication

### POST /auth/register
Create a new account.

**Request body:**
```json
{
  "email": "jane@example.com",
  "password": "SecurePass1!",
  "name": "Jane Smith"
}
```

**Response `201`:**
```json
{
  "success": true,
  "data": {
    "user": { "id": "...", "email": "...", "name": "...", "role": "USER" },
    "accessToken": "<jwt>",
    "refreshToken": "<jwt>"
  }
}
```

---

### POST /auth/login
Sign in with credentials.

**Request body:**
```json
{ "email": "jane@example.com", "password": "SecurePass1!" }
```

**Response `200`:** Same shape as register.

---

### POST /auth/refresh
Exchange a refresh token for a new access + refresh token pair.

**Request body:**
```json
{ "refreshToken": "<jwt>" }
```

**Response `200`:**
```json
{
  "success": true,
  "data": { "accessToken": "<new-jwt>", "refreshToken": "<new-jwt>" }
}
```

---

### POST /auth/logout
Invalidate the refresh token.

**Request body:**
```json
{ "refreshToken": "<jwt>" }
```

**Response `200`:** `{ "success": true, "message": "Logged out" }`

---

### GET /auth/me  `🔒 Protected`
Returns the currently authenticated user.

**Response `200`:**
```json
{
  "success": true,
  "data": {
    "id": "uuid",
    "email": "jane@example.com",
    "name": "Jane Smith",
    "role": "USER",
    "emailAlerts": true,
    "pushAlerts": false,
    "createdAt": "2024-01-01T00:00:00.000Z"
  }
}
```

---

## Cameras

### GET /cameras  `🔒`
List all cameras belonging to the authenticated user.

**Response `200`:**
```json
{
  "success": true,
  "data": [
    {
      "id": "uuid",
      "name": "Front Door",
      "description": "Main entrance",
      "streamKey": "uuid",
      "isOnline": false,
      "motionDetect": true,
      "sensitivity": 30,
      "recordOnMotion": true,
      "twoWayAudio": true,
      "nightVision": false,
      "_count": { "recordings": 12, "alerts": 3 }
    }
  ]
}
```

---

### POST /cameras  `🔒`
Create a new camera.

**Request body:**
```json
{
  "name": "Backyard",
  "description": "Optional",
  "motionDetect": true,
  "sensitivity": 40,
  "recordOnMotion": true,
  "twoWayAudio": false
}
```

**Response `201`:** Full camera object.

---

### GET /cameras/:cameraId  `🔒`
Get a single camera including recent recordings and alerts.

---

### PATCH /cameras/:cameraId  `🔒`
Update camera settings. Send only the fields you want to change.

**Request body (all optional):**
```json
{
  "name": "New name",
  "sensitivity": 50,
  "motionDetect": false,
  "recordOnMotion": true,
  "twoWayAudio": true,
  "nightVision": true
}
```

---

### DELETE /cameras/:cameraId  `🔒`
Delete camera and all associated recordings and alerts.

---

### GET /cameras/:cameraId/stream-key  `🔒`
Returns the stream key used by the camera device to authenticate the Socket.io connection.

**Response `200`:**
```json
{ "success": true, "data": { "streamKey": "uuid" } }
```

---

### POST /cameras/:cameraId/stream-key/rotate  `🔒`
Generate a new stream key (invalidates the old one).

---

### POST /cameras/:cameraId/heartbeat  `🔒`
Marks the camera as online and updates `lastSeen`. Called every 30 s by the broadcasting device.

---

## Recordings

### GET /cameras/:cameraId/recordings  `🔒`
List recordings for a camera.

**Query params:**

| Param | Type | Default | Description |
|-------|------|---------|-------------|
| `page` | int | 1 | Page number |
| `limit` | int | 20 | Results per page |
| `trigger` | string | — | Filter by `MANUAL`, `MOTION`, or `SCHEDULED` |

**Response `200`:**
```json
{
  "success": true,
  "data": [
    {
      "id": "uuid",
      "filename": "recording-123.webm",
      "url": "/recordings/recording-123.webm",
      "size": 4194304,
      "duration": 47,
      "trigger": "MOTION",
      "createdAt": "2024-03-10T14:22:00.000Z"
    }
  ],
  "pagination": { "page": 1, "limit": 20, "total": 45, "pages": 3 }
}
```

---

### POST /cameras/:cameraId/recordings  `🔒`
Upload a new recording clip.

**Content-Type:** `multipart/form-data`

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `video` | file | Yes | Video blob (`.webm`, `.mp4`) |
| `trigger` | string | No | `MANUAL` (default), `MOTION`, `SCHEDULED` |
| `duration` | number | No | Duration in seconds |

**Response `201`:** Full recording object.

---

### GET /recordings/:recordingId  `🔒`
Get a single recording by ID.

---

### DELETE /recordings/:recordingId  `🔒`
Delete recording and remove the physical file.

---

## Alerts

### GET /alerts  `🔒`
List alerts for the authenticated user.

**Query params:**

| Param | Type | Description |
|-------|------|-------------|
| `page` | int | Page number |
| `limit` | int | Results per page (default 30) |
| `unreadOnly` | boolean | Only return unread alerts |
| `cameraId` | string | Filter by camera |

**Response `200`:**
```json
{
  "success": true,
  "data": [ ... ],
  "unreadCount": 5,
  "pagination": { ... }
}
```

---

### POST /alerts/motion  `🔒`
Report a motion event (called by the camera page after detection).

**Request body:**
```json
{
  "cameraId": "uuid",
  "thumbnailUrl": "data:image/jpeg;base64,..."
}
```

**Response `201`:** Full alert object.

---

### PATCH /alerts/:alertId/read  `🔒`
Mark a single alert as read.

---

### PATCH /alerts/read-all  `🔒`
Mark all alerts as read.

---

### DELETE /alerts/:alertId  `🔒`
Delete an alert.

---

## Users

### PATCH /users/me  `🔒`
Update profile settings.

**Request body (all optional):**
```json
{
  "name": "New Name",
  "emailAlerts": true,
  "pushAlerts": false,
  "pushSubscription": { ... }
}
```

---

### PATCH /users/me/password  `🔒`
Change password. Invalidates all existing refresh tokens.

**Request body:**
```json
{
  "currentPassword": "OldPass1!",
  "newPassword": "NewPass2!"
}
```

---

### DELETE /users/me  `🔒`
Permanently delete the account and all associated data.

---

## WebSocket Events (Socket.io)

Connect to `ws://localhost:5000` with Socket.io.

### Camera device connection
Authenticate via `streamKey` in the handshake:
```js
const socket = io('http://localhost:5000', {
  auth: { streamKey: 'your-camera-stream-key' }
});
```

### Viewer connection
Authenticate via JWT in the handshake:
```js
const socket = io('http://localhost:5000', {
  auth: { token: 'your-access-token' }
});
```

### Events emitted by client

| Event | Direction | Payload | Description |
|-------|-----------|---------|-------------|
| `viewer:join` | Viewer → Server | `{ streamKey }` | Join a camera's room |
| `viewer:offer` | Viewer → Server | `{ offer: RTCSessionDescriptionInit }` | WebRTC SDP offer |
| `camera:answer` | Camera → Server | `{ viewerSocketId, answer: RTCSessionDescriptionInit }` | WebRTC SDP answer |
| `ice:candidate` | Both → Server | `{ candidate, viewerSocketId? }` | ICE candidate relay |

### Events emitted by server

| Event | Direction | Payload | Description |
|-------|-----------|---------|-------------|
| `camera:online` | Server → Viewers | `{ cameraId }` | Camera came online |
| `camera:offline` | Server → Viewers | `{ cameraId }` | Camera went offline |
| `camera:status` | Server → Viewer | `{ online, cameraId }` | Current camera status on join |
| `viewer:joined` | Server → Camera | `{ viewerSocketId }` | New viewer connected |
| `viewer:left` | Server → Camera | `{ viewerSocketId }` | Viewer disconnected |
| `viewer:offer` | Server → Camera | `{ viewerSocketId, offer }` | Forwarded SDP offer |
| `camera:answer` | Server → Viewer | `{ answer }` | Forwarded SDP answer |
| `ice:candidate` | Server → Peer | `{ candidate, from }` | Forwarded ICE candidate |
| `error` | Server → Client | `{ message }` | Error message |

---

## HTTP Status Codes

| Code | Meaning |
|------|---------|
| `200` | Success |
| `201` | Created |
| `401` | Unauthenticated (missing or expired token) |
| `403` | Forbidden (authenticated but no permission) |
| `404` | Resource not found |
| `409` | Conflict (e.g. email already in use) |
| `413` | Payload too large (file size limit) |
| `422` | Validation error |
| `429` | Too many requests (rate limited) |
| `500` | Internal server error |
