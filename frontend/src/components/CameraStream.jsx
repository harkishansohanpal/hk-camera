import { useRef, useEffect, forwardRef } from 'react';
import { Camera, CameraOff, RotateCcw, Mic, MicOff, ArrowLeft, Settings } from 'lucide-react';

const CameraStream = forwardRef(function CameraStream(
  { stream, isBroadcasting, onToggle, onFlip, micOn, onMicToggle, isRecording, onRecordToggle, onBack, onSettings, className = '' }, ref
) {
  const internalRef = useRef(null);
  const videoRef = ref || internalRef;
  useEffect(() => { if (videoRef.current && stream) videoRef.current.srcObject = stream; }, [stream]);

  return (
    <div className={`relative bg-black overflow-hidden ${className}`}>
      {stream ? (
        <video ref={videoRef} autoPlay muted playsInline className="absolute inset-0 w-full h-full object-cover" />
      ) : (
        <div className="absolute inset-0 flex flex-col items-center justify-center gap-3">
          <CameraOff size={40} className="text-white/30" />
          <p className="text-white/40 text-sm font-medium">Tap the button to start streaming</p>
        </div>
      )}

      {/* Top gradient bar */}
      <div className="absolute top-0 left-0 right-0 bg-gradient-to-b from-black/60 to-transparent z-10 safe-top">
        <div className="flex items-center justify-between px-4 pb-10">
          {onBack && (
            <button onClick={onBack}
              className="w-11 h-11 flex items-center justify-center text-white/80 hover:text-white rounded-full bg-white/10 backdrop-blur-sm transition-colors active:scale-95">
              <ArrowLeft size={22} />
            </button>
          )}
          <div className="flex items-center gap-2">
            {isBroadcasting && (
              <div className="flex items-center gap-1.5 bg-ap-red/90 backdrop-blur-sm px-2.5 py-1 rounded-full shadow-sm">
                <span className="w-1.5 h-1.5 rounded-full bg-white animate-pulse-slow" />
                <span className="text-[10px] font-bold text-white tracking-wide">LIVE</span>
              </div>
            )}
            {onSettings && (
              <button onClick={onSettings}
                className="w-11 h-11 flex items-center justify-center text-white/80 hover:text-white rounded-full bg-white/10 backdrop-blur-sm transition-colors active:scale-95">
                <Settings size={20} />
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Bottom gradient bar - Google Lens style */}
      <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/60 to-transparent z-10 safe-bottom">
        <div className="flex items-end justify-center gap-10 pt-16 pb-6">
          {/* Mic toggle */}
          <div className="w-14 flex justify-center">
            {onMicToggle && (
              <button onClick={onMicToggle}
                className={`w-12 h-12 flex items-center justify-center rounded-full backdrop-blur-sm text-white active:scale-90 transition-all ${micOn ? 'bg-white/20' : 'bg-ap-red/80'}`}>
                {micOn ? <Mic size={18} /> : <MicOff size={18} />}
              </button>
            )}
          </div>

          {/* Big shutter/Stream button */}
          <button onClick={onToggle}
            className="relative w-[68px] h-[68px] rounded-full flex items-center justify-center active:scale-90 transition-transform">
            {/* Outer ring */}
            <div className={`absolute inset-0 rounded-full border-[3px] transition-colors ${isBroadcasting ? 'border-ap-red' : 'border-white/80'}`} />
            {/* Inner circle */}
            <div className={`w-[52px] h-[52px] rounded-full transition-all ${isBroadcasting ? 'bg-ap-red scale-90' : 'bg-white'}`}>
              {isBroadcasting && (
                <div className="w-full h-full rounded-full flex items-center justify-center">
                  <div className="w-5 h-5 rounded-sm bg-white" />
                </div>
              )}
              {!isBroadcasting && (
                <div className="w-full h-full rounded-full flex items-center justify-center">
                  <Camera size={22} className="text-black" />
                </div>
              )}
            </div>
          </button>

          {/* Flip camera */}
          <div className="w-14 flex justify-center">
            {onFlip && (
              <button onClick={onFlip}
                className="w-12 h-12 flex items-center justify-center rounded-full bg-white/20 backdrop-blur-sm text-white active:scale-90 transition-all">
                <RotateCcw size={18} />
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
});

export default CameraStream;
