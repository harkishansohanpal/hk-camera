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
import { logger } from '../lib/logger';


const FINAL_SOCKET_URL = import.meta.env.VITE_SOCKET_URL || '';

const FALLBACK_ICE = [
  { urls: 'stun:stun.cloudflare.com:3478' },
  { urls: 'stun:stun.l.google.com:19302' },
  { urls: 'stun:stun1.l.google.com:19302' },
];

// Module-level cache — credentials are valid for 24 h, reuse them across
// all reconnect attempts so we never hammer the backend on retries.
let _cachedIce = null;
let _cacheExpiry = 0;
let _fetchPromise = null;   // deduplicate concurrent fetches

export async function prefetchIceServers() {
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
      logger.warn('WebRTC', 'Could not fetch TURN credentials – falling back to STUN only', { error: err.message });
      return FALLBACK_ICE;
    } finally {
      _fetchPromise = null;
    }
  })();

  return _fetchPromise;
}

async function fetchIceServers() {
  return prefetchIceServers();
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
      maxBitrate: 2000000,
      maxFramerate: 30,
    };

    if (videoSender.setParameters) {
      await videoSender.setParameters(params).catch(() => {});
    }
  } catch (err) {
    logger.warn('WebRTC', 'Could not optimize codecs', { error: err.message });
  }
}

