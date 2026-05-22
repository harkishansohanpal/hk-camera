# Build Your Own HK Camera For Dummies

**A totally serious guide to building a real-time camera streaming platform, explained like you're 15 and just learned what a variable is**

---

## Before You Start

This guide assumes you've written a little bit of code before. Maybe you've done some HTML, some JavaScript. You know what a function is. You know what `if` statements do. If you don't, that's OK — you'll still get the big ideas. Come back after you've done a beginner JavaScript course.

**Things you should know (or be willing to Google):**
- What is a web browser
- What is a phone app
- What is Wi-Fi
- Basic JavaScript: variables, functions, `if/else`, `async/await` (we'll explain `async/await` a bit)

**Things you do NOT need to know yet:**
- WebRTC (we'll explain it like you're 5)
- WebSocket (same)
- React hooks (we'll explain those too)
- What a VPS is (it's just a computer in the cloud)
- Node.js (it's just JavaScript that runs on a computer instead of in a browser)

If you get stuck on a word, Google it. Every programmer Googles things 50 times a day. It's not cheating. It's the job.

---

## Part 0: The Absolute Basics

### What Is a Server?

A server is just a computer that sits in a room somewhere (or in "the cloud," which is just someone else's computer) and waits for other computers to ask it things.

You ask: "Hey server, give me this webpage."
The server responds: "Here's the HTML, CSS, and JavaScript."

Your browser (Chrome, Safari, etc.) downloads that stuff and shows you a page.

That's it. A server is a computer that says "yes sir" to requests.

**In HK Camera:**
- The backend server (on Fly.io) handles logins, saves camera info to a database, and helps set up video connections
- The frontend (on Cloudflare) serves the HTML/CSS/JS that runs in your browser

### What Is a Database?

A database is just a place to store information permanently. Like a spreadsheet, but more powerful. When you create an account, your email and password hash go into the database. When you add a camera, its name and stream key go there too.

**In HK Camera:** We use PostgreSQL (a popular database) through an "ORM" called Prisma. An ORM just means we write JavaScript instead of SQL (the database's own language). Prisma translates our JavaScript into database commands.

### What Is WebSocket?

Normally, when your browser talks to a server, it works like this:
1. Browser: "Hey, give me this page."
2. Server: "Here it is."
3. Connection closed.

That's HTTP. It's like sending a letter — you write it, mail it, get a reply, and done.

WebSocket is different:
1. Browser: "Hey, let's open a line."
2. Server: "OK, line is open."
3. Browser (later): "Hey, camera went online."
4. Server (at any time): "Hey, a viewer wants to watch."

The connection stays open. Both sides can send messages whenever they want. It's like a phone call instead of sending letters.

**In HK Camera:** We use Socket.IO, which is a library that makes WebSocket easy. The camera opens a WebSocket to the server. The viewer opens one too. They use these connections to set up the video stream. Once the video is flowing, the WebSocket is only used for status updates ("camera went offline," "viewer disconnected," etc.).

### What Is WebRTC?

WebRTC is a browser feature that lets two browsers (or a phone and a browser) send video and audio directly to each other without a server in the middle.

The server helps them find each other (that's called "signaling"), but then it gets out of the way. The video flows directly from the camera phone to your browser.

**Why does this matter?** Because video is HUGE. A 1080p stream is like 5 Mbps. If the server had to relay that for every viewer, you'd need a really expensive server. With WebRTC, one camera can stream to multiple viewers and the server barely notices.

---

### Wait, How Do Camera and Viewer Talk if They're on Different Wi-Fi Networks?

Great question. This is the hardest part of WebRTC.

Imagine you're in a house (your Wi-Fi network). Your friend is in a different house (their Wi-Fi network). You want to talk to them directly, but there's a wall (the internet router / NAT) around each house. You can't see each other's houses directly.

WebRTC solves this by:
1. **STUN:** You ask a special server "what's my public address?" It tells you your public IP. Then you tell your friend "look for me at this address." Sometimes this works if both houses' walls are thin enough.

2. **TURN:** If the walls are too thick (both sides have strict NATs, firewalls, etc.), you need a relay server. You send your video to the TURN server, and it sends it to your friend. This is slower but always works.

3. **ICE:** The browser tries EVERY possible way to connect (direct IP, STUN, TURN) and picks the one that works fastest.

**In HK Camera:** We use Cloudflare's free TURN servers as backup. About 85% of connections work without TURN (just STUN). The other 15% need TURN. Without TURN, those 15% just can't connect.

---

## Part I: The Big Picture

### Chapter 1: What Are We Building?

We're building a system where:

1. A phone runs a webpage that captures video from its camera and sends it out
2. Any other device (laptop, another phone, tablet) runs a webpage that shows that video
3. A server in the middle helps them find each other but doesn't touch the video itself

```
┌─────────────────────┐                               ┌──────────────────────┐
│   Camera (Phone)    │                               │   Viewer (Browser)   │
│  - Records video    │ ◄─── WebSocket (setup) ─────► │  - Shows video       │
│  - Sends it out     │                               │  - Can record clips  │
│  - Detects motion   │     WebRTC (video flows       │  - Can send commands │
│  - Receives commands│     directly between them)     │  - Torch / zoom etc  │
└─────────┬───────────┘                               └──────────┬───────────┘
          │                                                       │
          │                   ┌───────────────────┐               │
          └──────────────────►│  Signaling Server  │◄─────────────┘
                             │  (Socket.IO)       │
                             │  - Routes messages │
                             │  - Tracks who's    │
                             │    online          │
                             └────────────────────┘
```

**The most important thing to understand:** The server only helps set up the connection. After that, video flows directly between the camera and viewer. This is why a $5/month server can support HD streaming — it's not doing the heavy lifting.

### Chapter 2: The Full Stack (Every Piece and Why We Used It)

| Piece | What We Used | What It Does | Could You Use Something Else? |
|-------|-------------|--------------|-------------------------------|
| **Backend language** | Node.js (JavaScript) | Runs on the server. Handles logins, saves data, manages WebSocket connections | Python, Java, Go, Ruby — anything that can run a server |
| **Backend framework** | Express | Makes it easy to create API endpoints (`GET /api/cameras`, etc.) | Fastify, Koa, Hapi |
| **Real-time comms** | Socket.IO | Wraps WebSocket with auto-reconnect, rooms, fallbacks | Raw WebSocket, uWebSockets, Pusher |
| **WebRTC** | Browser APIs (no library) | Built into Chrome, Safari, Firefox. No installation needed | simple-peer, PeerJS (libraries that wrap it) |
| **Database** | PostgreSQL + Prisma | Stores users, cameras, recordings. Prisma makes it easy to query from JS | MySQL, SQLite, MongoDB |
| **Frontend** | React + Vite | Builds the web pages users see. Vite is the build tool | Vue, Svelte, plain HTML/JS |
| **Deployment (frontend)** | Cloudflare Pages | Hosts the HTML/CSS/JS files. Free tier is generous | Netlify, Vercel, AWS S3 |
| **Deployment (backend)** | Fly.io | Runs the Node.js server in the cloud. $5/month for a tiny VM | Railway, Render, AWS EC2, a Raspberry Pi in your closet |
| **TURN relay** | Cloudflare Calls | Fallback when direct WebRTC can't connect. 10 TB/month free | Twilio, LiveKit, self-hosted Coturn |
| **Bot protection** | Cloudflare Turnstile | Free CAPTCHA alternative that doesn't make users click traffic lights | Google reCAPTCHA, hCaptcha |
| **CI/CD** | GitHub Actions | Runs tests and deploys automatically when you push code | CircleCI, Jenkins, GitLab CI |

> **Tip:** If you're a beginner, use the exact same stack. Once it works, experiment with swapping pieces. Changing one thing at a time is how you learn what each part does.

---

## Part II: The Signaling Server (The Brain)

### Chapter 3: What Even Is "Signaling"?

Imagine you and your friend want to play catch. Before you can throw the ball (video), you need to:
1. **Find each other** — "Hey, I'm in the park!" "Cool, I'm coming over."
2. **Agree on the rules** — "I'll throw underhand." "OK, I'll catch with my left hand." (Your browsers agree on codecs: VP9, H.264, etc.)
3. **Share locations** — "I'm at the big oak tree." "I'm at the bench." (Your browsers share IP addresses and connection info.)
4. **Actually throw the ball** — This is the video streaming itself.

Steps 1-3 are **signaling**. Step 4 is **WebRTC**. The server handles steps 1-3 and then shuts up and gets out of the way.

**File:** `backend/src/socket/signalingServer.js`

### Chapter 4: Authentication — Proving Who You Are

When the camera or viewer connects to the signaling server, they need to prove they're allowed to be there. The server supports two ways to do this.

> **New programmer note:** A middleware is just a function that runs before the main code. Think of it like a bouncer at a club — checks your ID before letting you in.

```js
// This is a MIDDLEWARE. It runs on EVERY connection attempt.
// "socket" = the connection. Like a phone call line.
// "next" = a function that says "OK let them in" or produces an error.
io.use(async (socket, next) => {
  // The client sends either a token (for viewers) or a streamKey (for cameras)
  const { token, streamKey } = socket.handshake.auth;

  if (streamKey) {
    // CAMERA auth: look up the stream key in the database
    const camera = await prisma.camera.findUnique({ where: { streamKey } });
    if (!camera) return next(new Error('Invalid stream key'));
    socket.cameraId  = camera.id;
    socket.streamKey = streamKey;
    socket.role      = 'camera';
    socket.userId    = camera.user.id;
  } else if (token) {
    // VIEWER auth: verify the JWT (a special encrypted token)
    const payload = jwt.verify(token, process.env.JWT_SECRET);
    socket.userId = payload.sub;
    socket.role   = 'viewer';
  } else {
    return next(new Error('Authentication required'));
  }
  next(); // Let them in!
});
```

**Why two different auth methods?**
- Cameras are headless devices (no screen, no keyboard). They can't do a login flow. They get a permanent stream key (a UUID) that acts as a password.
- Viewers are people using a browser. They log in with email/password, get a JWT (short-lived token), and use that.

> **Remember:** A stream key is like a really long, random password. If someone steals it, they can pretend to be your camera. Don't share it. Don't post it on GitHub. (We did once. It was a whole thing.)

### Chapter 5: The Two Maps That Run Everything

The entire signaling server runs on two simple JavaScript Maps. If you haven't used a Map before, think of it as a special object that stores key-value pairs where keys can be anything (not just strings).

```js
// Maps a stream key → the camera's socket ID
const cameras = new Map();
// Maps a stream key → a Set of viewer socket IDs
const viewers = new Map();
```

**`cameras`** — One entry per active camera. Key: stream key. Value: socket ID. When a camera disconnects, its entry is removed.

**`viewers`** — One entry per camera being watched. Key: stream key. Value: a Set (like an array but with no duplicates) of viewer socket IDs. Multiple viewers can watch one camera.

> **Warning:** These Maps live in the server's memory. If the server restarts (deployment, crash, etc.), they're wiped clean. Every camera has to reconnect. Every viewer has to retry. This is a known limitation. In a bigger system, you'd store this in Redis (a fast in-memory database). But for a project your size, in-memory Maps are totally fine.

### Chapter 6: The Camera Connect/Disconnect Dance

**When a camera connects:**
```js
// This runs inside io.on('connection', ...) for camera sockets
if (socket.role === 'camera') {
  const key = socket.streamKey;

  cameras.set(key, socket.id);            // Register in Map
  socket.join(`camera:${key}`);           // Join Socket.IO room

  // Update database (fire-and-forget — we don't wait for it)
  prisma.camera.update({
    where: { id: socket.cameraId },
    data: { isOnline: true }
  }).catch(() => {});

  // Tell everyone in the room: camera is online!
  io.to(`camera:${key}`).emit('camera:online', { cameraId: socket.cameraId });
  // Also tell the camera owner's dashboard
  io.to(`user:${socket.userId}`).emit('camera:online', { cameraId: socket.cameraId });
}
```

> **New programmer note:** `.catch(() => {})` means "if this fails, ignore it." We don't care if the database update fails because the Map is the real source of truth. The DB is just a backup. This is called "fire-and-forget."

**When a camera disconnects:**
```js
socket.on('disconnect', () => {
  // IMPORTANT GUARD: Only clean up if this socket is STILL the registered camera
  if (cameras.get(key) === socket.id) {
    cameras.delete(key);
    prisma.camera.update({
      where: { id: socket.cameraId },
      data: { isOnline: false }
    }).catch(() => {});
    io.to(`camera:${key}`).emit('camera:offline', { cameraId: socket.cameraId });
    io.to(`user:${socket.userId}`).emit('camera:offline', { cameraId: socket.cameraId });
  }
});
```

**Why the guard `cameras.get(key) === socket.id`?** This is a bug fix. Imagine the camera disconnects and reconnects really fast. Here's what happens:
1. Old camera socket starts disconnecting
2. New camera socket connects → `cameras.set(key, NEW_socketId)`
3. Old camera socket's disconnect handler runs → checks if `cameras.get(key) === OLD_socketId` → NO → does nothing

Without this guard, step 3 would delete the NEW camera from the Map, making it seem offline even though it just connected. This is called a "race condition" — two things happening at almost the same time causing a bug.

### Chapter 7: The Viewer Join Flow

When a viewer opens the viewer page and the socket connects, it sends a `viewer:join` event:

```js
socket.on('viewer:join', async ({ streamKey }) => {
  // Step 1: Look up the camera in the database
  const camera = await prisma.camera.findUnique({ where: { streamKey } });
  if (!camera) {
    socket.emit('error', { message: 'Camera not found' });
    return;
  }

  // Step 2: Check that this viewer owns the camera
  if (camera.userId !== socket.userId) {
    socket.emit('error', { message: 'Access denied' });
    return;
  }

  // Step 3: Join the camera's Socket.IO room
  socket.join(`camera:${streamKey}`);

  // Step 4: Track the viewer
  if (!viewers.has(streamKey)) viewers.set(streamKey, new Set());
  viewers.get(streamKey).add(socket.id);

  // Step 5: Tell the viewer if the camera is online
  const cameraIsOnline = cameras.has(streamKey);
  socket.emit('camera:status', { online: cameraIsOnline, cameraId: camera.id });

  // Step 6: If camera is online, tell the camera "Hey, a viewer is ready!"
  if (cameras.has(streamKey)) {
    io.to(cameras.get(streamKey)).emit('viewer:joined', { viewerSocketId: socket.id });
  }
});
```

> **New programmer note:** `await` means "pause this function and wait for the database to reply." The `async` keyword on the function tells JavaScript "this function uses `await` inside it." Without `await`, the code would continue running before the database replied, and `camera` would be `undefined`. This is a super common beginner mistake.

> **Key insight:** The `viewer:join` event is "idempotent" — a fancy word meaning "running it multiple times is the same as running it once." If the viewer joins again (because of a retry), Socket.IO just silently ignores the `join` request since the viewer is already in the room. This makes retries safe.

### Chapter 8: The Offer/Answer Relay (Where the Magic Happens)

This is the core of WebRTC signaling. The server's only job here is to pass messages between the camera and viewer.

```
Viewer                          Signaling Server                Camera
  │                               │                              │
  │── "Here's my offer" ─────────►│                              │
  │                               │── "Viewer says: ────────────►│
  │                               │    here's their offer"       │
  │                               │                              │── Creates answer
  │                               │◄─ "Camera says: ────────────│
  │◄─ "Camera says: ────────────│    here's their answer"       │
  │    here's their answer"     │                              │
  │                               │                              │
  │── "ICE candidate: 1.2.3.4" ─►│                              │
  │                               │── "ICE candidate" ──────────►│
  │                               │◄── "ICE candidate" ──────────│
  │◄── "ICE candidate" ──────────│                              │
```

The server just forwards messages. It's a messenger, nothing more.

```js
// Viewer sends offer → server forwards to camera
socket.on('viewer:offer', ({ offer }) => {
  const cameraSocketId = cameras.get(socket.streamKey);
  if (!cameraSocketId) {
    socket.emit('error', { message: 'Camera is not online' });
    return;
  }
  io.to(cameraSocketId).emit('viewer:offer', {
    viewerSocketId: socket.id,
    offer
  });
});

// Camera sends answer → server forwards to viewer
socket.on('camera:answer', ({ viewerSocketId, answer }) => {
  io.to(viewerSocketId).emit('camera:answer', { answer });
});

// ICE candidates flow both ways
socket.on('ice:candidate', ({ candidate, viewerSocketId }) => {
  io.to(viewerSocketId).emit('ice:candidate', { candidate, from: 'camera' });
});
```

> **Remember:** The server decodes NOTHING. It doesn't read the offers, answers, or candidates. It just passes them along like a mail carrier. This is by design. The less the server does, the less can break.

---

## Part III: Quick Detour — What the Heck Is React?

Before we dive into the frontend code, you need to understand a few React things.

**React is a library for building user interfaces.** It lets you write HTML-like code inside JavaScript. A "component" is just a function that returns HTML. "State" is data that, when changed, makes the component re-render (update what the user sees).

**useState:** A function that creates a state variable.
```js
const [status, setStatus] = useState('idle');
// status = 'idle'
setStatus('connecting');
// Now status = 'connecting', and the component re-renders
```

**useEffect:** A function that runs code when something changes (or when the component first appears).
```js
useEffect(() => {
  // This runs when the component first shows up
  // And again whenever status changes
  console.log('Status changed to:', status);
}, [status]); // ← the "dependency array": watch these variables
```

**useRef:** A function that creates a mutable object that persists across renders but doesn't trigger re-renders when changed.
```js
const countRef = useRef(0);
countRef.current = 5; // Changes instantly, no re-render
```

**useCallback:** Like `useEffect` but for functions. Returns a "stable" function that only changes when its dependencies change.
```js
const handleClick = useCallback(() => {
  doSomething();
}, [dependency]); // Only creates a new function if `dependency` changes
```

> **New programmer note:** These "use" functions are called React Hooks. They have one rule: they must be called at the top level of a component (not inside if statements or loops). React relies on the order of hooks being the same every render. Violating this rule produces confusing bugs.

---

## Part IV: The Frontend — useWebRTC Hook (The Heart)

### Chapter 9: Why a Shared Hook?

Both the Camera page and the Viewer page need to do almost the same things:
- Open a Socket.IO connection
- Create WebRTC peer connections
- Exchange offers, answers, and ICE candidates
- Track connection state

If we duplicated this code, we'd have two copies of the same bug-prone logic. Instead, we put it all in one hook and give it a `role` parameter ('camera' or 'viewer'):

```js
// Camera uses it like this:
const { startBroadcast, stopBroadcast, status } = useWebRTC({
  role: 'camera',
  streamKey: camera?.streamKey,
  onCommand: handleRemoteCommand
});

// Viewer uses it like this:
const { connectViewer, disconnectViewer, rejoinViewer, remoteStream, status }
  = useWebRTC({ role: 'viewer', streamKey });
```

**File:** `frontend/src/hooks/useWebRTC.js`

### Chapter 10: The Viewer Side (Connect and Watch)

When a viewer navigates to the viewer page, this code runs:

```js
const connectViewer = useCallback(async () => {
  // Step 1: Update status to show a spinner/loading state
  setStatus('connecting');
  closePeerConnection(); // Clean up any old connection

  // Step 2: Get the JWT from localStorage (where we saved it after login)
  const token = localStorage.getItem('accessToken');

  // Step 3: Create a NEW Socket.IO connection
  const socket = io(SOCKET_URL, {
    auth: { token },
    transports: ['websocket'],        // Only use WebSocket, no polling
    reconnection: false,               // We handle retries ourselves
  });
  socketRef.current = socket;

  // Step 4: The "isActive" pattern — a flag that goes false when
  // we disconnect. Every handler checks it before doing anything.
  // This prevents "stale closure" bugs where handlers run after cleanup.
  let isActive = true;

  // ── Socket event handlers ──────────────────────────────────

  // When socket connects, ask to join the camera room
  socket.on('connect', () => {
    socket.emit('viewer:join', { streamKey });
  });

  // Camera tells us: "I'm online" or "I'm offline"
  socket.on('camera:status', async ({ online, cameraId }) => {
    if (!isActive) return;
    if (online) {
      closePeerConnection();  // Clean slate
      await initiateOffer(socket, isActive);
    } else {
      setStatus('waiting');   // Camera exists but isn't broadcasting
    }
  });

  // Camera just came online (separate from viewer:join response)
  socket.on('camera:online', async () => {
    if (!isActive) return;
    closePeerConnection();    // Reset stale state from any failed attempt
    await initiateOffer(socket, isActive);
  });

  // Camera went offline
  socket.on('camera:offline', () => {
    if (isActive) {
      closePeerConnection();
      setStatus('waiting');
    }
  });

  // Camera answered our WebRTC offer
  socket.on('camera:answer', async ({ answer }) => {
    const pc = pcRef.current;
    if (!pc) return;
    await pc.setRemoteDescription(new RTCSessionDescription(answer));
    // Flush any ICE candidates that arrived before the answer
    for (const c of pendingCandidates.current) {
      await pc.addIceCandidate(new RTCIceCandidate(c));
    }
  });

  // ICE candidate from camera (network path info)
  socket.on('ice:candidate', async ({ candidate }) => {
    const pc = pcRef.current;
    if (!pc) return;
    if (!pc.remoteDescription) {
      // No remote description yet → buffer it
      pendingCandidates.current.push(candidate);
    } else {
      await pc.addIceCandidate(new RTCIceCandidate(candidate));
    }
  });

  // Socket disconnected unexpectedly
  socket.on('disconnect', () => {
    if (isActive) {
      setStatus('disconnected');
      closePeerConnection();
    }
    isActive = false; // One-way: once false, stays false
  });

  // Return a cleanup function (caller can use this)
  return () => {
    isActive = false;
    socket.off(/* ...remove all listeners... */);
  };
}, [streamKey]);
```

**The `isActive` pattern explained:**
When you create a socket, you also create handler functions (`handleCameraOnline`, `handleCameraOffline`, etc.). These functions are "closures" — they remember the `isActive` variable from when they were created. If the socket gets disconnected and we create a new one, the old handlers still exist in memory with their old `isActive`. The `isActive = false` in the disconnect handler ensures old handlers don't accidentally modify state after we've moved on.

### Chapter 11: The Camera Side (Broadcast)

When you tap "Go Live" on the camera page:

```js
const startBroadcast = useCallback(async (mediaStream) => {
  setStatus('connecting');

  // Close any old socket
  socketRef.current?.disconnect();

  // Create a new socket — authenticate with stream key, not JWT
  const socket = io(SOCKET_URL, {
    auth: { streamKey },
    transports: ['websocket'],
  });
  socketRef.current = socket;

  socket.on('connect', () => setStatus('connected'));
  socket.on('connect_error', (err) => setStatus('error'));

  // When a viewer wants to watch:
  socket.on('viewer:offer', async ({ viewerSocketId, offer }) => {
    try {
      const iceServers = await fetchIceServers();

      // If we already have a connection to this viewer, close it
      if (viewerPCsRef.current.has(viewerSocketId)) {
        viewerPCsRef.current.get(viewerSocketId).pc.close();
      }

      const pc = createPeerConnection(iceServers, (candidate) => {
        socket.emit('ice:candidate', { viewerSocketId, candidate });
      });

      // Add the camera's video/audio tracks to the connection
      mediaStream.getTracks().forEach(track => pc.addTrack(track, mediaStream));

      // Set up the connection
      await pc.setRemoteDescription(new RTCSessionDescription(offer));
      const answer = await pc.createAnswer();
      await pc.setLocalDescription(answer);

      // Send the answer back
      socket.emit('camera:answer', { viewerSocketId, answer });
    } catch (err) {
      // Clean up on error
      if (viewerPCsRef.current.has(viewerSocketId)) {
        viewerPCsRef.current.get(viewerSocketId).pc.close();
        viewerPCsRef.current.delete(viewerSocketId);
      }
    }
  });
}, [streamKey]);
```

> **Technical Stuff:** The camera keeps a Map of peer connections (`viewerPCsRef`), one per viewer. This allows multiple viewers to watch the same camera. Each viewer gets their own WebRTC session. The downside: the camera uploads video separately for each viewer. On Wi-Fi, this is fine for 2-3 viewers. On cellular data, each viewer drains your plan faster.

### Chapter 12: The initiateOffer Function (The Most Important Piece)

This function runs on the viewer side. It creates the actual WebRTC connection:

```js
async function initiateOffer(socket, isActive) {
  // Guard: prevent calling this twice at the same time
  if (offerInFlightRef.current) return;
  offerInFlightRef.current = true;

  try {
    // Close any old peer connection
    if (pcRef.current) {
      pcRef.current.close();
      pcRef.current = null;
    }

    // Clear any buffered ICE candidates
    pendingCandidates.current = [];

    // Fetch TURN/STUN server addresses (cached for 24h)
    const iceServers = await fetchIceServers();

    // Create a new RTCPeerConnection
    const pc = new RTCPeerConnection({
      iceServers,
      bundlePolicy: 'max-bundle',
      rtcpMuxPolicy: 'require',
    });

    // When the PC generates an ICE candidate, send it to the camera
    pc.onicecandidate = (e) => {
      if (e.candidate && socket.connected) {
        socket.emit('ice:candidate', { candidate: e.candidate });
      }
    };

    // When we receive video tracks, show them
    pc.ontrack = (e) => {
      setRemoteStream(e.streams[0]);
    };

    // Monitor the connection state
    pc.onconnectionstatechange = () => {
      const s = pc.connectionState;
      if (s === 'connected')  setStatus('connected');
      if (s === 'disconnected') setStatus('disconnected');
      if (s === 'failed')     setStatus('error');
      if (s === 'connected' || s === 'disconnected' || s === 'failed') {
        offerInFlightRef.current = false;
      }
    };

    // Tell the PC: "I want to receive video and audio"
    pc.addTransceiver('video', { direction: 'recvonly' });
    pc.addTransceiver('audio', { direction: 'recvonly' });

    // Create the SDP offer
    const offer = await pc.createOffer();
    await pc.setLocalDescription(offer);

    // Send the offer to the camera via the signaling server
    socket.emit('viewer:offer', { offer });
  } catch (err) {
    offerInFlightRef.current = false;
    setStatus('error');
  }
}
```

**What's an RTCPeerConnection?** It's the browser object that manages the entire WebRTC session. You give it ICE servers, add tracks to send (or set it up to receive), create an offer, and wait for an answer. Once the answer arrives, the browser handles the rest (ICE negotiation, connection, streaming).

**Why `addTransceiver` with `recvonly`?** The viewer only receives video, doesn't send it. `recvonly` means "I want to receive but I won't send." The camera uses the opposite: it adds actual tracks via `addTrack`.

### Chapter 13: ICE Candidate Buffering

Here's a subtle bug that will drive you crazy: ICE candidates can arrive from the camera BEFORE the viewer has processed the camera's answer. If you try to add an ICE candidate to a PC that doesn't have a remote description yet, the browser throws an error.

**Solution:** Buffer candidates and flush them after setting the remote description:

```js
const pendingCandidates = useRef([]);

// When an ICE candidate arrives from the camera:
if (!pc.remoteDescription) {
  // Remote description not set yet → save for later
  pendingCandidates.current.push(candidate);
} else {
  await pc.addIceCandidate(new RTCIceCandidate(candidate));
}

// Inside the camera:answer handler (after setting remote description):
for (const c of pendingCandidates.current) {
  await pc.addIceCandidate(new RTCIceCandidate(c));
}
pendingCandidates.current = [];
```

---

## Part V: Retry Logic (Staying Alive)

### Chapter 14: The Viewer Retry State Machine (Why It Doesn't Just Die)

Networks are unreliable. The camera might go offline, the Wi-Fi might drop, the server might restart. The viewer must handle all of these gracefully.

We model the viewer's connection as a state machine:

```
        ┌─────────┐
        │  idle   │          ← Page just loaded, nothing happened yet
        └────┬────┘
             │ connectViewer()
             ▼
        ┌───────────┐
        │ connecting│          ← Trying to establish WebRTC
        └─────┬─────┘          ← Times out after 15s if no success
              │
    ┌─────────┼─────────┐
    ▼         ▼         ▼
┌───────┐ ┌────────┐ ┌───────┐
│connected│ │ waiting│ │ error │
└───────┘ └───┬────┘ └───┬───┘
              │          │
              │ camera:  │
              │ online   │ handleRetry() → disconnect then
              │          │                  reconnect after 500ms
              ▼          │
         initiateOffer() │
                          ▼
                    ┌───────────┐
                    │ connecting│
                    └───────────┘
```

This is implemented with two `useEffect` hooks in Viewer.jsx:

```js
// RETRY EFFECT: Fires when status is 'disconnected' or 'error'
useEffect(() => {
  // Only run for bad states
  if (status !== 'disconnected' && status !== 'error') {
    isRetryingRef.current = false;
    setRetryCountdown(null);
    return;
  }

  // Don't start a second retry if one is already in progress
  if (isRetryingRef.current) return;

  // Calculate delay: [1, 2, 5, 15, 30, 60] seconds, then stays at 60
  const delay = RETRY_DELAYS[Math.min(retryCountRef.current, RETRY_DELAYS.length - 1)];

  setRetryCountdown(delay);

  // Show a countdown to the user
  const tick = setInterval(() => setRetryCountdown((n) => (n != null && n > 1 ? n - 1 : 0)), 1000);

  // Auto-retry after the delay
  const timer = setTimeout(() => {
    clearInterval(tick);
    retryCountRef.current += 1;
    handleRetry();
  }, delay * 1000);

  return () => { clearInterval(tick); clearTimeout(timer); };
}, [status, handleRetry]);

// REJOIN EFFECT: While waiting, re-check camera status every 8 seconds
useEffect(() => {
  if (status !== 'waiting') return;
  const interval = setInterval(() => rejoinViewer(), 8000);
  return () => clearInterval(interval);
}, [status, rejoinViewer]);
```

> **New programmer note:** Exponential backoff means the wait time increases with each retry: 1s, 2s, 5s, 15s, 30s, 60s. This prevents hammering the server when there's an ongoing outage. If the server is down for 5 minutes, you don't want to retry every second — you'd make it worse.

> **The `waiting` vs `disconnected` distinction:**
> - `waiting` = "My socket is fine. The server is fine. But the camera isn't broadcasting right now. I'll keep asking."
> - `disconnected` = "My socket died. I need to start over from scratch."

---

## Part VI: The REST API (The Boring but Necessary Part)

### Chapter 15: What the REST API Does

While the signaling server handles real-time connections, the REST API handles everything you'd expect from a normal web app:

| Endpoint | What It Does |
|----------|-------------|
| `POST /api/auth/register` | Create an account |
| `POST /api/auth/login` | Log in, get a JWT |
| `POST /api/auth/refresh` | Get a new JWT when the old one expires |
| `GET /api/cameras` | List your cameras (shows if each is online or offline) |
| `POST /api/cameras` | Add a new camera |
| `GET /api/cameras/:id` | Get details about one camera |
| `PATCH /api/cameras/:id` | Update camera settings (name, detection mode, etc.) |
| `DELETE /api/cameras/:id` | Delete a camera and its recordings |
| `POST /api/cameras/:id/heartbeat` | Camera says "I'm still alive!" (every 30s) |
| `GET /api/turn-credentials` | Get TURN/STUN server addresses for WebRTC |

**The one trick:** When you list cameras, the API checks the in-memory Map (not the database) for online status:

```js
// cameraController.js
const cameras = await prisma.camera.findMany({ where: { userId: req.user.id } });
const patched = cameras.map(c => ({
  ...c,
  isOnline: isCameraOnline(c.streamKey) // checks the in-memory Map
}));
```

The database has an `isOnline` column too, but it's updated "fire-and-forget" (we don't wait to confirm the write succeeded). The in-memory Map is the source of truth because it's updated atomically (the Map change and the broadcast happen together).

> **Remember:** The Map is always right. The DB is "eventually consistent" — it might be a few milliseconds behind, but it'll catch up.

---

## Part VII: WebRTC Deep Dive

### Chapter 16: What Actually Happens Inside a WebRTC Connection

When you call `pc.createOffer()`, the browser does a lot of work behind the scenes:

1. It looks at your hardware (camera, microphone) and decides what it can send/receive.
2. It creates an SDP (Session Description Protocol) — a text blob that describes:
   - What video codecs are supported (H.264, VP8, VP9)
   - What audio codecs are supported (Opus, PCM)
   - The resolution and framerate
   - Network ports it wants to use
3. It starts gathering ICE candidates — every possible way the other side might reach it.

An SDP looks scary but you don't need to parse it:

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

All you need to know: this is saying "I can receive H.264, VP8, or VP9 video. Pick one."

### Chapter 17: Why TURN Matters (And When You Need It)

**STUN** — Helps a device discover its own public IP address. If you're on Wi-Fi at home, your phone has a private IP like `192.168.1.5`. The STUN server tells your phone "your public IP is `203.0.113.42`." Then your phone tells the camera "send video to `203.0.113.42`." If both sides can receive at their public IPs (no strict firewall), this works.

**TURN** — When direct connection fails. Some networks (schools, offices, certain ISPs) use "symmetric NAT" — they give each connection a different public port. Even if both sides know each other's public IPs, they can't connect. TURN solves this by having a server relay the traffic.

**Analogy:** STUN is like shouting across a courtyard. TURN is like passing notes through a friend. Shouting is faster, but the friend always works.

**Without TURN, about 15% of WebRTC connections fail.** With TURN, it's close to 99%.

**HK Camera uses Cloudflare TURN** (free up to 10 TB/month):

```js
async function fetchIceServers() {
  const { data } = await turnAPI.getCredentials();
  return data.data.iceServers;
}
```

These credentials are cached for 24 hours in a module-level variable, so we don't fetch them on every retry:

```js
let _cachedIce = null;
let _cacheExpiry = 0;

async function prefetchIceServers() {
  if (_cachedIce && Date.now() < _cacheExpiry) {
    return _cachedIce; // Return cached value
  }
  // Fetch new credentials from the server
  const { data } = await turnAPI.getCredentials();
  _cachedIce = data.data.iceServers;
  _cacheExpiry = Date.now() + data.data.ttl * 1000;
  return _cachedIce;
}
```

---

## Part VIII: Deployment (Making It Real)

### Chapter 18: The CI/CD Pipeline

CI/CD is a fancy way of saying "when you push code to GitHub, a robot runs your tests and deploys it automatically."

```
Push to master
      │
      ▼
┌──────────┐   ┌──────────┐   ┌──────────┐
│ Lint     │──►│ Tests    │──►│ Build    │
│ (check   │   │ (do they │   │ (make    │
│  style)  │   │  pass?)  │   │  bundle) │
└──────────┘   └────┬─────┘   └────┬─────┘
                    │              │
                    ▼              ▼
              ┌──────────┐  ┌────────────┐
              │ Deploy   │  │ Deploy     │
              │ Frontend │  │ Backend    │
              │ (Pages)  │  │ (Fly.io)   │
              └────┬─────┘  └─────┬──────┘
                   │              │
                   ▼              ▼
              ┌─────────────────────────┐
              │  Smoke tests against    │
              │  production             │
              └─────────────────────────┘
```

**Frontend deployment:** `npm run build` → uploads `dist/` folder to Cloudflare Pages (static file hosting).

**Backend deployment:** `flyctl deploy` → builds a Docker container and deploys to Fly.io (a tiny virtual machine).

**Why deploy both?** The frontend (HTML/JS/CSS) is static — it can be served from anywhere. Cloudflare has data centers worldwide, so your site loads fast. The backend needs to run code 24/7, which is what Fly.io does.

### Chapter 19: Environment Variables

These are like settings for your app that differ between development and production. They're stored in `.env` files (which you should NEVER commit to GitHub).

```bash
# === Backend (.env) ===
DATABASE_URL=postgresql://user:pass@host:5432/db
JWT_SECRET=make_up_a_really_long_random_string_here
TURNSTILE_SECRET_KEY=1x0000000000000000000000000000000AA  # Test key
ADMIN_PASSWORD=change_me
STORAGE_STRATEGY=local          # or 's3' for cloud storage

# === Frontend (.env) ===
VITE_API_URL=https://your-backend.fly.dev
VITE_SOCKET_URL=https://your-backend.fly.dev
VITE_TURNSTILE_SITE_KEY=1x00000000000000000AA  # Test key
```

> **Tip:** Turnstile test keys always pass. In production, replace them with real keys from the Cloudflare Dashboard. They're free.

---

## Part IX: The Bugs We Fixed (So You Don't Have To)

### Chapter 20: The Stale Dashboard Bug

**The symptom:** You start broadcasting from your phone. The Dashboard on your laptop still shows "Offline." You have to refresh the page.

**Why it happened:** The Dashboard only fetched the camera list once when the page loaded. It had no way of knowing the camera came online afterward. It was like looking at a photo of a room instead of watching the room live.

**The fix (3 parts):**

1. **Server change:** When a camera connects/disconnects, also emit the event to a `user:{userId}` room (not just the camera room).

2. **Server change:** Auto-join JWT-authenticated sockets to their `user:{userId}` room on connection.

3. **Dashboard change:** Open a lightweight Socket.IO connection and listen for online/offline events:

```js
useEffect(() => {
  const token = localStorage.getItem('accessToken');
  if (!token) return;

  const socket = io(SOCKET_URL, {
    auth: { token },
    transports: ['websocket'],
    reconnection: true, // Auto-reconnect if socket drops
  });

  socket.on('camera:online', ({ cameraId }) => {
    setCameras(prev => prev.map(c =>
      c.id === cameraId ? { ...c, isOnline: true } : c
    ));
  });

  socket.on('camera:offline', ({ cameraId }) => {
    setCameras(prev => prev.map(c =>
      c.id === cameraId ? { ...c, isOnline: false } : c
    ));
  });

  return () => socket.disconnect();
}, []);
```

Now when the camera goes online, the Dashboard updates instantly. No refresh needed.

### Chapter 21: The Viewer Stuck After Camera Restart Bug

**The symptom:** Camera is streaming. Viewer is watching. You stop the camera. You start it again. The viewer stays on "waiting" forever.

**Why it happened:** There's a guard called `offerInFlightRef` that prevents the viewer from creating two WebRTC offers at the same time. This is supposed to prevent a race condition. But if an offer attempt failed partway through and left `offerInFlightRef` stuck as `true`, every subsequent attempt to reconnect was silently skipped.

**The fix:** Always reset stale state before attempting to reconnect:

```js
const handleCameraOnline = async () => {
  if (!isActive) return;
  closePeerConnection(); // ← This resets offerInFlightRef to false
  await initiateOffer(socket, isActive);
};
```

Also applied the same fix to `handleCameraStatus` (the handler that runs when the viewer re-emits `viewer:join` during the retry loop).

> **Remember:** The `offerInFlightRef` kept us up at night. The lesson: any boolean guard that prevents re-entry can also prevent re-entry forever if it gets stuck. Always reset guards before retrying.

### Chapter 22: The Stale Camera Disconnect Bug

**The symptom:** Camera reconnects quickly after a disconnect (stop and start within 1 second). All viewers get a spurious "camera offline" event and disconnect even though the camera just reconnected.

**Why it happened:** Race condition between the old socket's disconnect handler and the new socket's connection:
1. Camera stops broadcasting → old socket starts disconnecting
2. Camera starts broadcasting → new socket connects → `cameras.set(key, newId)` 
3. Old socket's `disconnect` event fires → old handler runs → `cameras.delete(key)` → deletes the NEW camera from the Map

**The fix:** The guard on every disconnect handler:

```js
socket.on('disconnect', () => {
  if (cameras.get(key) === socket.id) {
    // Only clean up if THIS socket is still the registered camera
    // If a new camera has already connected, cameras.get(key) will be
    // the new socket ID, not this one. So this check fails and we do nothing.
  }
});
```

---

## Part X: Appendices

### Appendix A: The Complete File Map

```
hk-camera/
├── backend/                          ← Server-side code
│   ├── src/
│   │   ├── socket/
│   │   │   └── signalingServer.js    ← THE BRAIN. All WebSocket signaling lives here.
│   │   ├── routes/                   ← API endpoints
│   │   │   ├── auth.js               ← Register, login, refresh token
│   │   │   ├── cameras.js            ← Add/list/edit/delete cameras
│   │   │   ├── turn.js               ← TURN/STUN server credentials
│   │   │   ├── adminUsers.js         ← Admin: manage users
│   │   │   └── admin.js              ← Admin: dashboard stats
│   │   ├── middleware/
│   │   │   ├── auth.js               ← JWT verification + suspended account check
│   │   │   └── turnstile.js          ← Cloudflare Turnstile bot check
│   │   ├── controllers/              ← The actual logic for each route
│   │   ├── prisma/                   ← Database stuff
│   │   │   ├── schema.prisma         ← Defines the database tables
│   │   │   ├── seed.js               ← Creates admin + demo accounts
│   │   │   └── migrations/           ← Database version history
│   │   └── index.js                  ← Where Express + Socket.IO start
│   ├── Dockerfile                    ← Instructions for building the server image
│   └── fly.toml                      ← Fly.io deployment config
│
├── frontend/                         ← Browser-side code
│   ├── src/
│   │   ├── hooks/
│   │   │   ├── useWebRTC.js          ← THE hook. Used by both camera and viewer.
│   │   │   ├── useMotionDetection.js ← Pixel-diff motion detection
│   │   │   ├── useYoloDetection.js   ← AI-based object detection
│   │   │   └── useMediaRecorder.js   ← Record video clips
│   │   ├── pages/
│   │   │   ├── Dashboard.jsx         ← Camera list + stats
│   │   │   ├── CameraView.jsx        ← Broadcast from phone
│   │   │   ├── Viewer.jsx            ← Watch + controls + retry logic
│   │   │   └── ...
│   │   ├── components/               ← Reusable UI pieces
│   │   └── services/
│   │       └── api.js                ← How we talk to the backend (Axios)
│   └── e2e/                          ← End-to-end tests (Playwright)
│
├── docs/                             ← Documentation
│   ├── ARCHITECTURE.md               ← The original architecture doc
│   ├── SETUP.md                      ← How to run locally
│   ├── DEPLOYMENT.md                 ← How to deploy
│   └── FOR_DUMMIES.md                ← You are here
│
└── .github/workflows/                ← CI/CD automation
    ├── ci.yml                        ← Tests + lint on every push
    └── deploy.yml                    ← Deploy on push to master
```

### Appendix B: Glossary (For When You Forget the Fancy Word)

| Term | Plain English Meaning |
|------|----------------------|
| **Signaling** | Two devices finding each other and agreeing to talk. Like exchanging phone numbers before actually calling. |
| **WebRTC** | A browser feature that lets two devices send video to each other directly without a middleman. |
| **SDP** | A text message that says "I can speak these video formats, here's my network info." |
| **ICE** | The process of trying every possible way to connect two devices until one works. |
| **ICE Candidate** | One possible way to reach a device: "Try this IP address on this port." |
| **STUN** | A server that tells you "your public IP is X." Like looking in a mirror to see your own address. |
| **TURN** | A server that relays video when direct connections fail. Like a friend passing notes between two people who can't talk directly. |
| **Offer** | The viewer says "here's what I can support, want to connect?" |
| **Answer** | The camera says "sure, here's what I'll use." |
| **PeerConnection** | The JavaScript object that manages the entire WebRTC session. |
| **Transceiver** | A slot for sending or receiving one type of media (video or audio). |
| **Stream Key** | A UUID that acts as a password for your camera. Keep it secret! |
| **Socket.IO** | A library that makes WebSocket easy (with auto-reconnect and room support). |
| **Room** | A Socket.IO concept. All sockets in a room can broadcast to each other. Like a group chat. |
| **JWT** | A short-lived token that proves you're logged in. Like a wristband at a concert. |
| **Turnstile** | Cloudflare's free, privacy-friendly CAPTCHA alternative. |
| **VPS** | A virtual computer in the cloud. Pay monthly. Runs 24/7. |
| **Firewall** | Software that blocks certain network traffic. Like a bouncer that only lets in certain people. |
| **NAT** | A router feature that lets multiple devices share one public IP. Like an apartment building with one mailing address. |

### Appendix C: Cool Things to Try Next

Once you've built the basic version, here's what you could add:

1. **Cloud recording** — Save video clips to S3 instead of the local server. Already supported, just set `STORAGE_STRATEGY=s3`.
2. **Push notifications** — When motion is detected, send a push notification to your phone. Requires a push service like Firebase or web push API.
3. **Multiple cameras** — The app already supports it. Add 10 cameras and watch them all from one dashboard.
4. **AI object detection** — YOLOv8 is already integrated. It can detect people, animals, cars, and more. Runs on the phone — no cloud AI needed.
5. **Home Assistant integration** — Connect your camera to a smart home system.
6. **Persist signaling state in Redis** — So a server restart doesn't drop all connections.
7. **End-to-end encryption** — Encrypt video before sending so not even the TURN server can see it.

### Appendix D: Further Reading (Links That Actually Helped)

- **MDN WebRTC docs** — https://developer.mozilla.org/en-US/docs/Web/API/WebRTC_API (Better than any tutorial. Read the whole thing.)
- **Socket.IO docs** — https://socket.io/docs/v4/ (The official docs are excellent.)
- **Prisma docs** — https://www.prisma.io/docs (Clear examples, good quickstart.)
- **WebRTC for the Curious** — https://webrtcforthecurious.com/ (Free book, explains everything deeply.)
- **Cloudflare TURN** — https://developers.cloudflare.com/calls/turn/ (Free TURN setup in 5 minutes.)
- **ICE RFC 8445** — https://datatracker.ietf.org/doc/html/rfc8445 (For when you can't sleep and want to read the actual specification.)

### Appendix E: About the Author

**Harkishan Sohanpal** spent approximately 4,000 hours building HK Camera so you don't have to. He learned that:

- `pc.close()` doesn't always fire `connectionstatechange` (you have to check yourself)
- ICE candidates can arrive before the remote description (always buffer them)
- The answer to "should I use a library for WebRTC?" is "no, but you'll wish you had"
- A single `if` guard can be the difference between "works perfectly" and "breaks randomly" (looking at you, `offerInFlightRef`)

Every bug documented in this guide was paid for in actual tears and at least three keyboards. You're welcome.

---

*"For Dummies" is a trademark of John Wiley & Sons, Inc. We are not affiliated. We just like the format. Please don't sue us. We're developers, we have no money.*
