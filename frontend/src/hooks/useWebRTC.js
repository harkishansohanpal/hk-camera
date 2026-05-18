/**
 * useWebRTC
 * ─────────────────────────────────────────────────────────────
 * Shared hook used by both the Camera (broadcaster) and
 * Viewer (consumer) sides of a WebRTC session.
 *
 * Key reliability fixes:
 *  - Single camera:status handler (no duplicate initiateOffer calls)
 *  - ICE candidate buffering (candidates queued until remote desc is set)
 *  - In-flight guard (prevents double offer when camera:online races with camera:status)
 *  - Multi-viewer support: camera side uses a Map so multiple viewers
 *    can connect simultaneously without killing each other's connection
 *  - Fresh TURN credentials fetched from backend on every connection attempt
 */

import { useState, useRef, useCallback, useEffect } from 'react';
import { io } from 'socket.io-client';
import { turnAPI } from '../services/api';

const FINAL_SOCKET_URL = import.meta.env.VITE_SOCKET_URL || '';

const FALLBACK_ICE = [{ urls: 'stun:stun.cloudflare.com:3478' }];

// Module-level cache — credentials are valid for 24 h, reuse them across
// all reconnect attempts so we never hammer the backend on retries.
let _cachedIce = null;
let _cacheExpiry = 0;
let _fetchPromise = null;   // deduplicate concurrent fetches

export async function prefetchIceServers(timeoutMs = 5000) {
  const now = Date.now();
  if (_cachedIce && _cacheExpiry - now > 5 * 60 * 1000) {
    return _cachedIce;
  }
  if (_fetchPromise) return _fetchPromise;

  _fetchPromise = (async () => {
    try {
      const { data } = await turnAPI.getCredentials();
      _cachedIce   = data.data.iceServers;
      _cacheExpiry = now + (data.data.ttl ?? 86400) * 1000;
      return _cachedIce;
    } catch (err) {
      console.warn('Could not fetch TURN credentials – falling back to STUN only', err);
      return FALLBACK_ICE;
    } finally {
      _fetchPromise = null;
    }
  })();

  return _fetchPromise;
}

async function fetchIceServers(timeoutMs = 5000) {
  return prefetchIceServers(timeoutMs);
}

// ── Codec optimization for high-quality video ──
async function optimizeCodecs(pc) {
  try {
    const senders = pc.getSenders();
    const videoSender = senders.find((s) => s.track?.kind === 'video');
    if (!videoSender) return;

    const params = videoSender.getParameters?.();
    if (!params || !params.encodings) return;

    // Prefer VP9 for better quality, fall back to H264/VP8
    // Set higher bitrate limits for better quality
    params.encodings[0] = {
      ...params.encodings[0],
      maxBitrate: 5000000, // 5 Mbps for quality
      maxFramerate: 30,
      scaleResolutionDownBy: 1, // Keep full resolution
    };

    if (videoSender.setParameters) {
      await videoSender.setParameters(params).catch(() => {});
    }
  } catch (err) {
    console.warn('Could not optimize codecs:', err);
  }
}

