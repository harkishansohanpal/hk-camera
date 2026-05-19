import { useState, useRef, useCallback, useEffect } from 'react';
import { detectAPI } from '../services/api';

const SAMPLE_INTERVAL_MS = 3000;
const LOG_PREFIX = '[YOLO]';

export function useYoloDetection({ videoRef, confidence = 50, onDetection, onMotion, cooldownMs = 3000 }) {
  const [isDetecting, setIsDetecting] = useState(false);
  const [modelLoaded, setModelLoaded] = useState(true);
  const [loadingError, setLoadingError] = useState(null);
  const [inferenceError, setInferenceError] = useState(null);
  const intervalRef = useRef(null);
  const lastAlertRef = useRef(0);
  const busyRef = useRef(false);

  const paramsRef = useRef({ confidence, onDetection, onMotion, cooldownMs });
  useEffect(() => { paramsRef.current = { confidence, onDetection, onMotion, cooldownMs }; }, [confidence, onDetection, onMotion, cooldownMs]);

  const captureFrame = useCallback((video) => {
    const canvas = document.createElement('canvas');
    const w = video.videoWidth || 640;
    const h = video.videoHeight || 480;
    canvas.width = w;
    canvas.height = h;
    canvas.getContext('2d').drawImage(video, 0, 0, w, h);
    return canvas.toDataURL('image/jpeg', 0.35).split(',')[1];
  }, []);

  const analyseFrame = useCallback(async () => {
    if (busyRef.current) return;
    const video = videoRef.current;
    if (!video || video.readyState < 2) return;

    busyRef.current = true;
    try {
      const imgWidth = video.videoWidth || 640;
      const imgHeight = video.videoHeight || 480;
      const base64 = captureFrame(video);

      const { confidence: conf, onDetection: onDetect, onMotion: onMove, cooldownMs: coolMs } = paramsRef.current;

      const res = await detectAPI.detect({
        image: base64,
        width: imgWidth,
        height: imgHeight,
        confidenceThreshold: conf,
      });

      const detections = res.data.data.detections;

      if (detections.length > 0) {
        console.log(`${LOG_PREFIX} Frame: ${detections.length} detections (interesting: ${detections.filter(d => d.interesting).length})`);
      }
      onDetect?.(detections);

      const interesting = detections.filter((d) => d.interesting);
      if (interesting.length > 0) {
        const now = Date.now();
        if (now - lastAlertRef.current > coolMs) {
          lastAlertRef.current = now;

          const thumbCanvas = document.createElement('canvas');
          thumbCanvas.width = imgWidth;
          thumbCanvas.height = imgHeight;
          thumbCanvas.getContext('2d').drawImage(video, 0, 0);
          const thumbnail = thumbCanvas.toDataURL('image/jpeg', 0.35);

          console.log(`${LOG_PREFIX} Motion alert:`, interesting.map(d => `${d.class} (${(d.confidence * 100).toFixed(0)}%)`).join(', '));
          onMove?.({ detections: interesting, thumbnail });
        }
      }
    } catch (err) {
      console.error(`${LOG_PREFIX} Detection error:`, err.message);
      setInferenceError(err.message);
    } finally {
      busyRef.current = false;
    }
  }, [videoRef, captureFrame]);

  const startDetection = useCallback(async () => {
    if (intervalRef.current) return;
    console.log(`${LOG_PREFIX} Starting detection (backend)...`);
    setModelLoaded(true);
    setLoadingError(null);
    lastAlertRef.current = 0;
    setInferenceError(null);
    intervalRef.current = setInterval(analyseFrame, SAMPLE_INTERVAL_MS);
    setIsDetecting(true);
  }, [analyseFrame]);

  const stopDetection = useCallback(() => {
    clearInterval(intervalRef.current);
    intervalRef.current = null;
    setIsDetecting(false);
  }, []);

  return { startDetection, stopDetection, isDetecting, modelLoaded, loadingError, inferenceError };
}
