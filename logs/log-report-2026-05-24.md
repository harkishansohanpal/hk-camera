# Log Report — 2026-05-24

**Total logs in database:** 131

## Summary by Level

| Level | Count |
|-------|-------|
| info | 127 |
| error | 1 |
| warn | 3 |

## Summary by Tag

| Tag | Count |
|-----|-------|
| CameraView | 12 |
| Viewer | 22 |
| WebRTC | 96 |
| Test | 1 |

## Per-User Summary

- **User 6e7031f8** (6e7031f8) — 131 events
  - Camera online (offers initiated): 2
  - Viewer waiting (camera offline): 4
  - Peer connections established: 7
  - Errors: 1

## Recent Events (Last 50)

```
[2026-05-24T05:42:22.009Z] WARN [WebRTC] Socket disconnected unexpectedly {"streamKey":"46ca6564-494a-4108-9690-16b383639370"}
[2026-05-24T05:42:22.009Z] INFO [Viewer] Status transition {"status":"idle"}
[2026-05-24T05:42:22.009Z] INFO [WebRTC] connectViewer called {"streamKey":"91207073-b711-4e07-a7f5-c2db32c185fa"}
[2026-05-24T05:42:22.009Z] INFO [Viewer] Status transition {"status":"connecting"}
[2026-05-24T05:42:22.009Z] INFO [WebRTC] Socket connected, emitting viewer:join {"streamKey":"91207073-b711-4e07-a7f5-c2db32c185fa"}
[2026-05-24T05:42:22.009Z] INFO [WebRTC] Received camera:status {"online":true,"cameraId":"cam-front-door"}
[2026-05-24T05:42:22.009Z] INFO [WebRTC] Camera online, initiating offer
[2026-05-24T05:42:22.009Z] INFO [WebRTC] initiateOffer called
[2026-05-24T05:42:22.009Z] INFO [WebRTC] Emitting viewer:offer
[2026-05-24T05:42:22.009Z] INFO [WebRTC] Total initiateOffer time {"tookMs":14}
[2026-05-24T05:42:22.009Z] INFO [WebRTC] Received camera:answer
[2026-05-24T05:42:22.009Z] INFO [WebRTC] PC connection state change {"state":"connecting"}
[2026-05-24T05:42:22.009Z] INFO [WebRTC] PC connection state change {"state":"connected"}
[2026-05-24T05:42:22.009Z] INFO [WebRTC] Peer connection established {"tookMs":713}
[2026-05-24T05:42:22.009Z] INFO [Viewer] Status transition {"status":"connected"}
[2026-05-24T05:42:32.013Z] INFO [WebRTC] Camera went offline
[2026-05-24T05:42:32.013Z] INFO [Viewer] Status transition {"status":"waiting"}
[2026-05-24T05:42:32.013Z] INFO [WebRTC] Camera went offline
[2026-05-24T05:42:32.013Z] INFO [WebRTC] initiateOffer called
[2026-05-24T05:42:32.013Z] INFO [WebRTC] Emitting viewer:offer
[2026-05-24T05:42:32.013Z] INFO [WebRTC] Total initiateOffer time {"tookMs":14}
[2026-05-24T05:42:32.013Z] INFO [WebRTC] Received camera:answer
[2026-05-24T05:42:32.013Z] INFO [WebRTC] PC connection state change {"state":"connecting"}
[2026-05-24T05:42:32.013Z] INFO [WebRTC] PC connection state change {"state":"connected"}
[2026-05-24T05:42:32.013Z] INFO [WebRTC] Peer connection established {"tookMs":12247}
[2026-05-24T05:42:32.013Z] INFO [Viewer] Status transition {"status":"connected"}
[2026-05-24T05:42:52.004Z] INFO [WebRTC] Camera went offline
[2026-05-24T05:42:52.004Z] INFO [Viewer] Status transition {"status":"waiting"}
[2026-05-24T05:42:52.004Z] INFO [WebRTC] Camera went offline
[2026-05-24T05:43:02.002Z] INFO [WebRTC] Re-emitting viewer:join to re-check camera status
[2026-05-24T05:43:02.002Z] INFO [WebRTC] Received camera:status {"online":false,"cameraId":"cam-front-door"}
[2026-05-24T05:43:02.002Z] INFO [WebRTC] Camera offline, waiting
[2026-05-24T05:43:02.002Z] WARN [WebRTC] Socket disconnected unexpectedly {"streamKey":"91207073-b711-4e07-a7f5-c2db32c185fa"}
[2026-05-24T05:43:02.002Z] INFO [CameraView] Auto-starting broadcast {"cameraId":"cam-front-door"}
[2026-05-24T05:43:02.002Z] INFO [CameraView] Starting broadcast {"cameraId":"cam-front-door"}
[2026-05-24T05:43:02.002Z] INFO [WebRTC] Camera socket connected {"streamKey":"91207073-b711-4e07-a7f5-c2db32c185fa"}
[2026-05-24T05:43:52.012Z] INFO [CameraView] Stopping broadcast {"cameraId":"cam-front-door"}
[2026-05-24T05:44:01.998Z] INFO [CameraView] Starting broadcast {"cameraId":"cam-front-door"}
[2026-05-24T05:44:01.998Z] INFO [WebRTC] Camera socket connected {"streamKey":"91207073-b711-4e07-a7f5-c2db32c185fa"}
[2026-05-24T05:44:01.998Z] INFO [CameraView] Stopping broadcast {"cameraId":"cam-front-door"}
[2026-05-24T05:44:01.998Z] INFO [CameraView] Starting broadcast {"cameraId":"cam-front-door"}
[2026-05-24T05:44:01.998Z] INFO [WebRTC] Camera socket connected {"streamKey":"91207073-b711-4e07-a7f5-c2db32c185fa"}
[2026-05-24T05:44:12.009Z] INFO [CameraView] Stopping broadcast {"cameraId":"cam-front-door"}
[2026-05-24T05:44:22.007Z] INFO [CameraView] Starting broadcast {"cameraId":"cam-front-door"}
[2026-05-24T05:44:22.007Z] INFO [WebRTC] Camera socket connected {"streamKey":"91207073-b711-4e07-a7f5-c2db32c185fa"}
[2026-05-24T05:44:32.009Z] INFO [CameraView] Stopping broadcast {"cameraId":"cam-front-door"}
[2026-05-24T05:44:42.003Z] INFO [CameraView] Starting broadcast {"cameraId":"cam-front-door"}
[2026-05-24T05:44:42.003Z] INFO [WebRTC] Camera socket connected {"streamKey":"91207073-b711-4e07-a7f5-c2db32c185fa"}
[2026-05-24T05:44:42.003Z] INFO [CameraView] Stopping broadcast {"cameraId":"cam-front-door"}
[2026-05-24T05:46:52.572Z] INFO [CameraView] App backgrounded, stopping detection
```
