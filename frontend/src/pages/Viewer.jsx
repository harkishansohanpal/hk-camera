import { useEffect, useRef, useState, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, Maximize2, Volume2, VolumeX, RotateCcw, Zap, ZapOff, Moon, BatteryCharging, Eye, EyeOff, Scan, Circle, Activity } from 'lucide-react';
import { useWebRTC, prefetchIceServers } from '../hooks/useWebRTC';
import { useMotionDetection } from '../hooks/useMotionDetection';
import { useYoloDetection } from '../hooks/useYoloDetection';
import { useMediaRecorder } from '../hooks/useMediaRecorder';
import { useWakeLock } from '../hooks/useWakeLock';
import { logger } from '../lib/logger';
import CameraControlsPanel from '../components/CameraControlsPanel';
import ViewerStream from '../components/ViewerStream';
import DetectionOverlay from '../components/DetectionOverlay';
import api from '../services/api';

const RETRY_DELAYS = [1, 2, 5, 15, 30, 60];
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
  const [recordOnMotion, setRecordOnMotion] = useState(false);
  const [torchOn, setTorchOn]               = useState(false);
  const [screenDim, setScreenDim]           = useState(false);
  const [backgroundMode, setBackgroundMode] = useState(false);
  const [nightVisionMode, setNightVisionMode] = useState('off');
  const [showDetections, setShowDetections] = useState(false);
  const showDetectionsRef = useRef(false);
  const [detections, setDetections] = useState([]);

  const [cameraControlSettings, setCameraControlSettings] = useState({
    exposure: 0,
    focus: 50,
    whiteBalance: 'auto',
    iso: 100,
    brightness: 50,
    contrast: 50,
  });

  const isAndroid = /Android/.test(navigator.userAgent);

  const [retryCountdown, setRetryCountdown] = useState(null);
  const retryCountRef  = useRef(0);
  const isRetryingRef  = useRef(false);

  const { acquire: acquireWL, release: releaseWL } = useWakeLock();

  const { remoteStream, status, cameraId, connectViewer, disconnectViewer, sendCommand, rejoinViewer, connectionMetrics } = useWebRTC({
    role: 'viewer',
    streamKey,
  });

  const { startRecording, stopRecording, isRecording: recorderIsRecording, duration } = useMediaRecorder({
    cameraId,
    trigger: 'MOTION',
    onRecordingReady: useCallback((recording) => {
      logger.info('Viewer', 'Recording saved', { recording: recording?.id });
      setIsRecording(false);
      setRecordingDuration(0);
    }, [])
  });

  const { startDetection, stopDetection } = useMotionDetection({
    videoRef,
    sensitivity: 15,
    cooldownMs: 5000,
    onMotion: useCallback(({ changeRatio }) => {
      logger.info('Viewer', 'Pixel-diff motion detected', { changeRatio: changeRatio.toFixed(1) });
      if (remoteStream && !recorderIsRecording && cameraId && recordOnMotion) {
        setIsRecording(true);
        startRecording(remoteStream);
      }
    }, [remoteStream, recorderIsRecording, cameraId, startRecording, recordOnMotion])
  });

  const { startDetection: startMl, stopDetection: stopMl, modelLoaded, loadingError: mlLoadingError, inferenceError: mlInferenceError } = useYoloDetection({
    videoRef,
    confidence: 80,
    onDetection: (dets) => {
      if (showDetectionsRef.current) {
        setDetections(dets.filter(d => d.interesting));
      }
    },
    onMotion: ({ detections: interesting }) => {
      logger.info('Viewer', 'ML motion detected', { items: interesting.map(d => `${d.class}@${(d.confidence*100).toFixed(0)}%`) });
      if (remoteStream && !recorderIsRecording && cameraId && recordOnMotion) {
        setIsRecording(true);
        startRecording(remoteStream);
      }
    },
  });

  const handleRetry = useCallback(() => {
    isRetryingRef.current = true;
    disconnectViewer();
    setTimeout(() => { connectViewer(); }, 500);
  }, [connectViewer, disconnectViewer]);

  function doManualRetry() {
    retryCountRef.current = 0;
    setRetryCountdown(null);
    handleRetry();
  }

  const handleCameraControlChange = useCallback((key, value) => {
    logger.info('Viewer', 'Sending camera control', { key, value });
    setCameraControlSettings((prev) => ({ ...prev, [key]: value }));
    sendCommand('CAMERA_CONTROL', { control: key, value });
  }, [sendCommand]);

  const handleCameraControlReset = useCallback(() => {
    const defaults = { exposure: 0, focus: 50, whiteBalance: 'auto', iso: 100, brightness: 50, contrast: 50 };
    setCameraControlSettings(defaults);
    Object.entries(defaults).forEach(([key, value]) => { sendCommand('CAMERA_CONTROL', { control: key, value }); });
  }, [sendCommand]);

  useEffect(() => {
    logger.info('Viewer', 'Prefetching TURN credentials');
    let isMounted = true;
    prefetchIceServers()
      .catch((err) => { logger.warn('Viewer', 'Prefetch failed, will fallback to STUN', { error: err.message }); })
      .finally(() => { if (isMounted) { logger.info('Viewer', 'Credentials ready, connecting'); connectViewer(); } });
    return () => { isMounted = false; disconnectViewer(); };
  }, [streamKey, connectViewer, disconnectViewer]);

  useEffect(() => {
    if (status !== 'disconnected' && status !== 'error') {
      isRetryingRef.current = false;
      setRetryCountdown(null);
      return;
    }
    if (isRetryingRef.current) return;
    const attempt = retryCountRef.current + 1;
    const delay = RETRY_DELAYS[Math.min(retryCountRef.current, RETRY_DELAYS.length - 1)];
    logger.warn('Viewer', 'Scheduling retry', { attempt, delaySec: delay, status });
    setRetryCountdown(delay);
    const tick = setInterval(() => { setRetryCountdown((n) => (n != null && n > 1 ? n - 1 : 0)); }, 1000);
    const timer = setTimeout(() => {
      clearInterval(tick);
      retryCountRef.current += 1;
      logger.info('Viewer', 'Executing retry', { attempt });
      handleRetry();
    }, delay * 1000);
    return () => { clearInterval(tick); clearTimeout(timer); };
  }, [status, handleRetry]);

  useEffect(() => {
    if (status !== 'connecting') return;
    const t = setTimeout(() => { logger.warn('Viewer', 'Connection timed out, retrying'); handleRetry(); }, CONNECT_TIMEOUT_MS);
    return () => clearTimeout(t);
  }, [status, handleRetry]);

  useEffect(() => {
    if (status !== 'waiting') return;
    const interval = setInterval(() => { rejoinViewer(); }, 8000);
    return () => clearInterval(interval);
  }, [status, rejoinViewer]);

  useEffect(() => {
    if (status === 'connected' && remoteStream && motionEnabled) { startDetection(); }
    else { stopDetection(); }
    return () => stopDetection();
  }, [status, remoteStream, motionEnabled, startDetection, stopDetection]);

  useEffect(() => {
    if (status === 'connected' && remoteStream) { startMl(); }
    else { stopMl(); setDetections([]); }
    return () => stopMl();
  }, [status, remoteStream, startMl, stopMl]);

  useEffect(() => {
    if (!recorderIsRecording) return;
    const t = setTimeout(() => stopRecording(), 30_000);
    return () => clearTimeout(t);
  }, [recorderIsRecording, stopRecording]);

  useEffect(() => { setIsRecording(recorderIsRecording); setRecordingDuration(duration); }, [recorderIsRecording, duration]);

  useEffect(() => {
    if (status !== 'connected') return;
    const t = setTimeout(() => setShowControls(false), 3000);
    return () => clearTimeout(t);
  }, [status, showControls]);

  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;
    video.muted = muted;
    if (!muted && video.paused) video.play().catch(() => {});
  }, [muted]);

  useEffect(() => {
    if (status === 'connected') acquireWL();
    else releaseWL();
  }, [status, acquireWL, releaseWL]);

  useEffect(() => {
    if (status !== 'connected') return;
    const interval = setInterval(() => { api.get('/health').catch(() => {}); }, 60000);
    return () => clearInterval(interval);
  }, [status]);

  function handleFullscreen() {
    const videoEl = videoRef.current;
    const containerEl = document.getElementById('viewer-container');
    if (videoEl?.webkitEnterFullscreen) { videoEl.webkitEnterFullscreen(); return; }
    if (!document.fullscreenElement) {
      containerEl?.requestFullscreen?.().catch(() => { setShowControls(false); });
    } else { document.exitFullscreen?.(); }
  }

  useEffect(() => { logger.info('Viewer', 'Status transition', { status, rtt: connectionMetrics?.rtt }); }, [status]);

  const isBad = status === 'error' || status === 'disconnected';

  return (
    <div className="absolute inset-0 flex flex-col bg-black" style={{ paddingTop: 'env(safe-area-inset-top)' }}>
      {/* ── Top Bar ──────────────────────────────────────────── */}
      <nav className="z-20 flex items-center justify-between px-3 py-1.5 bg-slate-900/90 backdrop-blur-xl border-b border-slate-700/30"
        style={{ paddingLeft: 'max(0.75rem, env(safe-area-inset-left))', paddingRight: 'max(0.75rem, env(safe-area-inset-right))' }}>
        <button onClick={() => navigate(-1)} className="w-11 h-11 flex items-center justify-center text-slate-400 hover:text-white rounded-xl transition-colors flex-shrink-0" title="Back">
          <ArrowLeft size={22} />
        </button>
        <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-black/40">
          <div className={`w-2 h-2 rounded-full flex-shrink-0 ${status === 'connected' ? 'bg-green-500 animate-pulse-slow' : status === 'connecting' ? 'bg-yellow-500 animate-pulse-slow' : isBad ? 'bg-red-500' : 'bg-slate-600'}`} />
          <span className={`font-medium capitalize text-sm ${status === 'connected' ? 'text-green-400' : status === 'connecting' ? 'text-yellow-400' : isBad ? 'text-red-400' : 'text-slate-400'}`}>
            {status === 'connected' ? 'LIVE' : status}
          </span>
          {status === 'connected' && connectionMetrics?.rtt != null && (
            <span className="text-[10px] text-slate-500 ml-0.5 font-mono">{connectionMetrics.rtt}ms</span>
          )}
        </div>
        <button onClick={handleFullscreen} className="w-11 h-11 flex items-center justify-center text-slate-400 hover:text-white rounded-xl transition-colors flex-shrink-0" title="Fullscreen">
          <Maximize2 size={22} />
        </button>
      </nav>

      {/* ── Video ───────────────────────────────────────────── */}
      <div id="viewer-container" className="flex-1 relative bg-black overflow-hidden" onClick={() => setShowControls((v) => !v)}>
        <ViewerStream
          remoteStream={remoteStream}
          status={status}
          className="w-full h-full"
          videoRef={videoRef}
          isRecording={isRecording}
          recordingDuration={recordingDuration}
          nightVision={nightVisionMode}
        />

        {showDetections && <DetectionOverlay detections={detections} videoRef={videoRef} visible={showDetections} />}

        {(mlLoadingError || mlInferenceError) && showDetections && (
          <div className="absolute bottom-2 left-2 right-2 z-30 flex flex-col gap-1">
            {mlLoadingError && <div className="bg-red-500/80 text-white text-[10px] px-2 py-1 rounded-lg">ML model error: {mlLoadingError}</div>}
            {mlInferenceError && <div className="bg-red-500/80 text-white text-[10px] px-2 py-1 rounded-lg">ML inference error: {mlInferenceError}</div>}
          </div>
        )}

        {isBad && (
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 z-30 bg-black/50" onClick={(e) => e.stopPropagation()}>
            <button onClick={doManualRetry} className="flex items-center gap-2 bg-white/10 hover:bg-white/20 active:bg-white/30 text-white text-sm font-semibold px-6 py-3 rounded-2xl border border-white/15 backdrop-blur-sm transition-colors">
              <RotateCcw size={16} />
              Retry Now
            </button>
            {retryCountdown != null && retryCountdown > 0 && <p className="text-slate-400 text-xs">Auto-retry in {retryCountdown}s</p>}
          </div>
        )}

        {status === 'connected' && (
          <div className={`absolute bottom-0 left-0 right-0 z-20 transition-opacity duration-300 ${showControls ? 'opacity-100' : 'opacity-0 pointer-events-none'}`}
            style={{ paddingBottom: 'calc(env(safe-area-inset-bottom) + 0.5rem)' }}
            onClick={(e) => e.stopPropagation()}>
            <div className="mx-2 mb-2 bg-black/70 backdrop-blur-xl rounded-2xl p-2 flex items-center justify-around gap-0.5">
              <button onClick={() => { const n = !torchOn; setTorchOn(n); sendCommand('TORCH', { on: n }); }}
                className={`flex flex-col items-center justify-center gap-0.5 w-11 h-11 rounded-xl transition-colors flex-shrink-0 ${torchOn ? 'text-yellow-400 bg-yellow-500/10' : 'text-slate-400 hover:text-white hover:bg-white/5'}`}>
                {torchOn ? <Zap size={16} /> : <ZapOff size={16} />}
                <span className="text-[9px]">Torch</span>
              </button>
              <button onClick={() => { const n = !screenDim; setScreenDim(n); sendCommand('SCREEN_DIM', { on: n }); }}
                className={`flex flex-col items-center justify-center gap-0.5 w-11 h-11 rounded-xl transition-colors flex-shrink-0 ${screenDim ? 'text-blue-400 bg-blue-500/10' : 'text-slate-400 hover:text-white hover:bg-white/5'}`}>
                <Moon size={16} />
                <span className="text-[9px]">Screen</span>
              </button>
              <button onClick={() => { const n = !backgroundMode; setBackgroundMode(n); sendCommand('BACKGROUND', { on: n }); }}
                className={`flex flex-col items-center justify-center gap-0.5 w-11 h-11 rounded-xl transition-colors flex-shrink-0 ${backgroundMode ? 'text-green-400 bg-green-500/10' : 'text-slate-400 hover:text-white hover:bg-white/5'}`}>
                <BatteryCharging size={16} />
                <span className="text-[9px]">BG</span>
              </button>
              <button onClick={() => setMotionEnabled((v) => !v)}
                className={`flex flex-col items-center justify-center gap-0.5 w-11 h-11 rounded-xl transition-colors flex-shrink-0 ${motionEnabled ? 'text-hk-400 bg-hk-500/10' : 'text-slate-400 hover:text-white hover:bg-white/5'}`}>
                {motionEnabled ? <Eye size={16} /> : <EyeOff size={16} />}
                <span className="text-[9px]">Motion</span>
              </button>
              <button onClick={() => setRecordOnMotion((v) => !v)}
                className={`flex flex-col items-center justify-center gap-0.5 w-11 h-11 rounded-xl transition-colors flex-shrink-0 ${recordOnMotion ? 'text-red-400 bg-red-500/10' : 'text-slate-400 hover:text-white hover:bg-white/5'}`}>
                <Circle size={16} className={recordOnMotion ? 'fill-red-400' : ''} />
                <span className="text-[9px]">Record</span>
              </button>
              <button onClick={() => { showDetectionsRef.current = !showDetections; setShowDetections((v) => !v); }}
                className={`flex flex-col items-center justify-center gap-0.5 w-11 h-11 rounded-xl transition-colors flex-shrink-0 ${showDetections ? 'text-hk-400 bg-hk-500/10' : 'text-slate-400 hover:text-white hover:bg-white/5'}`}>
                <Scan size={16} />
                <span className="text-[9px]">{modelLoaded ? 'Detect' : 'ML\u2026'}</span>
              </button>
              <button onClick={() => setNightVisionMode((m) => m === 'off' ? 'enhanced' : m === 'enhanced' ? 'ir' : 'off')}
                className={`flex flex-col items-center justify-center gap-0.5 w-11 h-11 rounded-xl transition-colors flex-shrink-0 ${nightVisionMode !== 'off' ? 'text-green-400 bg-green-500/10' : 'text-slate-400 hover:text-white hover:bg-white/5'}`}>
                <Eye size={16} />
                <span className="text-[9px]">{nightVisionMode === 'ir' ? 'IR' : nightVisionMode === 'enhanced' ? 'NV' : 'Night'}</span>
              </button>
              <CameraControlsPanel capabilities={{}} settings={cameraControlSettings} onControlChange={handleCameraControlChange} onReset={handleCameraControlReset} />
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
