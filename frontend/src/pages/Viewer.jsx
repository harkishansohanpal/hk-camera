/**
 * Viewer – watch the remote camera feed via WebRTC.
 * Works on desktop and mobile browsers.
 */

import { useEffect, useRef, useState, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, Maximize2, Volume2, VolumeX, RotateCcw, Zap, ZapOff, Moon, BatteryCharging, Eye, EyeOff, Scan } from 'lucide-react';
import { useWebRTC, prefetchIceServers } from '../hooks/useWebRTC';
import { useMotionDetection } from '../hooks/useMotionDetection';
import { useYoloDetection } from '../hooks/useYoloDetection';
import { useMediaRecorder } from '../hooks/useMediaRecorder';
import CameraControlsPanel from '../components/CameraControlsPanel';
import ViewerStream from '../components/ViewerStream';
import DetectionOverlay from '../components/DetectionOverlay';

// Backoff delays (seconds) for successive reconnect attempts
const RETRY_DELAYS = [3, 5, 10, 30, 60];
// Abort and retry if stuck in 'connecting' for this long
const CONNECT_TIMEOUT_MS = 15000;

export default function Viewer() {
  const { streamKey } = useParams();
  const navigate = useNavigate();
  const videoRef = useRef(null);

  const [muted, setMuted]               = useState(true);
  const [showControls, setShowControls] = useState(true);
  const [isRecording, setIsRecording]   = useState(false);
  const [recordingDuration, setRecordingDuration] = useState(0);

  const [motionEnabled, setMotionEnabled]   = useState(false);
  const [torchOn, setTorchOn]               = useState(false);
  const [screenDim, setScreenDim]           = useState(false);
  const [backgroundMode, setBackgroundMode] = useState(false);
  const [nightVisionMode, setNightVisionMode] = useState('off');
  const [showDetections, setShowDetections] = useState(false);
  const showDetectionsRef = useRef(false);
  const [detections, setDetections] = useState([]);

  // Camera controls (for remote control on host camera)
  const [cameraControlSettings, setCameraControlSettings] = useState({
    exposure: 0,
    focus: 50,
    whiteBalance: 'auto',
    iso: 100,
    brightness: 50,
    contrast: 50,
  });

  // Torch works on iOS (native) and Android (white screen fallback)
  const isAndroid = /Android/.test(navigator.userAgent);

  // Retry state
  const [retryCountdown, setRetryCountdown] = useState(null);
  const retryCountRef  = useRef(0);
  const isRetryingRef  = useRef(false);

  const { remoteStream, status, cameraId, connectViewer, disconnectViewer, sendCommand, rejoinViewer } = useWebRTC({
    role: 'viewer',
    streamKey,
  });

  // Recording hook
  const { startRecording, stopRecording, isRecording: recorderIsRecording, duration } = useMediaRecorder({
    cameraId,
    trigger: 'MOTION',
    onRecordingReady: useCallback((recording) => {
      console.log('Recording saved:', recording);
      setIsRecording(false);
      setRecordingDuration(0);
    }, [])
  });

  // Motion detection hook
  const { startDetection, stopDetection } = useMotionDetection({
    videoRef,
    sensitivity: 15,
    cooldownMs: 5000,
    onMotion: useCallback(({ changeRatio }) => {
      console.log(`Motion detected! ${changeRatio.toFixed(1)}% change`);
      if (remoteStream && !recorderIsRecording && cameraId) {
        setIsRecording(true);
        startRecording(remoteStream);
      }
    }, [remoteStream, recorderIsRecording, cameraId, startRecording])
  });

  // ── ML detection (YOLO) – runs independently for bounding boxes
  const { startDetection: startMl, stopDetection: stopMl, modelLoaded, loadingError: mlLoadingError, inferenceError: mlInferenceError } = useYoloDetection({
    videoRef,
    confidence: 50,
    onDetection: (dets) => {
      if (showDetectionsRef.current) {
        setDetections(dets);
      }
    },
    onMotion: ({ detections: interesting }) => {
      console.log('[Viewer] ML motion:', interesting.map(d => `${d.class} ${(d.confidence*100).toFixed(0)}%`).join(', '));
      if (remoteStream && !recorderIsRecording && cameraId) {
        setIsRecording(true);
        startRecording(remoteStream);
      }
    },
  });

  // ── Retry helpers
  const handleRetry = useCallback(() => {
    isRetryingRef.current = true;
    disconnectViewer();
    setTimeout(() => {
      connectViewer();
    }, 500);
  }, [connectViewer, disconnectViewer]);

  function doManualRetry() {
    retryCountRef.current = 0;
    setRetryCountdown(null);
    handleRetry();
  }

  // ── Camera control handlers (send to host camera)
  const handleCameraControlChange = useCallback((key, value) => {
    console.log('[Viewer] Sending camera control:', key, '=', value);
    setCameraControlSettings((prev) => ({ ...prev, [key]: value }));
    sendCommand('CAMERA_CONTROL', { control: key, value });
  }, [sendCommand]);

  const handleCameraControlReset = useCallback(() => {
    const defaults = {
      exposure: 0,
      focus: 50,
      whiteBalance: 'auto',
      iso: 100,
      brightness: 50,
      contrast: 50,
    };
    setCameraControlSettings(defaults);
    Object.entries(defaults).forEach(([key, value]) => {
      sendCommand('CAMERA_CONTROL', { control: key, value });
    });
  }, [sendCommand]);

  // ── Prefetch TURN credentials and connect
  useEffect(() => {
    console.log('[Viewer] Prefetching TURN credentials');
    let isMounted = true;

    prefetchIceServers()
      .catch((err) => {
        console.warn('[Viewer] Prefetch failed, will fallback to STUN:', err);
      })
      .finally(() => {
        if (isMounted) {
          console.log('[Viewer] Credentials ready, connecting');
          connectViewer();
        }
      });

    return () => {
      isMounted = false;
      disconnectViewer();
    };
  }, [streamKey, connectViewer, disconnectViewer]);

  // ── Auto-retry on disconnect / error
  useEffect(() => {
    if (status !== 'disconnected' && status !== 'error') {
      isRetryingRef.current = false;
      setRetryCountdown(null);
      return;
    }

    if (isRetryingRef.current) return;

    const delay = RETRY_DELAYS[Math.min(retryCountRef.current, RETRY_DELAYS.length - 1)];
    setRetryCountdown(delay);

    const tick = setInterval(() => {
      setRetryCountdown((n) => (n != null && n > 1 ? n - 1 : 0));
    }, 1000);

    const timer = setTimeout(() => {
      clearInterval(tick);
      retryCountRef.current += 1;
      handleRetry();
    }, delay * 1000);

    return () => {
      clearInterval(tick);
      clearTimeout(timer);
    };
  }, [status, handleRetry]);

  // ── Abort if stuck 'connecting' too long
  useEffect(() => {
    if (status !== 'connecting') return;
    const t = setTimeout(() => {
      console.warn(`[Viewer] ⏱️ Connection timed out – retrying`);
      handleRetry();
    }, CONNECT_TIMEOUT_MS);
    return () => clearTimeout(t);
  }, [status, handleRetry]);

  // ── While 'waiting', periodically re-check camera online status
  useEffect(() => {
    if (status !== 'waiting') return;
    const interval = setInterval(() => {
      rejoinViewer();
    }, 8000);
    return () => clearInterval(interval);
  }, [status, rejoinViewer]);

  // ── Start/stop motion detection
  useEffect(() => {
    if (status === 'connected' && remoteStream && motionEnabled) {
      startDetection();
    } else {
      stopDetection();
    }
    return () => stopDetection();
  }, [status, remoteStream, motionEnabled, startDetection, stopDetection]);

  // ── Start/stop ML detection (runs while connected for bounding boxes)
  useEffect(() => {
    if (status === 'connected' && remoteStream) {
      startMl();
    } else {
      stopMl();
      setDetections([]);
    }
    return () => stopMl();
  }, [status, remoteStream, startMl, stopMl]);

  // ── Auto-stop recording after 30 s
  useEffect(() => {
    if (!recorderIsRecording) return;
    const t = setTimeout(() => stopRecording(), 30_000);
    return () => clearTimeout(t);
  }, [recorderIsRecording, stopRecording]);

  // ── Sync recording state
  useEffect(() => {
    setIsRecording(recorderIsRecording);
    setRecordingDuration(duration);
  }, [recorderIsRecording, duration]);

  // ── Auto-hide controls after 3 s once live
  useEffect(() => {
    if (status !== 'connected') return;
    const t = setTimeout(() => setShowControls(false), 3000);
    return () => clearTimeout(t);
  }, [status, showControls]);

  // ── Mute sync
  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;
    video.muted = muted;
    if (!muted && video.paused) video.play().catch(() => {});
  }, [muted]);

  function handleFullscreen() {
    const videoEl = videoRef.current;
    const containerEl = document.getElementById('viewer-container');

    // Try iOS video fullscreen first
    if (videoEl?.webkitEnterFullscreen) {
      videoEl.webkitEnterFullscreen();
      return;
    }

    // Try standard fullscreen API
    if (!document.fullscreenElement) {
      containerEl?.requestFullscreen?.().catch(() => {
        // Fallback: just hide controls and top bar for iOS PWA
        setShowControls(false);
      });
    } else {
      document.exitFullscreen?.();
    }
  }

  const isBad = status === 'error' || status === 'disconnected';

  return (
    <div className="absolute inset-0 flex flex-col bg-black">
      {/* ── Top Navigation Bar ──────────────────────────────── */}
      <nav
        className="z-20 flex items-center justify-between bg-slate-900/95 backdrop-blur-md border-b border-slate-700/60"
        style={{
          paddingTop: 'env(safe-area-inset-top)',
          paddingBottom: '0.5rem',
          paddingLeft: 'max(0.75rem, env(safe-area-inset-left))',
          paddingRight: 'max(0.75rem, env(safe-area-inset-right))',
        }}
      >
        {/* Back button */}
        <button
          onClick={() => navigate(-1)}
          className="flex items-center justify-center text-slate-400 hover:text-white rounded-lg transition-colors flex-shrink-0"
          style={{
            width: '44px',
            height: '44px'
          }}
          title="Back"
        >
          <ArrowLeft size={24} />
        </button>

        {/* Status indicator (center) */}
        <div className="flex-1 flex justify-center px-2">
          <div
            className="flex items-center gap-1.5 px-2 py-1 rounded-lg whitespace-nowrap"
            style={{ backgroundColor: 'rgba(0,0,0,0.3)' }}
          >
            <div
              className={`rounded-full flex-shrink-0 ${
                status === 'connected'   ? 'bg-green-500 animate-pulse' :
                status === 'connecting'  ? 'bg-yellow-500 animate-pulse' :
                isBad                    ? 'bg-red-500' :
                                           'bg-slate-600'
              }`}
              style={{ width: '8px', height: '8px' }}
            />
            <span
              className={`font-medium capitalize text-sm ${
                status === 'connected'   ? 'text-green-400' :
                status === 'connecting'  ? 'text-yellow-400' :
                isBad                    ? 'text-red-400' :
                                           'text-slate-400'
              }`}
            >
              {status === 'connected' ? 'LIVE' : status}
            </span>
          </div>
        </div>

        {/* Fullscreen button */}
        <button
          onClick={handleFullscreen}
          className="flex items-center justify-center text-slate-400 hover:text-white rounded-lg transition-colors flex-shrink-0"
          style={{
            width: '44px',
            height: '44px'
          }}
          title="Fullscreen"
        >
          <Maximize2 size={24} />
        </button>
      </nav>

      {/* ── Video ───────────────────────────────────────────── */}
      <div
        id="viewer-container"
        className="flex-1 relative bg-black overflow-hidden"
        onClick={() => setShowControls((v) => !v)}
      >
        <ViewerStream
          remoteStream={remoteStream}
          status={status}
          className="w-full h-full"
          videoRef={videoRef}
          isRecording={isRecording}
          recordingDuration={recordingDuration}
          nightVision={nightVisionMode}
        />

        {/* ── ML detection bounding boxes ────────────────────── */}
        {showDetections && (
          <DetectionOverlay
            detections={detections}
            videoRef={videoRef}
            visible={showDetections}
          />
        )}

        {/* ── ML model status ─────────────────────────────────── */}
        {(mlLoadingError || mlInferenceError) && showDetections && (
          <div className="absolute bottom-2 left-2 right-2 z-30 flex flex-col gap-1">
            {mlLoadingError && (
              <div className="bg-red-500/80 text-white text-[11px] px-2 py-1 rounded">
                ML model error: {mlLoadingError}
              </div>
            )}
            {mlInferenceError && (
              <div className="bg-red-500/80 text-white text-[11px] px-2 py-1 rounded">
                ML inference error: {mlInferenceError}
              </div>
            )}
          </div>
        )}

        {/* ── Reconnect overlay ──────────────────────────────── */}
        {isBad && (
          <div
            className="absolute inset-0 flex flex-col items-center justify-center gap-3 z-30 bg-black/40"
            onClick={(e) => e.stopPropagation()}
          >
            <button
              onClick={doManualRetry}
              className="flex items-center gap-2 bg-white/10 hover:bg-white/20 active:bg-white/30 text-white text-sm font-semibold px-6 py-3 rounded-2xl border border-white/20 backdrop-blur-sm transition-colors"
            >
              <RotateCcw size={16} />
              Retry Now
            </button>
            {retryCountdown != null && retryCountdown > 0 && (
              <p className="text-slate-400 text-xs">
                Auto-retry in {retryCountdown}s
              </p>
            )}
          </div>
        )}

        {/* ── Bottom control panel (hidden on desktop, visible above bottom nav on mobile) ──── */}
        {status === 'connected' && (
          <div
            className={`
              absolute bottom-0 left-0 right-0 z-20 transition-opacity duration-300
              ${showControls ? 'opacity-100' : 'opacity-0 pointer-events-none'}
            `}
            style={{ paddingBottom: 'calc(env(safe-area-inset-bottom) + 0.5rem)' }}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="mx-2 mb-2 bg-black/70 backdrop-blur-md rounded-2xl p-2 flex items-center justify-around gap-1">
              <button
                onClick={() => { const n = !torchOn; setTorchOn(n); sendCommand('TORCH', { on: n }); }}
                className={`flex flex-col items-center justify-center gap-0.5 w-9 h-9 sm:w-10 sm:h-11 rounded-lg transition-colors flex-shrink-0 ${torchOn ? 'text-yellow-400 bg-yellow-500/10' : 'text-slate-400 hover:text-white hover:bg-white/5'}`}
                title={isAndroid ? 'Screen light' : 'Flashlight'}
              >
                {torchOn ? <Zap size={16} /> : <ZapOff size={16} />}
                <span className="text-[10px] sm:text-xs">Torch</span>
              </button>
              <button
                onClick={() => { const n = !screenDim; setScreenDim(n); sendCommand('SCREEN_DIM', { on: n }); }}
                className={`flex flex-col items-center justify-center gap-0.5 w-9 h-9 sm:w-10 sm:h-11 rounded-lg transition-colors flex-shrink-0 ${screenDim ? 'text-blue-400 bg-blue-500/10' : 'text-slate-400 hover:text-white hover:bg-white/5'}`}
              >
                <Moon size={16} />
                <span className="text-[10px] sm:text-xs">Screen</span>
              </button>
              <button
                onClick={() => { const n = !backgroundMode; setBackgroundMode(n); sendCommand('BACKGROUND', { on: n }); }}
                className={`flex flex-col items-center justify-center gap-0.5 w-9 h-9 sm:w-10 sm:h-11 rounded-lg transition-colors flex-shrink-0 ${backgroundMode ? 'text-green-400 bg-green-500/10' : 'text-slate-400 hover:text-white hover:bg-white/5'}`}
              >
                <BatteryCharging size={16} />
                <span className="text-[10px] sm:text-xs">BG Mode</span>
              </button>
              <button
                onClick={() => setMotionEnabled((v) => !v)}
                className={`flex flex-col items-center justify-center gap-0.5 w-9 h-9 sm:w-10 sm:h-11 rounded-lg transition-colors flex-shrink-0 ${motionEnabled ? 'text-hk-400 bg-hk-500/10' : 'text-slate-400 hover:text-white hover:bg-white/5'}`}
              >
                {motionEnabled ? <Eye size={16} /> : <EyeOff size={16} />}
                <span className="text-[10px] sm:text-xs">Motion</span>
              </button>
              <button
                onClick={() => { showDetectionsRef.current = !showDetections; setShowDetections((v) => !v); }}
                className={`flex flex-col items-center justify-center gap-0.5 w-9 h-9 sm:w-10 sm:h-11 rounded-lg transition-colors flex-shrink-0 ${showDetections ? 'text-hk-400 bg-hk-500/10' : 'text-slate-400 hover:text-white hover:bg-white/5'}`}
                title="Show ML detections"
              >
                <Scan size={16} />
                <span className="text-[10px] sm:text-xs">
                  {modelLoaded ? 'Detect' : 'ML…'}
                </span>
              </button>
              <button
                onClick={() => setNightVisionMode((m) => m === 'off' ? 'enhanced' : m === 'enhanced' ? 'ir' : 'off')}
                className={`flex flex-col items-center justify-center gap-0.5 w-9 h-9 sm:w-10 sm:h-11 rounded-lg transition-colors flex-shrink-0 ${nightVisionMode !== 'off' ? 'text-green-400 bg-green-500/10' : 'text-slate-400 hover:text-white hover:bg-white/5'}`}
              >
                <Eye size={16} />
                <span className="text-[10px] sm:text-xs">{nightVisionMode === 'ir' ? 'IR' : nightVisionMode === 'enhanced' ? 'NV' : 'Night'}</span>
              </button>

              {/* Camera controls */}
              <div className="relative">
                <CameraControlsPanel
                  capabilities={{}}
                  settings={cameraControlSettings}
                  onControlChange={handleCameraControlChange}
                  onReset={handleCameraControlReset}
                />
              </div>
            </div>
          </div>
        )}

      </div>
    </div>
  );
}
