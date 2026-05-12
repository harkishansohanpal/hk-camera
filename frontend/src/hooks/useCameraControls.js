import { useState, useEffect, useCallback } from 'react';

export function useCameraControls({ streamRef, initialSettings }) {
  const [capabilities, setCapabilities] = useState({});
  const [settings, setSettings] = useState({
    exposure: initialSettings?.exposure ?? 0,
    focus: initialSettings?.focus ?? 50,
    whiteBalance: initialSettings?.whiteBalance ?? 'auto',
    iso: initialSettings?.iso ?? 100,
    brightness: initialSettings?.brightness ?? 50,
    contrast: initialSettings?.contrast ?? 50,
  });

  // Map constraint names from our schema to WebRTC MediaStream API
  const constraintMap = {
    exposure: 'exposureCompensation',
    focus: 'focusDistance',
    whiteBalance: 'whiteBalanceMode',
    iso: 'iso',
    brightness: 'brightness',
    contrast: 'contrast',
  };

  // Detect device capabilities
  useEffect(() => {
    if (!streamRef?.current) return;

    const track = streamRef.current.getVideoTracks()[0];
    if (!track) return;

    try {
      const caps = track.getCapabilities();
      setCapabilities({
        exposure: !!(caps.exposureCompensation),
        focus: !!(caps.focusDistance || caps.focusMode),
        whiteBalance: !!(caps.whiteBalanceMode),
        iso: !!(caps.iso),
        brightness: !!(caps.brightness),
        contrast: !!(caps.contrast),
      });
    } catch (err) {
      console.warn('getCapabilities failed:', err);
    }
  }, [streamRef]);

  // Apply a constraint to the video track
  const applyControl = useCallback(
    async (key, value) => {
      if (!streamRef?.current) return false;

      const track = streamRef.current.getVideoTracks()[0];
      if (!track) return false;

      // Update local state
      setSettings((prev) => ({ ...prev, [key]: value }));

      try {
        const constraintKey = constraintMap[key];
        if (!constraintKey) return false;

        // Map UI values to API values
        let mappedValue = value;
        if (key === 'exposure') mappedValue = value; // -3 to 3
        if (key === 'focus') mappedValue = value / 100; // 0-1 range
        if (key === 'iso') mappedValue = value; // 100-3200
        if (key === 'brightness') mappedValue = (value - 50) / 50; // -1 to 1
        if (key === 'contrast') mappedValue = (value - 50) / 50; // -1 to 1

        await track.applyConstraints({
          advanced: [{ [constraintKey]: mappedValue }],
        });
        return true;
      } catch (err) {
        console.warn(`applyConstraints failed for ${key}:`, err);
        return false;
      }
    },
    [streamRef]
  );

  // Update local settings when initialSettings change
  useEffect(() => {
    if (!initialSettings) return;
    setSettings((prev) => ({
      ...prev,
      exposure: initialSettings.exposure ?? prev.exposure,
      focus: initialSettings.focus ?? prev.focus,
      whiteBalance: initialSettings.whiteBalance ?? prev.whiteBalance,
      iso: initialSettings.iso ?? prev.iso,
      brightness: initialSettings.brightness ?? prev.brightness,
      contrast: initialSettings.contrast ?? prev.contrast,
    }));
  }, [initialSettings]);

  return { capabilities, settings, applyControl };
}
