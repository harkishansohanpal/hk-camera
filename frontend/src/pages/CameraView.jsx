/**
 * CameraView – the "camera device" page.
 * Open this on the device you want to use AS a camera.
 * It captures local video, broadcasts via WebRTC,
 * runs motion detection, fires alerts, and saves recordings.
 */

import { useState, useRef, useCallback, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, Settings2, Shield, Video } from 'lucide-react';
import { Capacitor } from '@capacitor/core';
import { Torch } from '@capawesome/capacitor-torch';
import { AdvancedCamera } from '../services/advancedCamera';
import { cameraAPI, alertAPI } from '../services/api';
import { prefetchIceServers } from '../hooks/useWebRTC';
import { useWebRTC } from '../hooks/useWebRTC';
import { useMotionDetection } from '../hooks/useMotionDetection';
import { useMediaRecorder } from '../hooks/useMediaRecorder';
import { useCameraControls } from '../hooks/useCameraControls';
import CameraStream from '../components/CameraStream';
import CameraControlsPanel from '../components/CameraControlsPanel';
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
  const wakeLockRef = useRef(null);
  const isAndroid = /Android/.test(navigator.userAgent);

  // This ref is forwarded into <CameraStream> so the video element
  // is directly readable by useMotionDetection
  const videoRef = useRef(null);

  // Keep a stable ref to the current stream so onMotion can access it
  // without being a stale closure
  const streamRef = useRef(null);
  useEffect(() => { streamRef.current = stream; }, [stream]);

  // Keep a stable ref to camera settings too
  const cameraRef = useRef(null);
  useEffect(() => { cameraRef.current = camera; }, [camera]);

  // Track if we're in background to restore stream on resume
  const wasBackgroundRef = useRef(false);

  // Camera2 night vision refs (Android native)
  const nvCanvasRef = useRef(null);
  const nvListenerRef = useRef(null);
  const nvFrameRef = useRef(null);

  // ── Camera2 night vision (Android native low-light) ──────────
  async function startCamera2NightVision(broadcastStream) {
    console.log('[NV] Starting Camera2 night vision - native:', Capacitor.isNativePlatform(), 'plugin:', !!AdvancedCamera);
    if (!Capacitor.isNativePlatform() || !AdvancedCamera) {
      console.log('[NV] Not on native platform or plugin unavailable');
      return;
    }
    if (nvListenerRef.current) {
      console.log('[NV] Already running');
      return;
    }

    try {
      console.log('[NV] Creating canvas');
      // Create offscreen canvas for camera2 frames
      const canvas = document.createElement('canvas');
      canvas.width = 480;
      canvas.height = 360;
      nvCanvasRef.current = canvas;

      console.log('[NV] Starting Camera2 capture with ISO 1600, 66ms exposure');
      // Start Camera2 capture with aggressive low-light settings
      await AdvancedCamera.startCapture({ iso: 1600, exposureMs: 66, width: 480, height: 360 });
      console.log('[NV] Camera2 capture started');

      let frameCount = 0;
      // Listen for JPEG frames from the plugin
      nvListenerRef.current = AdvancedCamera.addListener('frame', async (data) => {
        frameCount++;
        if (frameCount % 30 === 0) console.log('[NV] Received frame #' + frameCount);
        try {
          const base64 = data.jpeg;
          const binary = atob(base64);
          const array = new Uint8Array(binary.length);
          for (let i = 0; i < binary.length; i++) array[i] = binary.charCodeAt(i);
          const blob = new Blob([array], { type: 'image/jpeg' });

          // Decode and draw to canvas
          const bitmap = await createImageBitmap(blob);
          const ctx = canvas.getContext('2d');
          ctx.drawImage(bitmap, 0, 0, 480, 360);
          bitmap.close();
        } catch (err) {
          console.warn('[NV] Frame processing error:', err);
        }
      });
      console.log('[NV] Frame listener registered');

      // Replace video track with camera2 stream
      const canvasStream = canvas.captureStream(15); // 15fps for low-light
      const videoTrack = canvasStream.getVideoTracks()[0];
      const audioTrack = broadcastStream?.getAudioTracks()[0];

      console.log('[NV] Got tracks - video:', !!videoTrack, 'audio:', !!audioTrack);

      // Create new stream with canvas video + original audio
      const newStream = new MediaStream();
      if (videoTrack) newStream.addTrack(videoTrack);
      if (audioTrack) newStream.addTrack(audioTrack);

      console.log('[NV] Stopping old broadcast and starting new one');
      // Stop old broadcast and start new one
      stopBroadcast();
      streamRef.current = newStream;
      await startBroadcast(newStream);
      console.log('[NV] Camera2 night vision active!');
    } catch (err) {
      console.error('[NV] Camera2 night vision failed:', err);
      toast.error('Night vision setup failed: ' + err.message);
    }
  }

  async function stopCamera2NightVision() {
    if (nvListenerRef.current) {
      nvListenerRef.current.remove();
      nvListenerRef.current = null;
    }
    if (AdvancedCamera) {
      await AdvancedCamera.stopCapture().catch(() => {});
    }
  }

  // ── Remote command handler (from viewer) ────────────────────
  async function handleRemoteCommand(command, payload) {
    if (command === 'CAMERA_CONTROL') {
      // Handle camera control changes from viewer
      const { control, value } = payload;
      applyControl(control, value);
      // Debounce API update
      clearTimeout(updateTimeoutRef.current);
      updateTimeoutRef.current = setTimeout(() => {
        cameraAPI.update(cameraId, { [control]: value }).catch((err) => {
          console.warn(`Failed to save ${control}:`, err.message);
        });
      }, 300);
    } else if (command === 'TORCH') {
      if (Capacitor.isNativePlatform()) {
        // Native Android APK: real LED flashlight
        try {
          const { available } = await Torch.isAvailable();
          if (!available) {
            toast.error('Flashlight not available on this device');
            return;
          }
          if (payload.on) {
            await Torch.enable();
          } else {
            await Torch.disable();
          }
          setTorchOn(payload.on);
          toast.success(`Flashlight ${payload.on ? 'ON' : 'OFF'}`);
        } catch (err) {
          console.warn('Native torch failed:', err.message);
          toast.error(`Torch error: ${err.message}`);
        }
      } else if (isAndroid) {
        // Android browser fallback: use white screen overlay
        setTorchOn(payload.on);
        toast.success(`Screen light ${payload.on ? 'ON' : 'OFF'}`);
      } else {
        // iOS and desktop: use native torch via WebRTC constraint
        const track = streamRef.current?.getVideoTracks()[0];
        if (!track) {
          console.warn('No video track available for torch');
          return;
        }
        track.applyConstraints({ advanced: [{ torch: payload.on }] })
          .then(() => {
            console.log(`Torch ${payload.on ? 'ON' : 'OFF'}`);
            toast.success(`Torch ${payload.on ? 'ON' : 'OFF'}`);
          })
          .catch((err) => {
            console.warn('Torch constraint failed:', err.message);
            toast.error(`Torch not supported: ${err.message}`);
          });
      }
    } else if (command === 'SCREEN_DIM') {
      setScreenDimmed(payload.on);
    } else if (command === 'BACKGROUND') {
      setBackgroundMode(payload.on);
      if (payload.on) {
        wakeLockRef.current?.release().catch(() => {});
        wakeLockRef.current = null;
      } else {
        navigator.wakeLock?.request('screen')
          .then((wl) => { wakeLockRef.current = wl; })
          .catch(() => {});
      }
    } else if (command === 'NIGHT_VISION') {
      if (payload.on) {
        // On native Android with Camera2, use the custom plugin
        if (Capacitor.isNativePlatform() && AdvancedCamera) {
          await startCamera2NightVision(streamRef.current);
        } else {
          // Browser or iOS: use WebRTC constraints (limited effect)
          const track = streamRef.current?.getVideoTracks()[0];
          if (!track) return;

          const caps = track.getCapabilities?.() ?? {};
          const isIOS = /iPhone|iPad|iPod/.test(navigator.userAgent);
          const constraints = { advanced: [] };

          if (isIOS) {
            // iPhone: let auto-exposure work, just enable continuous focus
            if (caps.focusMode?.includes('continuous-picture')) {
              constraints.advanced.push({ focusMode: 'continuous-picture' });
            }
            if (caps.exposureMode) {
              constraints.advanced.push({ exposureMode: 'continuous' });
            }
          }

          if (constraints.advanced.length > 0) {
            track.applyConstraints(constraints).catch(() => {});
          }
        }
      } else {
        // Stop Camera2 if running
        await stopCamera2NightVision();
      }
    }
  }

  // ── WebRTC broadcast ────────────────────────────────────────
  const { startBroadcast, stopBroadcast, status: rtcStatus } = useWebRTC({
    role: 'camera',
    streamKey: camera?.streamKey,
    onCommand: handleRemoteCommand,
  });

  const isBroadcasting = rtcStatus === 'connected' || rtcStatus === 'connecting';

  // ── Media recorder ──────────────────────────────────────────
  const { startRecording, stopRecording, isRecording, duration } = useMediaRecorder({
    cameraId,
    trigger: 'MANUAL', // Default to manual, can be overridden
  });

  // Keep stable ref so onMotion can call it
  const startRecordingRef = useRef(startRecording);
  useEffect(() => { startRecordingRef.current = startRecording; }, [startRecording]);

  // ── Camera controls (exposure, focus, white balance, etc.) ───
  const { capabilities: cameraCapabilities, settings: controlSettings, applyControl } = useCameraControls({
    streamRef,
    initialSettings: camera,
  });

  // Debounced API update for camera controls
  const updateTimeoutRef = useRef(null);
  const handleControlChange = useCallback(
    (key, value) => {
      applyControl(key, value);
      clearTimeout(updateTimeoutRef.current);
      updateTimeoutRef.current = setTimeout(() => {
        cameraAPI.update(cameraId, { [key]: value }).catch((err) => {
          console.warn(`Failed to save ${key}:`, err.message);
        });
      }, 300);
    },
    [cameraId, applyControl]
  );

  const handleControlReset = useCallback(() => {
    const defaults = {
      exposure: 0,
      focus: 50,
      whiteBalance: 'auto',
      iso: 100,
      brightness: 50,
      contrast: 50,
    };
    Object.entries(defaults).forEach(([key, value]) => {
      applyControl(key, value);
    });
    clearTimeout(updateTimeoutRef.current);
    updateTimeoutRef.current = setTimeout(() => {
      cameraAPI.update(cameraId, defaults).catch(() => {});
    }, 300);
  }, [cameraId, applyControl]);

  // ── Motion detection ────────────────────────────────────────
  const handleMotion = useCallback(({ thumbnail }) => {
    setMotionCount((n) => n + 1);

    // Create alert in backend (fire-and-forget)
    alertAPI.motionAlert({ cameraId, thumbnailUrl: thumbnail }).catch((err) => {
      console.warn('Alert creation failed:', err.message);
    });

    // Auto-record clip if enabled
    if (cameraRef.current?.recordOnMotion && streamRef.current) {
      startRecordingRef.current(streamRef.current, 'MOTION');
    }
  }, [cameraId]);

  const { startDetection, stopDetection, isDetecting } = useMotionDetection({
    videoRef,
    sensitivity: camera?.sensitivity ?? 30,
    onMotion: handleMotion,
  });

  // ── Prefetch TURN credentials on mount ──────────────────────
  useEffect(() => {
    console.log('[CameraView] Prefetching TURN credentials');
    prefetchIceServers().catch(() => {});
  }, []);

  // ── Load camera details ─────────────────────────────────────
  useEffect(() => {
    cameraAPI.get(cameraId)
      .then(({ data }) => setCamera(data.data))
      .catch(() => toast.error('Camera not found'));
  }, [cameraId]);

  // ── Cleanup Camera2 on unmount ───────────────────────────────
  useEffect(() => {
    return () => {
      stopCamera2NightVision().catch(() => {});
    };
  }, []);

  // ── Wake lock while broadcasting ───────────────────────────
  useEffect(() => {
    if (!isBroadcasting) return;
    let wl = null;
    navigator.wakeLock?.request('screen').then((lock) => { wl = lock; wakeLockRef.current = lock; }).catch(() => {});
    return () => { wl?.release().catch(() => {}); wakeLockRef.current = null; };
  }, [isBroadcasting]);

  // ── Handle app pause/resume (keep broadcast alive in background) ──
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.hidden) {
        console.log('[CameraView] App backgrounded - broadcast continues, stopping motion detection');
        wasBackgroundRef.current = true;
        stopDetection();
      } else {
        console.log('[CameraView] App foregrounded - resuming motion detection');
        wasBackgroundRef.current = false;
        if (cameraRef.current?.motionDetect) {
          startDetection();
        }
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => document.removeEventListener('visibilitychange', handleVisibilityChange);
  }, [stopDetection, startDetection]);

  // ── DB heartbeat while broadcasting ────────────────────────
  useEffect(() => {
    if (!isBroadcasting) return;
    const iv = setInterval(() => cameraAPI.heartbeat(cameraId).catch(() => {}), 30_000);
    return () => clearInterval(iv);
  }, [isBroadcasting, cameraId]);

  // ── Camera stream helpers ───────────────────────────────────
  async function getLocalStream() {
    return navigator.mediaDevices.getUserMedia({
      video: {
        facingMode,
        width: { ideal: 1920, min: 1280 },
        height: { ideal: 1080, min: 720 },
      },
      audio: micOn,
    });
  }

  async function handleToggle() {
    if (isBroadcasting) {
      await stopCamera2NightVision();
      stopBroadcast();
      stopDetection();
      if (isRecording) stopRecording();
      streamRef.current?.getTracks().forEach((t) => t.stop());
      setStream(null);
      return;
    }

    try {
      const localStream = await getLocalStream();
      setStream(localStream);
      await startBroadcast(localStream);
      if (camera?.motionDetect) startDetection();
      toast.success('Broadcasting started');
    } catch (err) {
      toast.error('Could not access camera: ' + err.message);
    }
  }

  async function flipCamera() {
    const next = facingMode === 'environment' ? 'user' : 'environment';
    setFacingMode(next);
    if (isBroadcasting) {
      streamRef.current?.getTracks().forEach((t) => t.stop());
      const newStream = await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode: next,
          width: { ideal: 1920, min: 1280 },
          height: { ideal: 1080, min: 720 },
        },
        audio: micOn,
      });
      setStream(newStream);
      await startBroadcast(newStream);
    }
  }

  async function handleRecordToggle() {
    if (isRecording) {
      stopRecording();
    } else if (stream) {
      startRecording(stream);
    }
  }

  return (
    <div className="max-w-3xl mx-auto">
      {/* Header */}
      <div className="flex items-center gap-3 mb-4">
        <button onClick={() => navigate('/dashboard')} className="w-11 h-11 flex items-center justify-center text-slate-400 hover:text-white hover:bg-slate-700/50 rounded-lg transition-colors flex-shrink-0">
          <ArrowLeft size={20} />
        </button>
        <div className="flex-1 min-w-0">
          <h1 className="text-xl font-bold text-white truncate">{camera?.name ?? 'Camera'}</h1>
          {camera?.description && (
            <p className="text-slate-400 text-sm truncate">{camera.description}</p>
          )}
        </div>
        {isRecording && (
          <div className="flex items-center gap-2 text-red-400 text-xs font-medium">
            <span className="w-2 h-2 rounded-full bg-red-500 animate-pulse" />
            {Math.floor(duration / 60)}:{String(duration % 60).padStart(2, '0')}
          </div>
        )}
      </div>

      {/* Stream – videoRef forwarded so motion detection can read frames */}
      <CameraStream
        ref={videoRef}
        stream={stream}
        isBroadcasting={isBroadcasting}
        onToggle={handleToggle}
        onFlip={flipCamera}
        micOn={micOn}
        onMicToggle={() => setMicOn((v) => !v)}
        isRecording={isRecording}
        onRecordToggle={handleRecordToggle}
        cameraCapabilities={cameraCapabilities}
        cameraSettings={controlSettings}
        onCameraControlChange={handleControlChange}
        onCameraControlReset={handleControlReset}
        className="aspect-video w-full rounded-xl overflow-hidden"
      />

      {/* Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mt-6">
        <div className="card">
          <div className="flex items-center gap-2 mb-1">
            <Shield size={16} className="text-hk-400" />
            <span className="text-sm font-medium text-slate-300">Motion Detection</span>
            <button
              onClick={async () => {
                const next = !camera?.motionDetect;
                setCamera((c) => ({ ...c, motionDetect: next }));
                await cameraAPI.update(cameraId, { motionDetect: next });
                if (isBroadcasting) { next ? startDetection() : stopDetection(); }
              }}
              className={`ml-auto px-3 py-2 text-sm rounded font-medium transition-colors ${
                camera?.motionDetect
                  ? 'bg-green-500/20 text-green-400 hover:bg-green-500/30'
                  : 'bg-slate-700 text-slate-500 hover:bg-slate-600 hover:text-slate-300'
              }`}
            >
              {camera?.motionDetect ? 'ON' : 'OFF'}
            </button>
          </div>
          <p className="text-xl font-bold text-white">{motionCount}</p>
          <p className="text-slate-500 text-xs">events this session</p>
          <div className={`mt-2 text-xs font-medium ${isDetecting ? 'text-green-400' : 'text-slate-500'}`}>
            {isDetecting ? '● Active' : '○ Inactive'}
          </div>
        </div>

        <div className="card">
          <div className="flex items-center gap-2 mb-1">
            <Settings2 size={16} className="text-hk-400" />
            <span className="text-sm font-medium text-slate-300">Settings</span>
          </div>
          <div className="flex flex-col gap-2 text-xs text-slate-400">
            <span>Sensitivity: <strong className="text-white">{camera?.sensitivity ?? 30}%</strong></span>
            <span>Two-way audio: <strong className="text-white">{camera?.twoWayAudio ? 'Yes' : 'No'}</strong></span>
            <button
              onClick={async () => {
                const next = !camera?.recordOnMotion;
                setCamera((c) => ({ ...c, recordOnMotion: next }));
                await cameraAPI.update(cameraId, { recordOnMotion: next });
              }}
              className={`flex items-center gap-2 mt-1 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                camera?.recordOnMotion
                  ? 'bg-red-500/20 text-red-400 hover:bg-red-500/30'
                  : 'bg-slate-700 text-slate-400 hover:bg-slate-600'
              }`}
            >
              <Video size={14} />
              {camera?.recordOnMotion ? 'Auto-record ON' : 'Auto-record OFF'}
            </button>
          </div>
        </div>
      </div>

      {/* Screen dim overlay — viewer can trigger this to save camera battery */}
      {screenDimmed && (
        <div
          className="fixed inset-0 z-50 bg-black cursor-pointer flex items-center justify-center"
          onClick={() => setScreenDimmed(false)}
        >
          <p className="text-slate-700 text-xs">Tap to restore screen</p>
        </div>
      )}

      {/* Android torch overlay — bright white screen as flashlight fallback */}
      {isAndroid && torchOn && (
        <div className="fixed inset-0 z-50 bg-white pointer-events-none" />
      )}
    </div>
  );
}
