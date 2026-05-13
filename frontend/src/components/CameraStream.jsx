import { useRef, useEffect, forwardRef } from 'react';
import { Camera, CameraOff, RotateCcw, Mic, MicOff, Video, VideoOff } from 'lucide-react';
import CameraControlsPanel from './CameraControlsPanel';

const CameraStream = forwardRef(function CameraStream(
  { stream, isBroadcasting, onToggle, onFlip, micOn, onMicToggle, isRecording, onRecordToggle, cameraCapabilities, cameraSettings, onCameraControlChange, onCameraControlReset, className = '' },
  ref
) {
  const internalRef = useRef(null);
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
        <div className="w-full h-full flex flex-col items-center justify-center gap-3 min-h-[200px] sm:min-h-[260px]">
          <CameraOff size={36} className="text-slate-600 sm:w-12 sm:h-12" />
          <p className="text-slate-500 text-xs sm:text-sm">Camera not started</p>
        </div>
      )}

      {isBroadcasting && (
        <div className="absolute top-2 left-2 sm:top-3 sm:left-3 flex items-center gap-1.5 bg-red-600/90 backdrop-blur-sm px-2 py-0.5 sm:px-2.5 sm:py-1 rounded-md">
          <span className="w-1.5 h-1.5 rounded-full bg-white animate-pulse" />
          <span className="text-[10px] sm:text-xs font-bold text-white tracking-wide">LIVE</span>
        </div>
      )}

      <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/70 to-transparent px-2 py-2 sm:px-3 sm:py-3 lg:px-4 lg:py-4 flex items-center gap-1.5 sm:gap-2 overflow-x-auto">
        {onFlip && (
          <button
            onClick={onFlip}
            className="w-9 h-9 sm:w-10 sm:h-11 flex items-center justify-center rounded-full bg-white/20 backdrop-blur-sm text-white active:scale-95 transition-transform flex-shrink-0"
          >
            <RotateCcw size={16} />
          </button>
        )}

        {onMicToggle && (
          <button
            onClick={onMicToggle}
            className={`w-9 h-9 sm:w-10 sm:h-11 flex items-center justify-center rounded-full backdrop-blur-sm text-white active:scale-95 transition-transform flex-shrink-0 ${
              micOn ? 'bg-white/20' : 'bg-red-600/80'
            }`}
          >
            {micOn ? <Mic size={16} /> : <MicOff size={16} />}
          </button>
        )}

        {onRecordToggle && (
          <button
            onClick={onRecordToggle}
            className={`w-9 h-9 sm:w-10 sm:h-11 flex items-center justify-center rounded-full backdrop-blur-sm text-white active:scale-95 transition-transform flex-shrink-0 ${
              isRecording ? 'bg-red-600/80' : 'bg-white/20'
            }`}
          >
            {isRecording ? <VideoOff size={16} /> : <Video size={16} />}
          </button>
        )}

        {cameraCapabilities && (
          <CameraControlsPanel
            capabilities={cameraCapabilities}
            settings={cameraSettings}
            onControlChange={onCameraControlChange}
            onReset={onCameraControlReset}
          />
        )}

        <button
          onClick={onToggle}
          className={`ml-auto flex items-center gap-1.5 px-3 py-2 sm:px-4 sm:py-2.5 lg:px-5 lg:py-2.5 rounded-full font-semibold text-[11px] sm:text-sm shadow-lg active:scale-95 transition-all flex-shrink-0 ${
            isBroadcasting
              ? 'bg-red-600 text-white'
              : 'bg-hk-500 text-white'
          }`}
        >
          <Camera size={14} />
          {isBroadcasting ? 'Stop' : 'Go Live'}
        </button>
      </div>
    </div>
  );
});

export default CameraStream;
