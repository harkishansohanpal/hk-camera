import { useState, useRef, useCallback, useEffect } from 'react';
import { useParams, useNavigate, useSearchParams, Link } from 'react-router-dom';
import { Shield, Video, MicOff, X, Sun, Moon } from 'lucide-react';
import { cameraAPI, alertAPI } from '../services/api';
import { prefetchIceServers } from '../hooks/useWebRTC';
import { useWebRTC } from '../hooks/useWebRTC';
import { useMotionDetection } from '../hooks/useMotionDetection';
import { useMediaRecorder } from '../hooks/useMediaRecorder';
import { useWakeLock } from '../hooks/useWakeLock';
import { logger } from '../lib/logger';
import CameraStream from '../components/CameraStream';
import toast from 'react-hot-toast';

export default function CameraView() {
  const { cameraId } = useParams();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const autoStartedRef = useRef(false);
  const lastAutoStartRef = useRef(0);  // Debounce auto-start

  const [camera, setCamera]           = useState(null);
  const [stream, setStream]           = useState(null);
  const [facingMode, setFacingMode]   = useState('environment');
  const [micOn, setMicOn]             = useState(true);
  const [motionCount, setMotionCount] = useState(0);
  const [screenDimmed, setScreenDimmed] = useState(false);
  const [torchOn, setTorchOn] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [audioConsentWarn, setAudioConsentWarn] = useState(false);
  const [broadcastStartedAt, setBroadcastStartedAt] = useState(null);
  const audioConsentedRef = useRef(false);
  const { acquire: acquireWL, release: releaseWL } = useWakeLock();
  const isAndroid = /Android/.test(navigator.userAgent);
  const videoRef = useRef(null);
  const containerRef = useRef(null);
  const streamRef = useRef(null);
  useEffect(() => { streamRef.current = stream; }, [stream]);
  const cameraRef = useRef(null);
  useEffect(() => { cameraRef.current = camera; }, [camera]);
  const wasBackgroundRef = useRef(false);

  const recCanvasRef = useRef(null);
  const recRafRef = useRef(null);

  async function handleRemoteCommand(command, payload) {
    if (command === 'TORCH') {
      if (isAndroid) { setTorchOn(payload.on); toast.success(`Screen light ${payload.on ? 'ON' : 'OFF'}`); }
      else {
        const track = streamRef.current?.getVideoTracks()[0];
        if (!track) return;
        track.applyConstraints({ advanced: [{ torch: payload.on }] })
          .then(() => toast.success(`Torch ${payload.on ? 'ON' : 'OFF'}`))
          .catch((err) => toast.error(`Torch not supported: ${err.message}`));
      }
    } else if (command === 'SCREEN_DIM') { setScreenDimmed(payload.on); }
  }

  const { startBroadcast, stopBroadcast, replaceCameraStream, setMicEnabled, status: rtcStatus } = useWebRTC({ streamKey: camera?.streamKey, onCommand: handleRemoteCommand });
  const isBroadcasting = rtcStatus === 'connected' || rtcStatus === 'connecting';
  const { startRecording, stopRecording, isRecording, duration } = useMediaRecorder({ cameraId, trigger: 'MANUAL' });
  const startRecordingRef = useRef(startRecording);
  useEffect(() => { startRecordingRef.current = startRecording; }, [startRecording]);

  function getOrientedStream() {
    const video = videoRef.current;
    const originalStream = streamRef.current;
    if (!video || !originalStream || !video.videoWidth) return null;
    const isPortrait = window.innerHeight > window.innerWidth;
    const w = isPortrait ? video.videoHeight : video.videoWidth;
    const h = isPortrait ? video.videoWidth : video.videoHeight;
    if (!recCanvasRef.current) recCanvasRef.current = document.createElement('canvas');
    recCanvasRef.current.width = w; recCanvasRef.current.height = h;
    const ctx = recCanvasRef.current.getContext('2d');
    function draw() {
      if (isPortrait) { ctx.save(); ctx.translate(w / 2, h / 2); ctx.rotate(-90 * Math.PI / 180); ctx.drawImage(video, -h / 2, -w / 2, h, w); ctx.restore(); }
      else { ctx.drawImage(video, 0, 0, w, h); }
      recRafRef.current = requestAnimationFrame(draw);
    }
    recRafRef.current = requestAnimationFrame(draw);
    const canvasStream = recCanvasRef.current.captureStream(30);
    const vidTrack = canvasStream.getVideoTracks()[0];
    const audTrack = originalStream.getAudioTracks()[0];
    const newStream = new MediaStream();
    if (vidTrack) newStream.addTrack(vidTrack);
    if (audTrack) newStream.addTrack(audTrack);
    return newStream;
  }

  function stopOrientedStream() { if (recRafRef.current) { cancelAnimationFrame(recRafRef.current); recRafRef.current = null; } }
  useEffect(() => { if (!isRecording) stopOrientedStream(); }, [isRecording]);

  const handleMotion = useCallback(({ thumbnail }) => {
    setMotionCount((n) => n + 1);
    logger.info('CameraView', 'Motion detected', { cameraId, totalEvents: motionCount + 1 });
    alertAPI.motionAlert({ cameraId, thumbnailUrl: thumbnail }).catch(() => {});
    if (cameraRef.current?.recordOnMotion && streamRef.current) {
      const recStream = getOrientedStream();
      if (recStream) startRecordingRef.current(recStream, 'MOTION');
    }
  }, [cameraId, motionCount]);

  const { startDetection, stopDetection, isDetecting } = useMotionDetection({ videoRef, sensitivity: camera?.sensitivity ?? 30, onMotion: handleMotion });

  useEffect(() => { prefetchIceServers().catch(() => {}); }, []);
  useEffect(() => { cameraAPI.get(cameraId).then(({ data }) => setCamera(data.data)).catch(() => toast.error('Camera not found')); }, [cameraId]);
  useEffect(() => { if (isBroadcasting) acquireWL(); else releaseWL(); }, [isBroadcasting, acquireWL, releaseWL]);

  function shouldDetect(cam) { if (!cam) return false; return cam.motionDetect; }

  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.hidden) { logger.info('CameraView', 'App backgrounded, stopping detection'); wasBackgroundRef.current = true; stopDetection(); }
      else { logger.info('CameraView', 'App foregrounded, restarting detection'); wasBackgroundRef.current = false; if (shouldDetect(cameraRef.current)) startDetection(); }
    };
    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => document.removeEventListener('visibilitychange', handleVisibilityChange);
  }, [stopDetection, startDetection]);

  useEffect(() => { if (!isBroadcasting) return; const iv = setInterval(() => cameraAPI.heartbeat(cameraId).catch(() => {}), 30_000); return () => clearInterval(iv); }, [isBroadcasting, cameraId]);

  async function getLocalStream() { return navigator.mediaDevices.getUserMedia({ video: { facingMode, width: { ideal: 1920, min: 1280 }, height: { ideal: 1080, min: 720 } }, audio: true }); }

  function requestFullscreen() {
    const el = containerRef.current;
    if (!el) return;
    if (el.requestFullscreen) {
      el.requestFullscreen().catch(() => {});
    }
  }

  function exitFullscreen() {
    const v = videoRef.current;
    if (v?.webkitDisplayingFullscreen && v.webkitExitFullscreen) {
      v.webkitExitFullscreen();
    } else if (document.fullscreenElement || document.webkitFullscreenElement) {
      (document.exitFullscreen || document.webkitExitFullscreen)?.().catch(() => {});
    }
  }

  async function handleToggle() {
    if (isBroadcasting) {
      logger.info('CameraView', 'Stopping broadcast', { cameraId });
      stopBroadcast(); stopDetection();
      if (isRecording) stopRecording();
      streamRef.current?.getTracks().forEach((t) => t.stop()); setStream(null);
      setBroadcastStartedAt(null);
      exitFullscreen();
      return;
    }
    try {
      logger.info('CameraView', 'Starting broadcast', { cameraId });
      setBroadcastStartedAt(new Date().toISOString());
      const localStream = await getLocalStream(); setStream(localStream);
      // Fullscreen chain: webkitEnterFullscreen (iOS <16) → video.requestFullscreen (iOS 16+) → container fallback
      const v = videoRef.current;
      if (v) {
        const enterFS = () => {
          if (v.webkitEnterFullscreen) {
            try { v.webkitEnterFullscreen(); } catch (e) { logger.warn('CameraView', 'Fullscreen failed', { error: e.message }); }
          } else if (v.requestFullscreen) {
            v.requestFullscreen().catch(() => {});
          } else {
            requestFullscreen();
          }
        };
        if (v.readyState >= HTMLMediaElement.HAVE_CURRENT_DATA) { enterFS(); }
        else { v.addEventListener('loadedmetadata', enterFS, { once: true }); }
      }
      await startBroadcast(localStream);
      toast.success('Streaming started');
    } catch (err) { logger.error('CameraView', 'Failed to start broadcast', { error: err.message, cameraId }); toast.error('Could not start camera: ' + err.message); setBroadcastStartedAt(null); }
  }

  async function flipCamera() {
    const next = facingMode === 'environment' ? 'user' : 'environment';
    setFacingMode(next);
    if (isBroadcasting) {
      const newStream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: next, width: { ideal: 1920, min: 1280 }, height: { ideal: 1080, min: 720 } }, audio: true });
      streamRef.current?.getTracks().forEach((t) => t.stop());
      setStream(newStream);
      await replaceCameraStream(newStream);
    }
  }

  async function handleRecordToggle() {
    if (isRecording) { stopOrientedStream(); stopRecording(); }
    else if (stream) { const recStream = getOrientedStream(); if (recStream) startRecording(recStream); }
  }

  useEffect(() => {
    if (camera && searchParams.get('auto') === '1' && !autoStartedRef.current && !isBroadcasting) {
      const now = Date.now();
      if (now - lastAutoStartRef.current < 5000) {
        logger.info('CameraView', 'Auto-start cooldown, skipping');
        return;
      }
      lastAutoStartRef.current = now;
      autoStartedRef.current = true;
      logger.info('CameraView', 'Auto-starting broadcast', { cameraId });
      handleToggle();
    }
  }, [camera, searchParams, handleToggle, isBroadcasting, cameraId]);

  function handleBack() { exitFullscreen(); navigate('/dashboard'); }

  return (
    <div ref={containerRef} className="fixed inset-0 bg-black z-40 flex flex-col">
      <CameraStream ref={videoRef} stream={stream} isBroadcasting={isBroadcasting} broadcastStartedAt={broadcastStartedAt}
        onToggle={handleToggle} onFlip={flipCamera}
        micOn={micOn} onMicToggle={() => {
          if (micOn) { setMicOn(false); setMicEnabled(false); return; }
          if (!audioConsentedRef.current) { setAudioConsentWarn(true); return; }
          setMicOn(true); setMicEnabled(true);
        }}
        isRecording={isRecording} onRecordToggle={handleRecordToggle}
        onBack={handleBack} onSettings={() => setShowSettings(true)}
        className="flex-1 w-full" />

      {/* Settings overlay */}
      {showSettings && (
        <div className="absolute inset-0 z-20 flex flex-col justify-end bg-black/40 backdrop-blur-sm animate-fade-in"
          onClick={(e) => { if (e.target === e.currentTarget) setShowSettings(false); }}>
          <div className="bg-card rounded-t-[28px] shadow-apple-lg animate-slide-up px-5 pt-6 pb-10 safe-bottom max-h-[70vh] overflow-y-auto"
            onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-lg font-bold text-text-primary">Settings</h2>
              <button onClick={() => setShowSettings(false)}
                className="w-9 h-9 flex items-center justify-center text-text-secondary hover:text-text-primary rounded-full hover:bg-card-hover transition-colors">
                <X size={18} />
              </button>
            </div>

            <div className="flex flex-col gap-4">
              {/* Motion Detection */}
              <div className="flex items-center justify-between py-2">
                <div className="flex items-center gap-3">
                  <Shield size={18} className="text-ap-blue" />
                  <div>
                    <p className="text-sm font-semibold text-text-primary">Motion Detection</p>
                    <p className="text-xs text-text-secondary">{isDetecting ? 'Active' : 'Off'}</p>
                  </div>
                </div>
                <button onClick={async () => {
                  const next = !camera?.motionDetect;
                  setCamera((c) => ({ ...c, motionDetect: next }));
                  await cameraAPI.update(cameraId, { motionDetect: next });
                  if (isBroadcasting) { next ? startDetection() : stopDetection(); }
                }} className={`relative w-[51px] h-[31px] rounded-full transition-colors duration-200 ${camera?.motionDetect ? 'bg-ap-green' : 'bg-text-tertiary'}`}>
                  <div className={`absolute w-[27px] h-[27px] bg-white rounded-full shadow-sm top-[2px] transition-transform duration-200 ${camera?.motionDetect ? 'translate-x-[22px]' : 'translate-x-[2px]'}`} />
                </button>
              </div>

              {/* Sensitivity */}
              {camera?.motionDetect && (
                <div className="flex flex-col gap-2 py-2 pl-9">
                  <div className="flex items-center justify-between">
                    <p className="text-xs font-semibold text-text-secondary">Sensitivity</p>
                    <p className="text-xs font-bold text-text-primary">{camera?.sensitivity ?? 30}%</p>
                  </div>
                  <input type="range" min="5" max="80" value={camera?.sensitivity ?? 30}
                    onChange={async (e) => {
                      const v = Number(e.target.value);
                      setCamera((c) => ({ ...c, sensitivity: v }));
                      await cameraAPI.update(cameraId, { sensitivity: v });
                    }}
                    className="w-full h-1.5 rounded-full appearance-none cursor-pointer"
                    style={{ background: `linear-gradient(to right, var(--ap-blue) ${camera?.sensitivity ?? 30}%, var(--color-text-tertiary) ${camera?.sensitivity ?? 30}%)` }} />
                </div>
              )}

              {/* Record on Motion */}
              {camera?.motionDetect && (
                <div className="flex items-center justify-between py-2 pl-9">
                  <div className="flex items-center gap-3">
                    <Video size={18} className="text-ap-red" />
                    <div>
                      <p className="text-sm font-semibold text-text-primary">Auto-Record</p>
                      <p className="text-xs text-text-secondary">Record clips on motion</p>
                    </div>
                  </div>
                  <button onClick={async () => {
                    const next = !camera?.recordOnMotion;
                    setCamera((c) => ({ ...c, recordOnMotion: next }));
                    await cameraAPI.update(cameraId, { recordOnMotion: next });
                  }} className={`relative w-[51px] h-[31px] rounded-full transition-colors duration-200 ${camera?.recordOnMotion ? 'bg-ap-red' : 'bg-text-tertiary'}`}>
                    <div className={`absolute w-[27px] h-[27px] bg-white rounded-full shadow-sm top-[2px] transition-transform duration-200 ${camera?.recordOnMotion ? 'translate-x-[22px]' : 'translate-x-[2px]'}`} />
                  </button>
                </div>
              )}

              <div className="h-px bg-ap-separator my-1" />

              {/* Screen Dim */}
              <div className="flex items-center justify-between py-2">
                <div className="flex items-center gap-3">
                  <Moon size={18} className="text-ap-blue" />
                  <div>
                    <p className="text-sm font-semibold text-text-primary">Screen Dim</p>
                    <p className="text-xs text-text-secondary">Darken display while streaming</p>
                  </div>
                </div>
                <button onClick={() => setScreenDimmed((v) => !v)}
                  className={`relative w-[51px] h-[31px] rounded-full transition-colors duration-200 ${screenDimmed ? 'bg-ap-blue' : 'bg-text-tertiary'}`}>
                  <div className={`absolute w-[27px] h-[27px] bg-white rounded-full shadow-sm top-[2px] transition-transform duration-200 ${screenDimmed ? 'translate-x-[22px]' : 'translate-x-[2px]'}`} />
                </button>
              </div>

              {/* Torch / Screen light (Android only) */}
              {isAndroid && (
                <div className="flex items-center justify-between py-2">
                  <div className="flex items-center gap-3">
                    <Sun size={18} className="text-ap-orange" />
                    <div>
                      <p className="text-sm font-semibold text-text-primary">Screen Light</p>
                      <p className="text-xs text-text-secondary">White screen as torch</p>
                    </div>
                  </div>
                  <button onClick={() => setTorchOn((v) => !v)}
                    className={`relative w-[51px] h-[31px] rounded-full transition-colors duration-200 ${torchOn ? 'bg-ap-orange' : 'bg-text-tertiary'}`}>
                    <div className={`absolute w-[27px] h-[27px] bg-white rounded-full shadow-sm top-[2px] transition-transform duration-200 ${torchOn ? 'translate-x-[22px]' : 'translate-x-[2px]'}`} />
                  </button>
                </div>
              )}

              <div className="h-px bg-ap-separator my-1" />

              {/* Motion events count */}
              <div className="flex items-center justify-between py-2">
                <div className="flex items-center gap-3">
                  <Shield size={18} className="text-text-secondary" />
                  <div>
                    <p className="text-sm font-semibold text-text-primary">Motion Events</p>
                    <p className="text-xs text-text-secondary">Detected this session</p>
                  </div>
                </div>
                <span className="text-lg font-bold text-text-primary">{motionCount}</span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Screen dim overlay */}
      {screenDimmed && (
        <div className="fixed inset-0 z-50 bg-black cursor-pointer flex items-center justify-center" onClick={() => setScreenDimmed(false)}>
          <p className="text-text-secondary text-xs">Tap to restore screen</p>
        </div>
      )}

      {/* Android torch overlay */}
      {isAndroid && torchOn && <div className="fixed inset-0 z-50 bg-white pointer-events-none" />}

      {/* Audio consent modal */}
      {audioConsentWarn && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
          <div className="bg-card border border-ap-separator rounded-2xl shadow-apple-lg p-6 max-w-sm w-full">
            <div className="w-10 h-10 bg-ap-orange/10 rounded-xl flex items-center justify-center mb-3">
              <MicOff size={18} className="text-ap-orange" />
            </div>
            <h3 className="text-base font-bold text-text-primary mb-2">Audio Recording</h3>
            <p className="text-xs text-text-secondary leading-relaxed mb-4">
              Some places require permission before recording audio. By turning on the microphone, you confirm you have the right to record audio where you are. See our{' '}
              <Link to="/terms" className="text-ap-blue hover:text-blue-600 font-semibold">Terms</Link> for details.
            </p>
            <div className="flex gap-2">
              <button onClick={() => setAudioConsentWarn(false)} className="flex-1 btn-secondary text-sm">Cancel</button>
              <button onClick={() => { audioConsentedRef.current = true; setAudioConsentWarn(false); setMicOn(true); }} className="flex-1 btn-primary text-sm">
                I Understand
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
