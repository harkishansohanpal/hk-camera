import { useState } from 'react';
import { ChevronDown } from 'lucide-react';

export default function CameraControlsPanel({
  capabilities,
  settings,
  onControlChange,
  onReset,
}) {
  const [isOpen, setIsOpen] = useState(false);

  if (!capabilities || Object.values(capabilities).every((v) => !v)) {
    return null; // No supported controls
  }

  const whiteBalanceOptions = [
    { value: 'auto', label: 'Auto' },
    { value: 'daylight', label: 'Daylight' },
    { value: 'cloudy', label: 'Cloudy' },
    { value: 'tungsten', label: 'Tungsten' },
    { value: 'fluorescent', label: 'Fluorescent' },
  ];

  return (
    <div className="relative">
      {/* Settings button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="inline-flex items-center justify-center w-10 h-10 rounded-full bg-black/50 hover:bg-black/70 text-white transition-colors"
        title="Camera settings"
      >
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6V4m0 2a2 2 0 100 4m0-4a2 2 0 110 4m-6 8v-2m0 2a2 2 0 100 4m0-4a2 2 0 110 4m-6-8v-2m0 2a2 2 0 100 4m0-4a2 2 0 110 4" />
        </svg>
      </button>

      {/* Panel */}
      {isOpen && (
        <div className="absolute bottom-12 right-0 bg-black/90 backdrop-blur-sm rounded-lg p-4 w-72 shadow-xl border border-white/10 z-40">
          <div className="space-y-4">
            {/* Exposure */}
            {capabilities.exposure && (
              <div>
                <div className="flex justify-between items-center mb-2">
                  <label className="text-sm font-medium text-white">Exposure</label>
                  <span className="text-xs text-gray-400">{settings.exposure.toFixed(1)} EV</span>
                </div>
                <input
                  type="range"
                  min="-3"
                  max="3"
                  step="0.1"
                  value={settings.exposure}
                  onChange={(e) => onControlChange('exposure', parseFloat(e.target.value))}
                  className="w-full h-2 bg-gray-700 rounded-lg appearance-none cursor-pointer"
                />
              </div>
            )}

            {/* Focus */}
            {capabilities.focus && (
              <div>
                <div className="flex justify-between items-center mb-2">
                  <label className="text-sm font-medium text-white">Focus</label>
                  <span className="text-xs text-gray-400">{settings.focus}%</span>
                </div>
                <input
                  type="range"
                  min="0"
                  max="100"
                  value={settings.focus}
                  onChange={(e) => onControlChange('focus', parseInt(e.target.value))}
                  className="w-full h-2 bg-gray-700 rounded-lg appearance-none cursor-pointer"
                />
                <p className="text-xs text-gray-500 mt-1">0 = near, 100 = far</p>
              </div>
            )}

            {/* White Balance */}
            {capabilities.whiteBalance && (
              <div>
                <label className="text-sm font-medium text-white block mb-2">White Balance</label>
                <select
                  value={settings.whiteBalance}
                  onChange={(e) => onControlChange('whiteBalance', e.target.value)}
                  className="w-full bg-gray-700 text-white rounded px-2 py-1 text-sm border border-gray-600"
                >
                  {whiteBalanceOptions.map((opt) => (
                    <option key={opt.value} value={opt.value}>
                      {opt.label}
                    </option>
                  ))}
                </select>
              </div>
            )}

            {/* ISO */}
            {capabilities.iso && (
              <div>
                <div className="flex justify-between items-center mb-2">
                  <label className="text-sm font-medium text-white">ISO</label>
                  <span className="text-xs text-gray-400">{settings.iso}</span>
                </div>
                <input
                  type="range"
                  min="100"
                  max="3200"
                  step="100"
                  value={settings.iso}
                  onChange={(e) => onControlChange('iso', parseInt(e.target.value))}
                  className="w-full h-2 bg-gray-700 rounded-lg appearance-none cursor-pointer"
                />
              </div>
            )}

            {/* Brightness */}
            {capabilities.brightness && (
              <div>
                <div className="flex justify-between items-center mb-2">
                  <label className="text-sm font-medium text-white">Brightness</label>
                  <span className="text-xs text-gray-400">{settings.brightness}</span>
                </div>
                <input
                  type="range"
                  min="0"
                  max="100"
                  value={settings.brightness}
                  onChange={(e) => onControlChange('brightness', parseInt(e.target.value))}
                  className="w-full h-2 bg-gray-700 rounded-lg appearance-none cursor-pointer"
                />
              </div>
            )}

            {/* Contrast */}
            {capabilities.contrast && (
              <div>
                <div className="flex justify-between items-center mb-2">
                  <label className="text-sm font-medium text-white">Contrast</label>
                  <span className="text-xs text-gray-400">{settings.contrast}</span>
                </div>
                <input
                  type="range"
                  min="0"
                  max="100"
                  value={settings.contrast}
                  onChange={(e) => onControlChange('contrast', parseInt(e.target.value))}
                  className="w-full h-2 bg-gray-700 rounded-lg appearance-none cursor-pointer"
                />
              </div>
            )}

            {/* Reset button */}
            <button
              onClick={() => {
                onReset();
                setIsOpen(false);
              }}
              className="w-full mt-2 px-3 py-2 bg-gray-700 hover:bg-gray-600 text-white text-sm rounded transition-colors"
            >
              Reset to defaults
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
