import { useEffect, useRef, useCallback } from 'react';

// Simple green phosphor rendering for IR mode
// The real low-light brightness comes from camera hardware constraints, not post-processing
export function useNightVision({ videoRef, canvasRef, enabled }) {
  const rafRef = useRef(null);

  const processFrame = useCallback(() => {
    const video = videoRef.current;
    const canvas = canvasRef?.current;
    if (!canvas || !video || video.readyState < 2 || !video.videoWidth) {
      rafRef.current = requestAnimationFrame(processFrame);
      return;
    }

    const W = Math.floor(video.videoWidth / 2);
    const H = Math.floor(video.videoHeight / 2);
    if (canvas.width !== W) canvas.width = W;
    if (canvas.height !== H) canvas.height = H;

    const ctx = canvas.getContext('2d', { willReadFrequently: true });
    ctx.drawImage(video, 0, 0, W, H);
    const imgData = ctx.getImageData(0, 0, W, H);
    const d = imgData.data;

    // Convert to green phosphor — classic night vision look
    // Preserve luminance but render as monochrome green
    for (let i = 0; i < d.length; i += 4) {
      const luma = 0.299 * d[i] + 0.587 * d[i + 1] + 0.114 * d[i + 2];
      d[i]     = 0;
      d[i + 1] = luma;
      d[i + 2] = 0;
    }

    ctx.putImageData(imgData, 0, 0);
    rafRef.current = requestAnimationFrame(processFrame);
  }, [videoRef, canvasRef]);

  useEffect(() => {
    if (!enabled) {
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
      return;
    }
    rafRef.current = requestAnimationFrame(processFrame);
    return () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
    };
  }, [enabled, processFrame]);
}