export function useWebRTC({ streamKey, onCommand }) {
  const [status, setStatus]             = useState('idle');
  const [remoteStream, setRemoteStream] = useState(null);
  const [cameraId, setCameraId]         = useState(null);

  const statusRef           = useRef(status);
  useEffect(() => { statusRef.current = status; }, [status]);

  const socketRef         = useRef(null);
  // Viewer: single pcRef
  const pcRef             = useRef(null);
  // Camera: Map of viewerSocketId → { pc, pendingCandidates }
  const viewerPCsRef      = useRef(new Map());

  const localStreamRef    = useRef(null);
  const offerInFlightRef  = useRef(false);
  const pendingCandidates = useRef([]);         // viewer-side ICE buffer
  const onCommandRef      = useRef(onCommand);
  const connectStartRef   = useRef(0);          // timestamp when connectViewer started
  const disconnectTimeoutRef = useRef(null);    // debounce PC disconnected → status change
  const lastCameraOnlineRef  = useRef(0);        // debounce duplicate camera:online events
  useEffect(() => { onCommandRef.current = onCommand; }, [onCommand]);

  // ── Two-way audio: viewer talk state ──
  const [isTalking, setIsTalking] = useState(false);
  const viewerMicStreamRef = useRef(null);

  // ── Partial cleanup (close peer connection but keep socket) ────
  const closePeerConnection = useCallback(() => {
    if (disconnectTimeoutRef.current) {
      clearTimeout(disconnectTimeoutRef.current);
      disconnectTimeoutRef.current = null;
    }
    if (pcRef.current) {
      pcRef.current.close();
      pcRef.current = null;
    }
    offerInFlightRef.current = false;
    pendingCandidates.current = [];
    setRemoteStream(null);
    // Clean up viewer mic if talking
    if (viewerMicStreamRef.current) {
      viewerMicStreamRef.current.getTracks().forEach((t) => t.stop());
      viewerMicStreamRef.current = null;
    }
    setIsTalking(false);
  }, []);

  // ── Full cleanup (disconnect socket and peer connection) ────
  const cleanup = useCallback(() => {
    if (disconnectTimeoutRef.current) {
      clearTimeout(disconnectTimeoutRef.current);
      disconnectTimeoutRef.current = null;
    }
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

    // Clean up viewer mic for talk
    if (viewerMicStreamRef.current) {
      viewerMicStreamRef.current.getTracks().forEach((t) => t.stop());
      viewerMicStreamRef.current = null;
    }
    setIsTalking(false);

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

  // ── Camera: dynamically enable/disable mic on all viewer connections ──
  const setMicEnabled = useCallback((enabled) => {
    const stream = localStreamRef.current;
    if (!stream) return;
    const audioTrack = stream.getAudioTracks()[0];
    if (!audioTrack) return;
    viewerPCsRef.current.forEach(({ pc }) => {
      const audioSender = pc.getSenders().find((s) => s.track?.kind === 'audio');
      if (audioSender) {
        audioSender.replaceTrack(enabled ? audioTrack : null).catch(() => {});
      }
    });
  }, []);

  // ──────────────────────────────────────────────────────────
  //  VIEWER side
  // ──────────────────────────────────────────────────────────
  const connectViewer = useCallback(async () => {
    connectStartRef.current = Date.now();
    logger.info('WebRTC', 'connectViewer called', { streamKey });
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
    logger.debug('WebRTC', 'Creating socket connection');
    const socket = io(FINAL_SOCKET_URL, {
      auth: { token },
      transports: ['websocket'],
      reconnection: true,
      reconnectionAttempts: Infinity,
      reconnectionDelay: 1000,
      reconnectionDelayMax: 5000,
    });
    socketRef.current = socket;
    logger.debug('WebRTC', 'Socket created', { tookMs: Date.now() - connectStartRef.current });

    // Use a flag to prevent handler execution after disconnect
    let isActive = true;

    const initiateOffer = async (socket, isActive) => {
      if (offerInFlightRef.current) return;
      if (!isActive) return;

      const offerStartTime = Date.now();
      logger.info('WebRTC', 'initiateOffer called');
      offerInFlightRef.current = true;

      try {
        if (pcRef.current) {
          pcRef.current.close();
          pcRef.current = null;
        }
        pendingCandidates.current = [];

        logger.debug('WebRTC', 'fetchIceServers starting');
        const iceStart = Date.now();
        const iceServers = await fetchIceServers();
        logger.debug('WebRTC', 'fetchIceServers completed', { tookMs: Date.now() - iceStart });

        const pc = createPeerConnection(iceServers, (candidate) => {
          if (socket.connected) {
            socket.emit('ice:candidate', { candidate });
          }
        });
        pcRef.current = pc;

        pc.ontrack = (e) => {
          const stream = e.streams?.[0] ?? new MediaStream([e.track]);
          setRemoteStream(stream);
        };

        pc.addTransceiver('video', { direction: 'recvonly' });
        pc.addTransceiver('audio', { direction: 'recvonly' });

        // Handle renegotiation for two-way audio (viewer talks)
        pc.onnegotiationneeded = async () => {
          if (offerInFlightRef.current || !isActive) return;
          offerInFlightRef.current = true;
          try {
            const newOffer = await pc.createOffer();
            await pc.setLocalDescription(newOffer);
            if (socket.connected) {
              socket.emit('viewer:offer', { offer: newOffer });
            }
          } catch (err) {
            logger.error('WebRTC', 'Renegotiation failed', { error: err.message });
          } finally {
            offerInFlightRef.current = false;
          }
        };

        pc.onconnectionstatechange = () => {
          if (!isActive) return;
          const s = pc.connectionState;
          logger.info('WebRTC', 'PC connection state change', { state: s });
          if (s === 'connected') {
            if (disconnectTimeoutRef.current) {
              clearTimeout(disconnectTimeoutRef.current);
              disconnectTimeoutRef.current = null;
            }
            const elapsed = Date.now() - connectStartRef.current;
            logger.info('WebRTC', 'Peer connection established', { tookMs: elapsed });
            setStatus('connected');
            offerInFlightRef.current = false;
          }
          if (s === 'disconnected') {
            // Give ICE a chance to recover before tearing down
            offerInFlightRef.current = false;
            if (!disconnectTimeoutRef.current) {
              disconnectTimeoutRef.current = setTimeout(() => {
                disconnectTimeoutRef.current = null;
                setStatus('disconnected');
              }, 4000);
            }
          }
          if (s === 'failed') {
            if (disconnectTimeoutRef.current) {
              clearTimeout(disconnectTimeoutRef.current);
              disconnectTimeoutRef.current = null;
            }
            setStatus('error');
            offerInFlightRef.current = false;
          }
        };

        // ICE restart on transient failures — faster than full teardown
        let iceRestartCount = 0;
        pc.oniceconnectionstatechange = () => {
          if (!isActive) return;
          const iceState = pc.iceConnectionState;
          if ((iceState === 'disconnected' || iceState === 'failed') && iceRestartCount < 3) {
            iceRestartCount++;
            logger.info('WebRTC', 'ICE degraded, restarting', { iceState, attempt: iceRestartCount });
            pc.restartIce();
          }
        };

        logger.debug('WebRTC', 'Creating offer');
        const offerStart = Date.now();
        const offer = await pc.createOffer();
        logger.debug('WebRTC', 'Offer created', { tookMs: Date.now() - offerStart });

        await pc.setLocalDescription(offer);

        if (!socket.connected) {
          throw new Error('Socket disconnected before sending offer');
        }

        logger.info('WebRTC', 'Emitting viewer:offer');
        socket.emit('viewer:offer', { offer });
        logger.info('WebRTC', 'Total initiateOffer time', { tookMs: Date.now() - offerStartTime });
      } catch (err) {
        logger.error('WebRTC', 'Failed to initiate offer', { error: err.message });
        offerInFlightRef.current = false;
        setStatus('error');
      }
    };

    const handleConnect = () => {
      if (isActive) {
        logger.info('WebRTC', 'Socket connected, emitting viewer:join', { streamKey });
        socket.emit('viewer:join', { streamKey });
      }
    };

    const handleCameraStatus = async ({ online, cameraId: id }) => {
      if (!isActive) return;
      logger.info('WebRTC', 'Received camera:status', { online, cameraId: id });
      setCameraId(id);
      if (!online) {
        logger.info('WebRTC', 'Camera offline, waiting');
        setStatus('waiting');
      } else {
        // Check if existing PC is healthy — avoids unnecessary
        // renegotiation after a brief signaling socket glitch
        const pc = pcRef.current;
        if (pc && pc.connectionState === 'connected') {
          logger.info('WebRTC', 'Existing PC healthy, skipping re-initiation');
          if (statusRef.current === 'waiting' || statusRef.current === 'connecting') {
            setStatus('connected');
          }
        } else {
          logger.info('WebRTC', 'Camera online, initiating offer');
          await initiateOffer(socket, isActive);
        }
      }
    };

    const handleCameraOnline = async () => {
      if (!isActive) return;
      // Server emits camera:online to both camera room and user room.
      // The viewer may be in both rooms, so debounce to prevent races.
      if (Date.now() - lastCameraOnlineRef.current < 2000) return;
      lastCameraOnlineRef.current = Date.now();
      logger.debug('WebRTC', 'camera:online received, initiating offer');
      await initiateOffer(socket, isActive);
    };

    const handleCameraOffline = () => {
      if (isActive) {
        logger.info('WebRTC', 'Camera went offline');
        closePeerConnection();
        setStatus('waiting');
      }
    };

    const handleCameraAnswer = async ({ answer }) => {
      if (!isActive) return;
      logger.info('WebRTC', 'Received camera:answer');
      const pc = pcRef.current;
      if (!pc) return;
      try {
        await pc.setRemoteDescription(new RTCSessionDescription(answer));
        logger.debug('WebRTC', 'Remote description set');
        for (const c of pendingCandidates.current) {
          try { await pc.addIceCandidate(new RTCIceCandidate(c)); } catch {}
        }
        pendingCandidates.current = [];
      } catch (err) {
        logger.error('WebRTC', 'Failed to set remote description', { error: err.message });
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
        logger.error('WebRTC', 'Signaling error', { message });
      }
    };

    const handleConnectError = (err) => {
      if (isActive) {
        setStatus('error');
        logger.error('WebRTC', 'Socket connect error', { error: err.message });
      }
    };

    const handleDisconnect = () => {
      logger.warn('WebRTC', 'Socket disconnected unexpectedly', { streamKey });
      // Don't close the PC — socket.io will auto-reconnect and we'll
      // re-establish the signaling path. The PC's own connection state
      // handler (with debounce) will handle a real media-level dropout.
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
  }, [streamKey, closePeerConnection]);

  // ── Viewer: start sending mic audio to camera ──
  const startTalk = useCallback(async () => {
    if (isTalking) return;
    const pc = pcRef.current;
    if (!pc) return;
    try {
      const micStream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const audioTrack = micStream.getAudioTracks()[0];
      if (!audioTrack) {
        micStream.getTracks().forEach((t) => t.stop());
        return;
      }
      viewerMicStreamRef.current = micStream;
      pc.addTrack(audioTrack);
      setIsTalking(true);
    } catch (err) {
      logger.error('WebRTC', 'Failed to start talk', { error: err.message });
    }
  }, [isTalking]);

  // ── Viewer: stop sending mic audio ──
  const stopTalk = useCallback(() => {
    if (!isTalking) return;
    const pc = pcRef.current;
    if (!pc) return;
    const audioSender = pc.getSenders().find((s) => s.track?.kind === 'audio');
    if (audioSender) {
      pc.removeTrack(audioSender);
    }
    if (viewerMicStreamRef.current) {
      viewerMicStreamRef.current.getTracks().forEach((t) => t.stop());
      viewerMicStreamRef.current = null;
    }
    setIsTalking(false);
  }, [isTalking]);

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
      reconnection: true,
      reconnectionAttempts: Infinity,
      reconnectionDelay: 1000,
      reconnectionDelayMax: 5000,
    });
    socketRef.current = socket;

    socket.on('connect', () => {
      logger.info('WebRTC', 'Camera socket connected', { streamKey });
      // Re-register with signaling server after socket reconnect
      // (the server's disconnect handler removes us from the cameras Map)
      socket.emit('camera:reconnect');
      setStatus('connected');
    });
    socket.on('connect_error', (err) => {
      logger.error('WebRTC', 'Camera socket connect error', { error: err.message });
      setStatus('error');
    });

    socket.on('viewer:offer', async ({ viewerSocketId, offer }) => {
      try {
        // Renegotiation: viewer added/removed audio track
        if (viewerPCsRef.current.has(viewerSocketId)) {
          const { pc, pending } = viewerPCsRef.current.get(viewerSocketId);
          await pc.setRemoteDescription(new RTCSessionDescription(offer));
          for (const c of pending) {
            try { await pc.addIceCandidate(new RTCIceCandidate(c)); } catch {}
          }
          pending.length = 0;
          const answer = await pc.createAnswer();
          await pc.setLocalDescription(answer);
          if (socket.connected) {
            socket.emit('camera:answer', { viewerSocketId, answer });
          }
          return;
        }

        // New viewer connection
        const iceServers = await fetchIceServers();

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
        logger.error('WebRTC', 'Failed to handle viewer offer', { viewerSocketId, error: err.message });
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
      logger.info('WebRTC', 'Re-emitting viewer:join to re-check camera status');
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
    setMicEnabled,
    startTalk,
    stopTalk,
    isTalking,
  };
}
