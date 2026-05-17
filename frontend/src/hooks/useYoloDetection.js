import { useState, useRef, useCallback } from 'react';

const SAMPLE_INTERVAL_MS = 500;
const YOLO_CLASSES = [
  'person', 'bicycle', 'car', 'motorcycle', 'airplane', 'bus', 'train', 'truck', 'boat',
  'traffic light', 'fire hydrant', 'stop sign', 'parking meter', 'bench', 'bird', 'cat',
  'dog', 'horse', 'sheep', 'cow', 'elephant', 'bear', 'zebra', 'giraffe', 'backpack',
  'umbrella', 'handbag', 'tie', 'suitcase', 'frisbee', 'skis', 'snowboard', 'sports ball',
  'kite', 'baseball bat', 'baseball glove', 'skateboard', 'surfboard', 'tennis racket',
  'bottle', 'wine glass', 'cup', 'fork', 'knife', 'spoon', 'bowl', 'banana', 'apple',
  'sandwich', 'orange', 'broccoli', 'carrot', 'hot dog', 'pizza', 'donut', 'cake',
  'chair', 'couch', 'potted plant', 'bed', 'dining table', 'toilet', 'tv', 'laptop',
  'mouse', 'remote', 'keyboard', 'cell phone', 'microwave', 'oven', 'toaster', 'sink',
  'refrigerator', 'book', 'clock', 'vase', 'scissors', 'teddy bear', 'hair drier', 'toothbrush',
];

const INTERESTING_CLASSES = new Set([
  'person', 'bicycle', 'car', 'motorcycle', 'bus', 'truck', 'dog', 'cat',
  'horse', 'sheep', 'cow', 'bear', 'bird',
]);

const MODEL_URL = '/models/yolov8n.onnx';

let ortInstance = null;

const WASM_CDN = 'https://cdn.jsdelivr.net/npm/onnxruntime-web@1.26.0/dist/';

async function getOrt() {
  if (!ortInstance) {
    ortInstance = await import('onnxruntime-web');
    ortInstance.env.wasm.wasmPaths = WASM_CDN;
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
      executionProviders: ['webgl', 'wasm'],
      graphOptimizationLevel: 'all',
    });
    return modelSession;
  })();

  return modelLoadPromise;
}

function preprocessFrame(video, width, height) {
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d');
  ctx.drawImage(video, 0, 0, width, height);
  const imageData = ctx.getImageData(0, 0, width, height).data;

  const input = new Float32Array(3 * height * width);
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const pixel = y * width + x;
      const idx = pixel * 4;
      input[0 * height * width + y * width + x] = imageData[idx] / 255.0;
      input[1 * height * width + y * width + x] = imageData[idx + 1] / 255.0;
      input[2 * height * width + y * width + x] = imageData[idx + 2] / 255.0;
    }
  }
  return input;
}

const INPUT_SIZE = 640;

function parseDetections(output, confidenceThreshold, imgWidth, imgHeight) {
  const [rows, cols] = [output[0].dims[2], output[0].dims[1]];
  const data = output[0].data;
  const scaleX = imgWidth / INPUT_SIZE;
  const scaleY = imgHeight / INPUT_SIZE;
  const detections = [];

  for (let i = 0; i < rows; i++) {
    const offset = i * cols;
    const scores = [];
    for (let j = 4; j < cols; j++) {
      scores.push(data[offset + j]);
    }
    const maxScore = Math.max(...scores);
    const classId = scores.indexOf(maxScore);
    if (maxScore < confidenceThreshold / 100) continue;

    const x = (data[offset] - data[offset + 2] / 2) * scaleX;
    const y = (data[offset + 1] - data[offset + 3] / 2) * scaleY;
    const w = data[offset + 2] * scaleX;
    const h = data[offset + 3] * scaleY;

    detections.push({
      class: YOLO_CLASSES[classId] || 'unknown',
      classId,
      confidence: maxScore,
      box: { x, y, w, h },
      interesting: INTERESTING_CLASSES.has(YOLO_CLASSES[classId]),
    });
  }

  return detections;
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

    const input = preprocessFrame(video, INPUT_SIZE, INPUT_SIZE);
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
