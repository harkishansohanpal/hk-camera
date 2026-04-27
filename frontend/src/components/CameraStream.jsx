import { useRef, useEffect, forwardRef } from 'react';
import { Camera, CameraOff, RotateCcw, Mic, MicOff, Video, VideoOff } from 'lucide-react';

/**
 * CameraStream
 * Renders the local camera feed with an embedded controls overlay.
 * Accepts an optional forwarded ref so parent hooks (e.g. useMotionDetection)
 * can read frames directly from the <video> element.
 */
const CameraStream = forwardRef(function CameraStream(
  { stream, isBroadcasting, onToggle, onFlip, micOn, onMicToggle, isRecording, onRecordToggle, className = '' },
  ref
) {
  const internalRef = useRef(null);
  // Use forwarded ref if provided, otherwise fall back to internal one
  const videoRef = ref || internalRef;

  useEffect(() => {
    if (videoRef.current && stream) {
      videoRef.current.srcObject = stream;
    }
  }, [stream]);

  return (
    <div className={`relative overflow-hidden bg-black ${className}`}>
      {stream ? (
        <video
          ref={videoRef}
          autoPlay
          muted
          playsInline
          className="w-full h-full object-cover"
        />
      ) : (
        <div className="w-full h-full flex flex-col items-center justify-center gap-3 min-h-[260px]">
          <CameraOff size={48} className="text-slate-600" />
          <p className="text-slate-500 text-sm">Camera not started</p>
        </div>
      )}

      {/* LIVE badge */}
      {isBroadcasting && (
        <div className="absolute top-3 left-3 flex items-center gap-1.5 bg-red-600/90 backdrop-blur-sm px-2.5 py-1 rounded-md">
          <span className="w-2 h-2 rounded-full bg-white animate-pulse" />
          <span className="text-xs font-bold text-white tracking-wide">LIVE</span>
        </div>
      )}

      {/* Bottom controls overlay */}
      <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/70 to-transparent p-4 flex items-center gap-3">
        {/* Flip camera (mobile only) */}
        {onFlip && (
          <button
            onClick={onFlip}
            className="w-11 h-11 flex items-center justify-center rounded-full bg-white/20 backdrop-blur-sm text-white active:scale-95 transition-transform"
          >
            <RotateCcw size={18} />
          </button>
        )}

        {/* Mic toggle */}
        {onMicToggle && (
          <button
            onClick={onMicToggle}
            className={`w-11 h-11 flex items-center justify-center rounded-full backdrop-blur-sm text-white active:scale-95 transition-transform ${
              micOn ? 'bg-white/20' : 'bg-red-600/80'
            }`}
          >
            {micOn ? <Mic size={18} /> : <MicOff size={18} />}
          </button>
        )}

        {/* Record toggle */}
        {onRecordToggle && (
          <button
            onClick={onRecordToggle}
            className={`w-11 h-11 flex items-center justify-center rounded-full backdrop-blur-sm text-white active:scale-95 transition-transform ${
              isRecording ? 'bg-red-600/80' : 'bg-white/20'
            }`}
          >
            {isRecording ? <VideoOff size={18} /> : <Video size={18} />}
          </button>
        )}

        {/* Broadcast toggle – main CTA */}
        <button
          onClick={onToggle}
          className={`ml-auto flex items-center gap-2 px-5 py-2.5 rounded-full font-semibold text-sm shadow-lg active:scale-95 transition-all ${
            isBroadcasting
              ? 'bg-red-600 text-white'
              : 'bg-hk-500 text-white'
          }`}
        >
          <Camera size={16} />
          {isBroadcasting ? 'Stop' : 'Go Live'}
        </button>
      </div>
    </div>
  );
});

export default CameraStream;