export function useWebRTC({ role, streamKey, onCommand }) {
  const [status, setStatus]             = useState('idle');
  const [remoteStream, setRemoteStream] = useState(null);
  const [cameraId, setCameraId]         = useState(null);

  const socketRef         = useRef(null);
  // Viewer: single pcRef
  const pcRef             = useRef(null);
  // Camera: Map of viewerSocketId → { pc, pendingCandidates }
  const viewerPCsRef      = useRef(new Map());

  const localStreamRef    = useRef(null);
  const offerInFlightRef  = useRef(false);
  const pendingCandidates = useRef([]);         // viewer-side ICE buffer
  const onCommandRef      = useRef(onCommand);
  useEffect(() => { onCommandRef.current = onCommand; }, [onCommand]);

  // ── Partial cleanup (close peer connection but keep socket) ────
  const closePeerConnection = useCallback(() => {
    if (pcRef.current) {
      pcRef.current.close();
      pcRef.current = null;
    }
    offerInFlightRef.current = false;
    pendingCandidates.current = [];
    setRemoteStream(null);
  }, []);

  // ── Full cleanup (disconnect socket and peer connection) ────
  const cleanup = useCallback(() => {
    // Disconnect socket first (prevents new events firing during cleanup)
    if (socketRef.current) {
      socketRef.current.disconnect();
      socketRef.current = null;
    }

    closePeerConnection();

    // Camera cleanup
    viewerPCsRef.current.forEach(({ pc }) => pc.close());
    viewerPCsRef.current.clear();

    localStreamRef.current?.getTracks().forEach((t) => t.stop());
    localStreamRef.current = null;
    setStatus('disconnected');
  }, [closePeerConnection]);

  // ── Create RTCPeerConnection ──────────────────────────────
  function createPeerConnection(iceServers, onIceCandidate) {
    const pc = new RTCPeerConnection({
      iceServers,
      bundlePolicy: 'max-bundle',
      rtcpMuxPolicy: 'require',
    });
    pc.onicecandidate = (e) => { if (e.candidate) onIceCandidate(e.candidate); };
    return pc;
  }

  // ──────────────────────────────────────────────────────────
  //  VIEWER side
  // ──────────────────────────────────────────────────────────
  const connectViewer = useCallback(async () => {
    console.log('[WebRTC] connectViewer called');
    const connectStartTime = Date.now();
    setStatus('connecting');
    offerInFlightRef.current = false;
    pendingCandidates.current = [];

    // Clean up any old socket/PC before creating new one
    if (socketRef.current) {
      socketRef.current.disconnect();
      socketRef.current = null;
    }
    closePeerConnection();

    const token = localStorage.getItem('accessToken');
    console.log('[WebRTC] Creating socket connection');
    const socket = io(FINAL_SOCKET_URL, {
      auth: { token },
      transports: ['websocket'],
      reconnection: false, // Viewer.jsx manages reconnect with backoff
    });
    socketRef.current = socket;
    console.log(`[WebRTC] Socket created (took ${Date.now() - connectStartTime}ms)`);

    // Use a flag to prevent handler execution after disconnect
    let isActive = true;

    const handleConnect = () => {
      if (isActive) {
        console.log('[WebRTC] Socket connected, emitting viewer:join');
        socket.emit('viewer:join', { streamKey });
      }
    };

    const handleCameraStatus = async ({ online, cameraId: id }) => {
      if (!isActive) return;
      console.log('[WebRTC] Received camera:status', { online, cameraId: id });
      setCameraId(id);
      if (!online) {
        setStatus('waiting');
      } else {
        console.log('[WebRTC] Camera online, initiating offer');
        await initiateOffer(socket, isActive);
      }
    };

    const handleCameraOnline = async () => {
      if (!isActive) return;
      // Guard against duplicate offers—camera:status already handles the online transition
      if (!offerInFlightRef.current) {
        await initiateOffer(socket, isActive);
      }
    };

    const handleCameraOffline = () => {
      if (isActive) {
        // Close peer connection but keep socket alive to receive camera:online later
        closePeerConnection();
        setStatus('waiting');
      }
    };

    const handleCameraAnswer = async ({ answer }) => {
      if (!isActive) return;
      console.log('[WebRTC] Received camera:answer');
      const pc = pcRef.current;
      if (!pc) return;
      try {
        await pc.setRemoteDescription(new RTCSessionDescription(answer));
        console.log('[WebRTC] Remote description set');
        // Drain any ICE candidates that arrived before the answer
        for (const c of pendingCandidates.current) {
          try { await pc.addIceCandidate(new RTCIceCandidate(c)); } catch {}
        }
        pendingCandidates.current = [];
      } catch (err) {
        console.error('Failed to set remote description:', err);
        // Reset flag to allow retry
        offerInFlightRef.current = false;
      }
    };

    const handleIceCandidate = async ({ candidate }) => {
      if (!isActive) return;
      const pc = pcRef.current;
      if (!pc) return;
      if (!pc.remoteDescription) {
        pendingCandidates.current.push(candidate);
      } else {
        try { await pc.addIceCandidate(new RTCIceCandidate(candidate)); } catch {}
      }
    };

    const handleError = ({ message }) => {
      if (isActive) {
        setStatus('error');
        console.error('WebRTC signaling error:', message);
      }
    };

    const handleConnectError = (err) => {
      if (isActive) {
        setStatus('error');
        console.error('Socket connect error:', err.message);
      }
    };

    const handleDisconnect = () => {
      if (isActive) {
        // Unexpected drop (tunnel restart, network blip) — let Viewer.jsx auto-retry
        setStatus('disconnected');
        closePeerConnection();
      }
      isActive = false;
    };

    socket.on('connect', handleConnect);
    socket.on('camera:status', handleCameraStatus);
    socket.on('camera:online', handleCameraOnline);
    socket.on('camera:offline', handleCameraOffline);
    socket.on('camera:answer', handleCameraAnswer);
    socket.on('ice:candidate', handleIceCandidate);
    socket.on('error', handleError);
    socket.on('connect_error', handleConnectError);
    socket.on('disconnect', handleDisconnect);

    // Cleanup: remove listeners when hook unmounts or reconnects
    return () => {
      isActive = false;
      socket.off('connect', handleConnect);
      socket.off('camera:status', handleCameraStatus);
      socket.off('camera:online', handleCameraOnline);
      socket.off('camera:offline', handleCameraOffline);
      socket.off('camera:answer', handleCameraAnswer);
      socket.off('ice:candidate', handleIceCandidate);
      socket.off('error', handleError);
      socket.off('connect_error', handleConnectError);
      socket.off('disconnect', handleDisconnect);
    };
  }, [streamKey, cleanup]);

  async function initiateOffer(socket, isActive) {
    if (offerInFlightRef.current) return;
    if (!isActive) return;

    console.log('[WebRTC] initiateOffer called');
    const offerStartTime = Date.now();
    offerInFlightRef.current = true;

    try {
      if (pcRef.current) {
        pcRef.current.close();
        pcRef.current = null;
      }
      pendingCandidates.current = [];

      console.log('[WebRTC] fetchIceServers starting');
      const iceStart = Date.now();
      const iceServers = await fetchIceServers();
      console.log(`[WebRTC] fetchIceServers completed in ${Date.now() - iceStart}ms`);

      const pc = createPeerConnection(iceServers, (candidate) => {
        // Check if still active before sending
        if (socket.connected) {
          socket.emit('ice:candidate', { candidate });
        }
      });
      pcRef.current = pc;

      pc.ontrack = (e) => {
        // e.streams[0] is the camera's MediaStream; fall back to wrapping the
        // track in a new stream in case the browser omits the streams array.
        const stream = e.streams?.[0] ?? new MediaStream([e.track]);
        setRemoteStream(stream);
      };

      pc.addTransceiver('video', { direction: 'recvonly' });
      pc.addTransceiver('audio', { direction: 'recvonly' });

      pc.onconnectionstatechange = () => {
        if (!isActive) return;
        const s = pc.connectionState;
        console.log('[WebRTC] PC connection state:', s);
        if (s === 'connected') {
          console.log('[WebRTC] ✅ Peer connection established!');
          setStatus('connected');
          offerInFlightRef.current = false;
        }
        if (s === 'disconnected') {
          setStatus('disconnected');
          offerInFlightRef.current = false;
        }
        if (s === 'failed') {
          setStatus('error');
          offerInFlightRef.current = false;
        }
      };

      console.log('[WebRTC] Creating offer');
      const offerStart = Date.now();
      const offer = await pc.createOffer();
      console.log(`[WebRTC] Offer created in ${Date.now() - offerStart}ms`);

      await pc.setLocalDescription(offer);
      console.log('[WebRTC] Local description set');

      // Check socket is still connected before sending
      if (!socket.connected) {
        throw new Error('Socket disconnected before sending offer');
      }

      console.log('[WebRTC] Emitting viewer:offer');
      socket.emit('viewer:offer', { offer });
      console.log(`[WebRTC] Total initiateOffer time: ${Date.now() - offerStartTime}ms`);
    } catch (err) {
      console.error('Failed to initiate offer:', err);
      offerInFlightRef.current = false;  // Reset flag on error
      setStatus('error');
    }
  }

  // ──────────────────────────────────────────────────────────
  //  CAMERA side (broadcaster) — supports multiple viewers
  // ──────────────────────────────────────────────────────────
  const startBroadcast = useCallback(async (mediaStream) => {
    setStatus('connecting');
    localStreamRef.current = mediaStream;

    // Clean up any existing socket before creating new one
    if (socketRef.current) {
      socketRef.current.disconnect();
    }

    const socket = io(FINAL_SOCKET_URL, {
      auth: { streamKey },
      transports: ['websocket'],
    });
    socketRef.current = socket;

    socket.on('connect', () => setStatus('connected'));
    socket.on('connect_error', (err) => { setStatus('error'); console.error(err); });

    socket.on('viewer:offer', async ({ viewerSocketId, offer }) => {
      try {
        const iceServers = await fetchIceServers();

        // Close any existing connection for this specific viewer
        if (viewerPCsRef.current.has(viewerSocketId)) {
          viewerPCsRef.current.get(viewerSocketId).pc.close();
          viewerPCsRef.current.delete(viewerSocketId);
        }

        const pending = [];

        const pc = createPeerConnection(iceServers, (candidate) => {
          if (socket.connected) {
            socket.emit('ice:candidate', { viewerSocketId, candidate });
          }
        });

        pc.onconnectionstatechange = () => {
          if (pc.connectionState === 'failed' || pc.connectionState === 'closed') {
            viewerPCsRef.current.delete(viewerSocketId);
          }
        };

        viewerPCsRef.current.set(viewerSocketId, { pc, pending });

        mediaStream.getTracks().forEach((track) => pc.addTrack(track, mediaStream));

        // Optimize codecs and bitrate for high-quality streaming
        await optimizeCodecs(pc);

        await pc.setRemoteDescription(new RTCSessionDescription(offer));

        // Drain any candidates that arrived before setRemoteDescription
        for (const c of pending) {
          try { await pc.addIceCandidate(new RTCIceCandidate(c)); } catch {}
        }
        pending.length = 0;

        const answer = await pc.createAnswer();
        await pc.setLocalDescription(answer);
        
        if (socket.connected) {
          socket.emit('camera:answer', { viewerSocketId, answer });
        }
      } catch (err) {
        console.error('Failed to handle viewer offer:', err);
        // Clean up this viewer's connection on error
        if (viewerPCsRef.current.has(viewerSocketId)) {
          viewerPCsRef.current.get(viewerSocketId).pc.close();
          viewerPCsRef.current.delete(viewerSocketId);
        }
      }
    });

    socket.on('ice:candidate', async ({ viewerSocketId, candidate }) => {
      const entry = viewerPCsRef.current.get(viewerSocketId);
      if (!entry) return;
      const { pc, pending } = entry;
      if (!pc.remoteDescription) {
        pending.push(candidate);
      } else {
        try { await pc.addIceCandidate(new RTCIceCandidate(candidate)); } catch {}
      }
    });

    socket.on('viewer:left', ({ viewerSocketId }) => {
      if (viewerPCsRef.current.has(viewerSocketId)) {
        viewerPCsRef.current.get(viewerSocketId).pc.close();
        viewerPCsRef.current.delete(viewerSocketId);
      }
    });

    socket.on('viewer:command', ({ command, payload }) => {
      onCommandRef.current?.(command, payload);
    });
  }, [streamKey]);

  const stopBroadcast = useCallback(() => {
    socketRef.current?.disconnect();
    cleanup();
  }, [cleanup]);

  const disconnectViewer = useCallback(() => {
    socketRef.current?.disconnect();
    cleanup();
  }, [cleanup]);

  const sendCommand = useCallback((command, payload = {}) => {
    socketRef.current?.emit('viewer:command', { command, payload });
  }, []);

  const rejoinViewer = useCallback(() => {
    const socket = socketRef.current;
    if (socket?.connected) {
      console.log('[WebRTC] Re-emitting viewer:join to re-check camera status');
      socket.emit('viewer:join', { streamKey });
    }
  }, [streamKey]);

  useEffect(() => () => {
    socketRef.current?.disconnect();
    cleanup();
  }, [cleanup]);

  return {
    status,
    remoteStream,
    cameraId,
    connectViewer,
    disconnectViewer,
    startBroadcast,
    stopBroadcast,
    sendCommand,
    rejoinViewer,
  };
}
