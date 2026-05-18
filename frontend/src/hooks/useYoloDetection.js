import { useState, useRef, useCallback, useEffect } from 'react';
import { YOLO_CLASSES, INTERESTING_CLASSES, INPUT_SIZE, preprocessFrame, parseDetections } from '../ml/detection';

const SAMPLE_INTERVAL_MS = 500;
const MODEL_URL = '/models/yolo11s.onnx';
const LOG_PREFIX = '[YOLO]';

let ortInstance = null;

const WASM_CDN = 'https://cdn.jsdelivr.net/npm/onnxruntime-web@1.26.0/dist/';

async function getOrt() {
  if (!ortInstance) {
    ortInstance = await import('onnxruntime-web');
    ortInstance.env.wasm.wasmPaths = WASM_CDN;
    ortInstance.env.wasm.numThreads = 1;
  }
  return ortInstance;
}

let modelSession = null;
let modelLoadPromise = null;

async function loadModel() {
  if (modelSession) return modelSession;
  if (modelLoadPromise) return modelLoadPromise;

  modelLoadPromise = (async () => {
    console.log(`${LOG_PREFIX} Loading model from ${MODEL_URL}...`);
    const ort = await getOrt();
    console.log(`${LOG_PREFIX} ONNX Runtime loaded, creating session...`);
    modelSession = await ort.InferenceSession.create(MODEL_URL, {
      executionProviders: ['wasm'],
      graphOptimizationLevel: 'all',
    });
    console.log(`${LOG_PREFIX} Model loaded successfully`);
    return modelSession;
  })();

  return modelLoadPromise;
}

export function useYoloDetection({ videoRef, confidence = 50, onDetection, onMotion, cooldownMs = 3000 }) {
  const [isDetecting, setIsDetecting] = useState(false);
  const [modelLoaded, setModelLoaded] = useState(false);
  const [loadingError, setLoadingError] = useState(null);
  const [inferenceError, setInferenceError] = useState(null);
  const intervalRef = useRef(null);
  const lastAlertRef = useRef(0);
  const canvasRef = useRef(null);

  const paramsRef = useRef({ confidence, onDetection, onMotion, cooldownMs });
  useEffect(() => { paramsRef.current = { confidence, onDetection, onMotion, cooldownMs }; }, [confidence, onDetection, onMotion, cooldownMs]);

  const analyseFrame = useCallback(async () => {
    const video = videoRef.current;
    if (!video || video.readyState < 2) return;

    const session = modelSession;
    if (!session) return;

    try {
      const imgWidth = video.videoWidth || 640;
      const imgHeight = video.videoHeight || 480;

      const input = preprocessFrame(video);
      const ort = await getOrt();
      const tensor = new ort.Tensor('float32', input, [1, 3, INPUT_SIZE, INPUT_SIZE]);

      const feeds = { images: tensor };
      const results = await session.run(feeds);
      const output = results.output0 || results[Object.keys(results)[0]];

      const { confidence: conf, onDetection: onDetect, onMotion: onMove, cooldownMs: coolMs } = paramsRef.current;
      const detections = parseDetections(output, conf, imgWidth, imgHeight);

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
          thumbCanvas.width = video.videoWidth || 640;
          thumbCanvas.height = video.videoHeight || 480;
          thumbCanvas.getContext('2d').drawImage(video, 0, 0);
          const thumbnail = thumbCanvas.toDataURL('image/jpeg', 0.7);

          console.log(`${LOG_PREFIX} Motion alert:`, interesting.map(d => `${d.class} (${(d.confidence*100).toFixed(0)}%)`).join(', '));
          onMove?.({ detections: interesting, thumbnail });
        }
      }
    } catch (err) {
      console.error(`${LOG_PREFIX} Inference error:`, err.message);
      setInferenceError(err.message);
    }
  }, [videoRef]);

  const startDetection = useCallback(async () => {
    if (intervalRef.current) return;
    console.log(`${LOG_PREFIX} Starting detection...`);
    try {
      await loadModel();
      setModelLoaded(true);
      setLoadingError(null);
      console.log(`${LOG_PREFIX} Model ready, starting analysis interval`);
    } catch (err) {
      console.error(`${LOG_PREFIX} Model load failed:`, err.message);
      setLoadingError(err.message);
      return;
    }
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
