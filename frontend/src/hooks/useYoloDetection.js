import { useState, useRef, useCallback } from 'react';
import { YOLO_CLASSES, INTERESTING_CLASSES, INPUT_SIZE, preprocessFrame, parseDetections } from '../ml/detection';

const SAMPLE_INTERVAL_MS = 500;
const MODEL_URL = '/models/yolov8n.onnx';

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
    const ort = await getOrt();
    modelSession = await ort.InferenceSession.create(MODEL_URL, {
      executionProviders: ['wasm'],
      graphOptimizationLevel: 'all',
    });
    return modelSession;
  })();

  return modelLoadPromise;
}



export function useYoloDetection({ videoRef, confidence = 50, onDetection, onMotion, cooldownMs = 3000 }) {
  const [isDetecting, setIsDetecting] = useState(false);
  const [modelLoaded, setModelLoaded] = useState(false);
  const [loadingError, setLoadingError] = useState(null);
  const intervalRef = useRef(null);
  const lastAlertRef = useRef(0);
  const canvasRef = useRef(null);

  const analyseFrame = useCallback(async () => {
    const video = videoRef.current;
    if (!video || video.readyState < 2) return;

    const session = modelSession;
    if (!session) return;

    const imgWidth = video.videoWidth || 640;
    const imgHeight = video.videoHeight || 480;

    const input = preprocessFrame(video);
    const tensor = new (await getOrt()).Tensor('float32', input, [1, 3, INPUT_SIZE, INPUT_SIZE]);

    const feeds = { images: tensor };
    const results = await session.run(feeds);
    const output = results.output0 || results[Object.keys(results)[0]];

    const detections = parseDetections(output, confidence, imgWidth, imgHeight);

    onDetection?.(detections);

    const interesting = detections.filter((d) => d.interesting);
    if (interesting.length > 0) {
      const now = Date.now();
      if (now - lastAlertRef.current > cooldownMs) {
        lastAlertRef.current = now;

        const thumbCanvas = document.createElement('canvas');
        thumbCanvas.width = video.videoWidth || 640;
        thumbCanvas.height = video.videoHeight || 480;
        thumbCanvas.getContext('2d').drawImage(video, 0, 0);
        const thumbnail = thumbCanvas.toDataURL('image/jpeg', 0.7);

        onMotion?.({ detections: interesting, thumbnail });
      }
    }
  }, [videoRef, confidence, onDetection, onMotion, cooldownMs]);

  const startDetection = useCallback(async () => {
    if (intervalRef.current) return;
    try {
      await loadModel();
      setModelLoaded(true);
      setLoadingError(null);
    } catch (err) {
      setLoadingError(err.message);
      return;
    }
    lastAlertRef.current = 0;
    intervalRef.current = setInterval(analyseFrame, SAMPLE_INTERVAL_MS);
    setIsDetecting(true);
  }, [analyseFrame]);

  const stopDetection = useCallback(() => {
    clearInterval(intervalRef.current);
    intervalRef.current = null;
    setIsDetecting(false);
  }, []);

  return { startDetection, stopDetection, isDetecting, modelLoaded, loadingError };
}
