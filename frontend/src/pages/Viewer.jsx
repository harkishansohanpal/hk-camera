import { useEffect, useRef, useState, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, Maximize2, RotateCcw, Moon, BatteryCharging, Eye, EyeOff, Circle, Mic, MicOff } from 'lucide-react';
import { useWebRTC, prefetchIceServers } from '../hooks/useWebRTC';
import { useMotionDetection } from '../hooks/useMotionDetection';
import { useMediaRecorder } from '../hooks/useMediaRecorder';
import { useWakeLock } from '../hooks/useWakeLock';
import { logger } from '../lib/logger';
import ViewerStream from '../components/ViewerStream';
import api from '../services/api';

const RETRY_DELAYS = [5, 10, 20, 30, 60, 60];
const CONNECT_TIMEOUT_MS = 10000;

export default function Viewer() {
  const { streamKey } = useParams();
  const navigate = useNavigate();
  const videoRef = useRef(null);

  const [showControls, setShowControls] = useState(true);
  const [isRecording, setIsRecording] = useState(false);
  const [recordingDuration, setRecordingDuration] = useState(0);

  const [motionEnabled, setMotionEnabled] = useState(false);
  const [recordOnMotion, setRecordOnMotion] = useState(false);
  const [screenDim, setScreenDim] = useState(false);
  const [backgroundMode, setBackgroundMode] = useState(false);
  const [nightVisionMode, setNightVisionMode] = useState('off');

  const [retryCountdown, setRetryCountdown] = useState(null);
  const retryCountRef = useRef(0);
  const isRetryingRef = useRef(false);
  const { acquire: acquireWL, release: releaseWL } = useWakeLock();

  const { remoteStream, status, cameraId, connectViewer, disconnectViewer, sendCommand, rejoinViewer, startTalk, stopTalk, isTalking } = useWebRTC({ streamKey });

  const { startRecording, stopRecording, isRecording: recorderIsRecording, duration } = useMediaRecorder({
    cameraId, trigger: 'MOTION',
    onRecordingReady: useCallback((recording) => { logger.info('Viewer', 'Recording saved', { recording: recording?.id }); setIsRecording(false); setRecordingDuration(0); }, [])
  });

  const { startDetection, stopDetection } = useMotionDetection({
    videoRef, sensitivity: 15, cooldownMs: 5000,
    onMotion: useCallback(({ changeRatio }) => {
      logger.info('Viewer', 'Pixel-diff motion detected', { changeRatio: changeRatio.toFixed(1) });
      if (remoteStream && !recorderIsRecording && cameraId && recordOnMotion) { setIsRecording(true); startRecording(remoteStream); }
    }, [remoteStream, recorderIsRecording, cameraId, startRecording, recordOnMotion])
  });

  const handleRetry = useCallback(() => { isRetryingRef.current = true; disconnectViewer(); setTimeout(() => connectViewer(), 500); }, [connectViewer, disconnectViewer]);
  function doManualRetry() { retryCountRef.current = 0; setRetryCountdown(null); handleRetry(); }
  useEffect(() => {
    let isMounted = true;
    prefetchIceServers().catch(() => {}).finally(() => { if (isMounted) connectViewer(); });
    return () => { isMounted = false; disconnectViewer(); };
  }, [streamKey, connectViewer, disconnectViewer]);

  useEffect(() => {
    if (status !== 'disconnected' && status !== 'error') { isRetryingRef.current = false; setRetryCountdown(null); return; }
    if (isRetryingRef.current) return;
    const delay = RETRY_DELAYS[Math.min(retryCountRef.current, RETRY_DELAYS.length - 1)];
    setRetryCountdown(delay);
    const tick = setInterval(() => setRetryCountdown((n) => (n != null && n > 1 ? n - 1 : 0)), 1000);
    const timer = setTimeout(() => { clearInterval(tick); retryCountRef.current += 1; handleRetry(); }, delay * 1000);
    return () => { clearInterval(tick); clearTimeout(timer); };
  }, [status, handleRetry]);

  useEffect(() => { if (status === 'connected') { retryCountRef.current = 0; setRetryCountdown(null); } }, [status]);
  useEffect(() => { if (status !== 'connecting') return; const t = setTimeout(() => handleRetry(), CONNECT_TIMEOUT_MS); return () => clearTimeout(t); }, [status, handleRetry]);
  useEffect(() => { if (status !== 'waiting') return; const interval = setInterval(() => rejoinViewer(), 8000); return () => clearInterval(interval); }, [status, rejoinViewer]);

  useEffect(() => {
    if (status === 'connected' && remoteStream && motionEnabled) startDetection(); else stopDetection();
    return () => stopDetection();
  }, [status, remoteStream, motionEnabled, startDetection, stopDetection]);

  useEffect(() => { if (!recorderIsRecording) return; const t = setTimeout(() => stopRecording(), 30000); return () => clearTimeout(t); }, [recorderIsRecording, stopRecording]);
  useEffect(() => { setIsRecording(recorderIsRecording); setRecordingDuration(duration); }, [recorderIsRecording, duration]);
  useEffect(() => { if (status !== 'connected') return; const t = setTimeout(() => setShowControls(false), 3000); return () => clearTimeout(t); }, [status]);

  useEffect(() => { if (status === 'connected') acquireWL(); else releaseWL(); }, [status, acquireWL, releaseWL]);
  useEffect(() => { if (status !== 'connected') return; const interval = setInterval(() => api.get('/health').catch(() => {}), 60000); return () => clearInterval(interval); }, [status]);
  useEffect(() => { logger.info('Viewer', 'Status transition', { status }); }, [status]);

  function handleFullscreen() {
    const videoEl = videoRef.current;
    const containerEl = document.getElementById('viewer-container');
    if (videoEl?.webkitEnterFullscreen && !document.webkitFullscreenElement && !document.fullscreenElement) {
      videoEl.webkitEnterFullscreen(); return;
    }
    if (!document.fullscreenElement && !document.webkitFullscreenElement) {
      containerEl?.requestFullscreen?.().catch(() => setShowControls(false));
    } else {
      (document.exitFullscreen || document.webkitExitFullscreen)?.().catch(() => {});
    }
  }

  useEffect(() => {
    function onFsChange() {
      if ((!document.fullscreenElement && !document.webkitFullscreenElement) && videoRef.current?.paused) {
        videoRef.current.play().catch(() => {});
      }
    }
    document.addEventListener('fullscreenchange', onFsChange);
    document.addEventListener('webkitfullscreenchange', onFsChange);
    return () => {
      document.removeEventListener('fullscreenchange', onFsChange);
      document.removeEventListener('webkitfullscreenchange', onFsChange);
    };
  }, []);

  const isBad = status === 'error' || status === 'disconnected';

  return (
    <div className="absolute inset-0 flex flex-col bg-black" style={{ paddingTop: 'env(safe-area-inset-top)' }}>
      <nav className="z-20 flex items-center justify-between px-3 py-1.5 bg-black/80 backdrop-blur-xl border-b border-white/10"
        style={{ paddingLeft: 'max(0.75rem, env(safe-area-inset-left))', paddingRight: 'max(0.75rem, env(safe-area-inset-right))' }}>
        <button onClick={() => window.history.length > 1 ? navigate(-1) : navigate('/dashboard')} className="w-11 h-11 flex items-center justify-center text-white/60 hover:text-white rounded-xl transition-colors" title="Back">
          <ArrowLeft size={22} />
        </button>
        <div className="flex items-center gap-1.5 px-3 py-1 rounded-lg bg-white/5 backdrop-blur-sm">
          <div className={`w-2 h-2 rounded-full ${status === 'connected' ? 'bg-ap-green animate-pulse-slow' : status === 'connecting' ? 'bg-ap-yellow animate-pulse-slow' : isBad ? 'bg-ap-red' : 'bg-ap-gray'}`} />
          <span className={`font-semibold capitalize text-sm ${status === 'connected' ? 'text-ap-green' : status === 'connecting' ? 'text-ap-yellow' : isBad ? 'text-ap-red' : 'text-ap-gray'}`}>
            {status === 'connected' ? 'LIVE' : status}
          </span>
          
        </div>
        <button onClick={handleFullscreen} className="w-11 h-11 flex items-center justify-center text-white/60 hover:text-white rounded-xl transition-colors" title="Fullscreen">
          <Maximize2 size={22} />
        </button>
      </nav>

      <div id="viewer-container" className="flex-1 relative bg-black overflow-hidden" onClick={() => setShowControls((v) => !v)}>
        <ViewerStream remoteStream={remoteStream} status={status} className="w-full h-full" videoRef={videoRef}
          isRecording={isRecording} recordingDuration={recordingDuration} nightVision={nightVisionMode} />

        {isBad && (
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 z-30 bg-black/50" onClick={(e) => e.stopPropagation()}>
            <button onClick={doManualRetry} className="flex items-center gap-2 bg-white/10 hover:bg-white/20 text-white text-sm font-semibold px-6 py-3 rounded-2xl border border-white/10 backdrop-blur-sm transition-colors">
              <RotateCcw size={16} /> Retry
            </button>
            {retryCountdown != null && retryCountdown > 0 && <p className="text-white/50 text-xs">Retrying in {retryCountdown}s</p>}
          </div>
        )}

        {status === 'connected' && (
          <div className={`absolute bottom-0 left-0 right-0 z-20 transition-opacity duration-300 ${showControls ? 'opacity-100' : 'opacity-0 pointer-events-none'}`}
            style={{ paddingBottom: 'calc(env(safe-area-inset-bottom) + 0.5rem)' }}
            onClick={(e) => e.stopPropagation()}>
            <div className="mx-2 mb-2 bg-black/80 backdrop-blur-xl rounded-2xl p-2.5 flex items-center justify-around gap-1 border border-white/5 shadow-lg">

              <button onClick={() => { const n = !screenDim; setScreenDim(n); sendCommand('SCREEN_DIM', { on: n }); }}
                className={`flex flex-col items-center justify-center gap-0.5 w-11 h-11 rounded-xl transition-colors ${screenDim ? 'text-ap-blue bg-ap-blue/10' : 'text-white/50 hover:text-white hover:bg-white/5'}`}>
                <Moon size={16} /><span className="text-[9px] font-semibold">Dim</span>
              </button>
              <button onClick={() => { const n = !backgroundMode; setBackgroundMode(n); sendCommand('BACKGROUND', { on: n }); }}
                className={`flex flex-col items-center justify-center gap-0.5 w-11 h-11 rounded-xl transition-colors ${backgroundMode ? 'text-ap-green bg-ap-green/10' : 'text-white/50 hover:text-white hover:bg-white/5'}`}>
                <BatteryCharging size={16} /><span className="text-[9px] font-semibold">Battery</span>
              </button>
              <button onClick={() => setMotionEnabled((v) => !v)}
                className={`flex flex-col items-center justify-center gap-0.5 w-11 h-11 rounded-xl transition-colors ${motionEnabled ? 'text-ap-blue bg-ap-blue/10' : 'text-white/50 hover:text-white hover:bg-white/5'}`}>
                {motionEnabled ? <Eye size={16} /> : <EyeOff size={16} />}<span className="text-[9px] font-semibold">Motion</span>
              </button>
              <button onClick={() => setRecordOnMotion((v) => !v)}
                className={`flex flex-col items-center justify-center gap-0.5 w-11 h-11 rounded-xl transition-colors ${recordOnMotion ? 'text-ap-red bg-ap-red/10' : 'text-white/50 hover:text-white hover:bg-white/5'}`}>
                <Circle size={16} className={recordOnMotion ? 'fill-ap-red' : ''} /><span className="text-[9px] font-semibold">Record</span>
              </button>
              <button onClick={() => setNightVisionMode((m) => m === 'off' ? 'enhanced' : m === 'enhanced' ? 'ir' : 'off')}
                className={`flex flex-col items-center justify-center gap-0.5 w-11 h-11 rounded-xl transition-colors ${nightVisionMode !== 'off' ? 'text-ap-green bg-ap-green/10' : 'text-white/50 hover:text-white hover:bg-white/5'}`}>
                <Eye size={16} /><span className="text-[9px] font-semibold">Night</span>
              </button>
              <button onClick={() => { isTalking ? stopTalk() : startTalk(); }}
                className={`flex flex-col items-center justify-center gap-0.5 w-11 h-11 rounded-xl transition-colors ${isTalking ? 'text-ap-green bg-ap-green/10' : 'text-white/50 hover:text-white hover:bg-white/5'}`}>
                {isTalking ? <Mic size={16} /> : <MicOff size={16} />}<span className="text-[9px] font-semibold">Talk</span>
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
