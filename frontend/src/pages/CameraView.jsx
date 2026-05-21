import { useState, useRef, useCallback, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, Shield, Video, Brain } from 'lucide-react';
import { Capacitor } from '@capacitor/core';
import { Torch } from '@capawesome/capacitor-torch';
import { AdvancedCamera } from '../services/advancedCamera';
import { cameraAPI, alertAPI } from '../services/api';
import { prefetchIceServers } from '../hooks/useWebRTC';
import { useWebRTC } from '../hooks/useWebRTC';
import { useMotionDetection } from '../hooks/useMotionDetection';
import { useYoloDetection } from '../hooks/useYoloDetection';
import { useMediaRecorder } from '../hooks/useMediaRecorder';
import { useWakeLock } from '../hooks/useWakeLock';
import { logger } from '../lib/logger';
import CameraStream from '../components/CameraStream';
import toast from 'react-hot-toast';

export default function CameraView() {
  const { cameraId } = useParams();
  const navigate = useNavigate();

  const [camera, setCamera]           = useState(null);
  const [stream, setStream]           = useState(null);
  const [facingMode, setFacingMode]   = useState('environment');
  const [micOn, setMicOn]             = useState(true);
  const [motionCount, setMotionCount] = useState(0);
  const [screenDimmed, setScreenDimmed] = useState(false);
  const [backgroundMode, setBackgroundMode] = useState(false);
  const [torchOn, setTorchOn] = useState(false);
  const { acquire: acquireWL, release: releaseWL } = useWakeLock();
  const isAndroid = /Android/.test(navigator.userAgent);
  const videoRef = useRef(null);
  const streamRef = useRef(null);
  useEffect(() => { streamRef.current = stream; }, [stream]);
  const cameraRef = useRef(null);
  useEffect(() => { cameraRef.current = camera; }, [camera]);
  const wasBackgroundRef = useRef(false);
  const nvCanvasRef = useRef(null);
  const nvListenerRef = useRef(null);
  const nvFrameRef = useRef(null);
  const recCanvasRef = useRef(null);
  const recRafRef = useRef(null);

  async function startCamera2NightVision(broadcastStream) {
    if (!Capacitor.isNativePlatform() || !AdvancedCamera) return;
    if (nvListenerRef.current) return;
    try {
      const canvas = document.createElement('canvas');
      canvas.width = 480; canvas.height = 360;
      nvCanvasRef.current = canvas;
      await AdvancedCamera.startCapture({ iso: 1600, exposureMs: 66, width: 480, height: 360 });
      nvListenerRef.current = AdvancedCamera.addListener('frame', async (data) => {
        try {
          const base64 = data.jpeg;
          const binary = atob(base64);
          const array = new Uint8Array(binary.length);
          for (let i = 0; i < binary.length; i++) array[i] = binary.charCodeAt(i);
          const blob = new Blob([array], { type: 'image/jpeg' });
          const bitmap = await createImageBitmap(blob);
          const ctx = canvas.getContext('2d');
          ctx.drawImage(bitmap, 0, 0, 480, 360);
          bitmap.close();
        } catch (err) { console.warn('[NV] Frame processing error:', err); }
      });
      const canvasStream = canvas.captureStream(15);
      const videoTrack = canvasStream.getVideoTracks()[0];
      const audioTrack = broadcastStream?.getAudioTracks()[0];
      const newStream = new MediaStream();
      if (videoTrack) newStream.addTrack(videoTrack);
      if (audioTrack) newStream.addTrack(audioTrack);
      stopBroadcast();
      streamRef.current = newStream;
      await startBroadcast(newStream);
    } catch (err) {
      console.error('[NV] Camera2 night vision failed:', err);
      toast.error('Night vision setup failed: ' + err.message);
    }
  }

  async function stopCamera2NightVision() {
    if (nvListenerRef.current) { nvListenerRef.current.remove(); nvListenerRef.current = null; }
    if (AdvancedCamera) { await AdvancedCamera.stopCapture().catch(() => {}); }
  }

  async function handleRemoteCommand(command, payload) {
    if (command === 'TORCH') {
      if (Capacitor.isNativePlatform()) {
        try {
          const { available } = await Torch.isAvailable();
          if (!available) { toast.error('Flashlight not available'); return; }
          if (payload.on) { await Torch.enable(); } else { await Torch.disable(); }
          setTorchOn(payload.on); toast.success(`Flashlight ${payload.on ? 'ON' : 'OFF'}`);
        } catch (err) { toast.error(`Torch error: ${err.message}`); }
      } else if (isAndroid) { setTorchOn(payload.on); toast.success(`Screen light ${payload.on ? 'ON' : 'OFF'}`); }
      else {
        const track = streamRef.current?.getVideoTracks()[0];
        if (!track) return;
        track.applyConstraints({ advanced: [{ torch: payload.on }] })
          .then(() => toast.success(`Torch ${payload.on ? 'ON' : 'OFF'}`))
          .catch((err) => toast.error(`Torch not supported: ${err.message}`));
      }
    } else if (command === 'SCREEN_DIM') { setScreenDimmed(payload.on); }
    else if (command === 'BACKGROUND') { setBackgroundMode(payload.on); }
    else if (command === 'NIGHT_VISION') {
      if (payload.on) {
        if (Capacitor.isNativePlatform() && AdvancedCamera) { await startCamera2NightVision(streamRef.current); }
        else {
          const track = streamRef.current?.getVideoTracks()[0];
          if (!track) return;
          const caps = track.getCapabilities?.() ?? {};
          const isIOS = /iPhone|iPad|iPod/.test(navigator.userAgent);
          const constraints = { advanced: [] };
          if (isIOS) {
            if (caps.focusMode?.includes('continuous-picture')) constraints.advanced.push({ focusMode: 'continuous-picture' });
            if (caps.exposureMode) constraints.advanced.push({ exposureMode: 'continuous' });
          }
          if (constraints.advanced.length > 0) track.applyConstraints(constraints).catch(() => {});
        }
      } else { await stopCamera2NightVision(); }
    }
  }

  const { startBroadcast, stopBroadcast, status: rtcStatus } = useWebRTC({ role: 'camera', streamKey: camera?.streamKey, onCommand: handleRemoteCommand });
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

  const detectionMode = camera?.detectionMode || 'PIXEL_DIFF';
  const isMlMode = detectionMode === 'ML';
  const { startDetection: startPixelDiff, stopDetection: stopPixelDiff, isDetecting: isPixelDetecting } = useMotionDetection({ videoRef, sensitivity: camera?.sensitivity ?? 30, onMotion: handleMotion });
  const { startDetection: startMlDetection, stopDetection: stopMlDetection, isDetecting: isMlDetecting, modelLoaded, loadingError: mlError, inferenceError: mlInferenceError } = useYoloDetection({ videoRef, confidence: camera?.mlConfidence ?? 80, onDetection: (dets) => {}, onMotion: (payload) => handleMotion(payload) });
  const isDetecting = isMlMode ? isMlDetecting : isPixelDetecting;
  const startDetection = isMlMode ? startMlDetection : startPixelDiff;
  const stopDetection = isMlMode ? stopMlDetection : stopPixelDiff;

  useEffect(() => { prefetchIceServers().catch(() => {}); }, []);
  useEffect(() => { cameraAPI.get(cameraId).then(({ data }) => setCamera(data.data)).catch(() => toast.error('Camera not found')); }, [cameraId]);
  useEffect(() => { return () => { stopCamera2NightVision().catch(() => {}); }; }, []);
  useEffect(() => { if (isBroadcasting && !backgroundMode) acquireWL(); else releaseWL(); }, [isBroadcasting, backgroundMode, acquireWL, releaseWL]);

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

  async function getLocalStream() { return navigator.mediaDevices.getUserMedia({ video: { facingMode, width: { ideal: 1920, min: 1280 }, height: { ideal: 1080, min: 720 } }, audio: micOn }); }

  async function handleToggle() {
    if (isBroadcasting) {
      logger.info('CameraView', 'Stopping broadcast', { cameraId });
      await stopCamera2NightVision(); stopBroadcast(); stopDetection();
      if (isRecording) stopRecording();
      streamRef.current?.getTracks().forEach((t) => t.stop()); setStream(null); return;
    }
    try {
      logger.info('CameraView', 'Starting broadcast', { cameraId });
      const localStream = await getLocalStream(); setStream(localStream); await startBroadcast(localStream);
      toast.success('Streaming started');
    } catch (err) { logger.error('CameraView', 'Failed to start broadcast', { error: err.message, cameraId }); toast.error('Could not access camera: ' + err.message); }
  }

  async function flipCamera() {
    const next = facingMode === 'environment' ? 'user' : 'environment';
    setFacingMode(next);
    if (isBroadcasting) {
      streamRef.current?.getTracks().forEach((t) => t.stop());
      const newStream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: next, width: { ideal: 1920, min: 1280 }, height: { ideal: 1080, min: 720 } }, audio: micOn });
      setStream(newStream); await startBroadcast(newStream);
    }
  }

  async function handleRecordToggle() {
    if (isRecording) { stopOrientedStream(); stopRecording(); }
    else if (stream) { const recStream = getOrientedStream(); if (recStream) startRecording(recStream); }
  }

  return (
    <div className="page-container max-w-3xl animate-fade-in bg-page min-h-screen">
      <div className="flex items-center gap-2 mb-4">
        <button onClick={() => navigate('/dashboard')}
          className="w-10 h-10 flex items-center justify-center text-text-secondary hover:text-text-primary hover:bg-card-hover rounded-xl transition-colors flex-shrink-0">
          <ArrowLeft size={18} />
        </button>
        <div className="flex-1 min-w-0">
          <h1 className="text-lg font-bold text-text-primary truncate">{camera?.name ?? 'Camera'}</h1>
          {camera?.description && <p className="text-text-secondary text-sm truncate">{camera.description}</p>}
        </div>
        {isRecording && (
          <div className="flex items-center gap-1.5 text-ap-red text-xs font-semibold flex-shrink-0">
            <span className="w-1.5 h-1.5 rounded-full bg-ap-red animate-pulse" />
            {Math.floor(duration / 60)}:{String(duration % 60).padStart(2, '0')}
          </div>
        )}
      </div>

      <CameraStream ref={videoRef} stream={stream} isBroadcasting={isBroadcasting} onToggle={handleToggle}
        onFlip={flipCamera} micOn={micOn} onMicToggle={() => setMicOn((v) => !v)}
        isRecording={isRecording} onRecordToggle={handleRecordToggle}
        className="aspect-video w-full rounded-2xl overflow-hidden shadow-apple" />

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mt-4">
        <div className="card p-4 shadow-apple-sm">
          <div className="flex items-center gap-2 mb-3">
            <Shield size={14} className="text-ap-blue" />
            <span className="text-sm font-semibold text-text-primary">Motion Detection</span>
            <button onClick={async () => {
              const next = !camera?.motionDetect; setCamera((c) => ({ ...c, motionDetect: next }));
              await cameraAPI.update(cameraId, { motionDetect: next });
              if (isBroadcasting) { next ? startDetection() : stopDetection(); }
            }} className={`ml-auto px-3 py-1.5 text-xs rounded-lg font-semibold transition-colors ${camera?.motionDetect ? 'bg-ap-green/10 text-ap-green' : 'bg-fill-input text-text-secondary'}`}>
              {camera?.motionDetect ? 'ON' : 'OFF'}
            </button>
          </div>
          <p className="text-xl font-bold text-text-primary">{motionCount}</p>
          <p className="text-text-secondary text-xs">events this session</p>
          <div className={`mt-1 text-xs font-semibold ${isDetecting ? 'text-ap-green' : 'text-text-secondary'}`}>
            {isDetecting ? '\u25cf Active' : '\u25cb Inactive'}
          </div>
          <div className="mt-2 flex gap-1.5">
            <button onClick={async () => {
              setCamera((c) => ({ ...c, detectionMode: 'PIXEL_DIFF' }));
              await cameraAPI.update(cameraId, { detectionMode: 'PIXEL_DIFF' });
              if (isBroadcasting) { stopMlDetection(); if (camera?.motionDetect) startPixelDiff(); }
            }} className={`flex-1 px-2 py-1.5 text-xs rounded-lg font-semibold transition-colors ${!isMlMode ? 'bg-ap-blue/10 text-ap-blue' : 'bg-fill-input text-text-secondary'}`}>
              Pixel-Diff
            </button>
            <button onClick={async () => {
              setCamera((c) => ({ ...c, detectionMode: 'ML' }));
              await cameraAPI.update(cameraId, { detectionMode: 'ML' });
              if (isBroadcasting) { stopPixelDiff(); if (camera?.motionDetect) startMlDetection(); }
            }} className={`flex-1 px-2 py-1.5 text-xs rounded-lg font-semibold transition-colors flex items-center justify-center gap-1 ${isMlMode ? 'bg-ap-blue/10 text-ap-blue' : 'bg-fill-input text-text-secondary'}`}>
              <Brain size={10} /> ML (YOLO)
            </button>
          </div>
          {isMlMode && (
            <div className="mt-1 text-[10px]">
              {!modelLoaded && !mlError && isMlDetecting && <p className="text-ap-orange">Loading ML model\u2026</p>}
              {modelLoaded && <p className="text-ap-green">ML model ready</p>}
              {mlError && <p className="text-ap-red">ML model error: {mlError}</p>}
              {mlInferenceError && <p className="text-ap-red">ML inference error: {mlInferenceError}</p>}
            </div>
          )}
        </div>

        <div className="card p-4 shadow-apple-sm">
          <div className="flex items-center gap-2 mb-3">
            <Video size={14} className="text-ap-blue" />
            <span className="text-sm font-semibold text-text-primary">Settings</span>
          </div>
          <div className="flex flex-col gap-2 text-xs text-text-secondary">
            <span>Sensitivity: <strong className="text-text-primary">{camera?.sensitivity ?? 30}%</strong></span>
            <span>Two-way audio: <strong className="text-text-primary">{camera?.twoWayAudio ? 'Yes' : 'No'}</strong></span>
            <button onClick={async () => {
              const next = !camera?.recordOnMotion; setCamera((c) => ({ ...c, recordOnMotion: next }));
              await cameraAPI.update(cameraId, { recordOnMotion: next });
            }} className={`flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-semibold transition-colors self-start ${camera?.recordOnMotion ? 'bg-ap-red/10 text-ap-red' : 'bg-fill-input text-text-secondary'}`}>
              <Video size={12} /> {camera?.recordOnMotion ? 'Auto-record ON' : 'Auto-record OFF'}
            </button>
          </div>
        </div>
      </div>

      {screenDimmed && <div className="fixed inset-0 z-50 bg-black cursor-pointer flex items-center justify-center" onClick={() => setScreenDimmed(false)}>
        <p className="text-text-secondary text-xs">Tap to restore screen</p>
      </div>}
      {isAndroid && torchOn && <div className="fixed inset-0 z-50 bg-white pointer-events-none" />}
    </div>
  );
}
