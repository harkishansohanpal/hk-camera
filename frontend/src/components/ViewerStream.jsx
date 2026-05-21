import { useRef, useEffect } from 'react';
import { Loader2, WifiOff } from 'lucide-react';
import { useNightVision } from '../hooks/useNightVision';

const STATUS_LABELS = {
  idle:         { text: 'Initialising\u2026',   Icon: Loader2, spin: true },
  connecting:   { text: 'Connecting\u2026',      Icon: Loader2, spin: true },
  waiting:      { text: 'Waiting for camera\u2026', Icon: Loader2, spin: true },
  disconnected: { text: 'Camera offline',   Icon: WifiOff, spin: false },
  error:        { text: 'Connection error', Icon: WifiOff, spin: false },
};

export default function ViewerStream({ remoteStream, status, className = '', videoRef: externalRef, isRecording = false, recordingDuration = 0, nightVision = 'off' }) {
  const internalRef = useRef(null);
  const videoRef = externalRef || internalRef;
  const overlayCanvasRef = useRef(null);
  useNightVision({ videoRef, canvasRef: overlayCanvasRef, enabled: nightVision === 'ir' });

  useEffect(() => {
    const video = videoRef.current;
    if (!video || !remoteStream) return;
    video.srcObject = remoteStream;
    video.muted = true;
    function tryPlay() { video.play().catch((err) => { if (err.name === 'NotAllowedError') setTimeout(tryPlay, 300); }); }
    tryPlay();
    video.addEventListener('loadedmetadata', tryPlay, { once: true });
    function onVisibilityChange() { if (!document.hidden && video.paused) tryPlay(); }
    document.addEventListener('visibilitychange', onVisibilityChange);
    function onFullscreenChange() {
      if (!document.fullscreenElement && video.paused) {
        video.srcObject = remoteStream;
        tryPlay();
      }
    }
    document.addEventListener('fullscreenchange', onFullscreenChange);
    document.addEventListener('webkitfullscreenchange', onFullscreenChange);
    return () => {
      document.removeEventListener('visibilitychange', onVisibilityChange);
      document.removeEventListener('fullscreenchange', onFullscreenChange);
      document.removeEventListener('webkitfullscreenchange', onFullscreenChange);
      video.removeEventListener('loadedmetadata', tryPlay);
    };
  }, [remoteStream]);

  const overlay = STATUS_LABELS[status];
  const isConnected = status === 'connected';

  return (
    <div className={`relative overflow-hidden bg-black ${className}`}>
      <video ref={videoRef} autoPlay playsInline muted
        className={`w-full h-full object-contain transition-opacity duration-300 ${isConnected ? 'opacity-100' : 'opacity-0'}`}
        style={{ minHeight: '200px', filter: nightVision === 'enhanced' ? 'brightness(2.5) contrast(1.4) saturate(0.6)' : 'none' }} />
      {nightVision === 'ir' && <canvas ref={overlayCanvasRef} className="absolute inset-0 w-full h-full" style={{ pointerEvents: 'none', objectFit: 'contain' }} />}
      {!isConnected && overlay && (
        <div className="absolute inset-0 flex flex-col items-center justify-center gap-3">
          <overlay.Icon size={40} className={`text-white/40 ${overlay.spin ? 'animate-spin' : ''}`} />
          <p className="text-white/50 text-sm">{overlay.text}</p>
        </div>
      )}
      {isRecording && (
        <div className="absolute top-3 right-3 flex items-center gap-1.5 bg-ap-red/90 backdrop-blur-sm px-2.5 py-1 rounded-full shadow-sm">
          <span className="w-1.5 h-1.5 rounded-full bg-white animate-pulse-slow" />
          <span className="text-[10px] font-bold text-white tracking-wide">REC{recordingDuration > 0 ? ` ${recordingDuration}s` : ''}</span>
        </div>
      )}
    </div>
  );
}
