/**
 * useMotionDetection
 * ─────────────────────────────────────────────────────────────
 * Canvas-based frame-diff motion detector.
 * Compares consecutive video frames and fires onMotion()
 * when the changed pixel ratio exceeds `sensitivity`.
 *
 * Usage:
 *   const { startDetection, stopDetection, isDetecting } =
 *     useMotionDetection({ videoRef, sensitivity: 30, onMotion });
 */

import { useState, useRef, useCallback } from 'react';

const SAMPLE_INTERVAL_MS = 200; // analyse every 200 ms

export function useMotionDetection({ videoRef, sensitivity = 30, onMotion, cooldownMs = 3000 }) {
  const [isDetecting, setIsDetecting]   = useState(false);
  const intervalRef   = useRef(null);
  const prevDataRef   = useRef(null);
  const lastAlertRef  = useRef(0);
  const canvasRef     = useRef(document.createElement('canvas'));

  const analyseSample = useCallback(() => {
    const video = videoRef.current;
    if (!video || video.readyState < 2) return;

    const canvas = canvasRef.current;
    const W = 160; // downscale for performance
    const H = Math.round((video.videoHeight / video.videoWidth) * W) || 90;
    canvas.width  = W;
    canvas.height = H;

    const ctx = canvas.getContext('2d', { willReadFrequently: true });
    ctx.drawImage(video, 0, 0, W, H);
    const current = ctx.getImageData(0, 0, W, H).data;

    if (!prevDataRef.current) {
      prevDataRef.current = current;
      return;
    }

    const prev   = prevDataRef.current;
    let changed  = 0;
    const total  = W * H;

    for (let i = 0; i < current.length; i += 4) {
      const dr = Math.abs(current[i]     - prev[i]);
      const dg = Math.abs(current[i + 1] - prev[i + 1]);
      const db = Math.abs(current[i + 2] - prev[i + 2]);
      const pixelDiff = (dr + dg + db) / 3;
      if (pixelDiff > 25) changed++; // threshold per pixel (0-255)
    }

    prevDataRef.current = current;

    const changeRatio = (changed / total) * 100;

    if (changeRatio > sensitivity) {
      const now = Date.now();
      if (now - lastAlertRef.current > cooldownMs) {
        lastAlertRef.current = now;

        // Capture thumbnail from canvas at full video resolution
        const thumbCanvas = document.createElement('canvas');
        thumbCanvas.width  = video.videoWidth  || 640;
        thumbCanvas.height = video.videoHeight || 480;
        thumbCanvas.getContext('2d').drawImage(video, 0, 0);
        const thumbnail = thumbCanvas.toDataURL('image/jpeg', 0.7);

        onMotion?.({ changeRatio, thumbnail });
      }
    }
  }, [videoRef, sensitivity, onMotion, cooldownMs]);

  const startDetection = useCallback(() => {
    if (intervalRef.current) return;
    prevDataRef.current  = null;
    lastAlertRef.current = 0;
    intervalRef.current  = setInterval(analyseSample, SAMPLE_INTERVAL_MS);
    setIsDetecting(true);
  }, [analyseSample]);

  const stopDetection = useCallback(() => {
    clearInterval(intervalRef.current);
    intervalRef.current = null;
    prevDataRef.current = null;
    setIsDetecting(false);
  }, []);

  return { startDetection, stopDetection, isDetecting };
}
