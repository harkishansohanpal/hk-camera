import { useState } from 'react';

const whiteBalanceOptions = [
  { value: 'auto', label: 'Auto' }, { value: 'daylight', label: 'Daylight' },
  { value: 'cloudy', label: 'Cloudy' }, { value: 'tungsten', label: 'Tungsten' }, { value: 'fluorescent', label: 'Fluorescent' },
];

export default function CameraControlsPanel({ capabilities, settings, onControlChange, onReset }) {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <div className="relative">
      <button onClick={() => setIsOpen(!isOpen)}
        className="flex flex-col items-center justify-center gap-0.5 w-11 h-11 rounded-xl transition-colors text-white/50 hover:text-white hover:bg-white/5">
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6V4m0 2a2 2 0 100 4m0-4a2 2 0 110 4m-6 8v-2m0 2a2 2 0 100 4m0-4a2 2 0 110 4m-6-8v-2m0 2a2 2 0 100 4m0-4a2 2 0 110 4" />
        </svg>
        <span className="text-[9px] font-semibold">Camera</span>
      </button>
      {isOpen && (
        <div className="absolute bottom-full right-0 mb-2 bg-black/95 backdrop-blur-xl rounded-xl p-4 w-80 max-w-[calc(100vw-2rem)] max-h-[60vh] shadow-xl border border-white/10 z-50 overflow-y-auto">
          <div className="space-y-4">
            <div>
              <div className="flex justify-between items-center mb-1">
                <label className="text-xs font-medium text-white">Exposure</label>
                <span className="text-xs text-white/50">{settings.exposure.toFixed(1)} EV</span>
              </div>
              <input type="range" min="-3" max="3" step="0.1" value={settings.exposure}
                onChange={(e) => onControlChange('exposure', parseFloat(e.target.value))}
                className="w-full h-1.5 bg-white/20 rounded-full appearance-none cursor-pointer accent-ap-blue" />
            </div>
            <div>
              <div className="flex justify-between items-center mb-1">
                <label className="text-xs font-medium text-white">Focus</label>
                <span className="text-xs text-white/50">{settings.focus}%</span>
              </div>
              <input type="range" min="0" max="100" value={settings.focus}
                onChange={(e) => onControlChange('focus', parseInt(e.target.value))}
                className="w-full h-1.5 bg-white/20 rounded-full appearance-none cursor-pointer accent-ap-blue" />
              <p className="text-[10px] text-white/30 mt-1">0 = near, 100 = far</p>
            </div>
            <div>
              <label className="text-xs font-medium text-white block mb-1">White Balance</label>
              <select value={settings.whiteBalance} onChange={(e) => onControlChange('whiteBalance', e.target.value)}
                className="w-full bg-white/10 text-white rounded-lg px-2.5 py-1.5 text-sm border border-white/10">
                {whiteBalanceOptions.map((opt) => <option key={opt.value} value={opt.value}>{opt.label}</option>)}
              </select>
            </div>
            <div>
              <div className="flex justify-between items-center mb-1">
                <label className="text-xs font-medium text-white">ISO</label>
                <span className="text-xs text-white/50">{settings.iso}</span>
              </div>
              <input type="range" min="100" max="3200" step="100" value={settings.iso}
                onChange={(e) => onControlChange('iso', parseInt(e.target.value))}
                className="w-full h-1.5 bg-white/20 rounded-full appearance-none cursor-pointer accent-ap-blue" />
            </div>
            <div>
              <div className="flex justify-between items-center mb-1">
                <label className="text-xs font-medium text-white">Brightness</label>
                <span className="text-xs text-white/50">{settings.brightness}</span>
              </div>
              <input type="range" min="0" max="100" value={settings.brightness}
                onChange={(e) => onControlChange('brightness', parseInt(e.target.value))}
                className="w-full h-1.5 bg-white/20 rounded-full appearance-none cursor-pointer accent-ap-blue" />
            </div>
            <div>
              <div className="flex justify-between items-center mb-1">
                <label className="text-xs font-medium text-white">Contrast</label>
                <span className="text-xs text-white/50">{settings.contrast}</span>
              </div>
              <input type="range" min="0" max="100" value={settings.contrast}
                onChange={(e) => onControlChange('contrast', parseInt(e.target.value))}
                className="w-full h-1.5 bg-white/20 rounded-full appearance-none cursor-pointer accent-ap-blue" />
            </div>
            <button onClick={() => { onReset(); setIsOpen(false); }}
              className="w-full px-3 py-2 bg-white/10 hover:bg-white/20 text-white text-xs rounded-xl transition-colors font-semibold">
              Reset
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
