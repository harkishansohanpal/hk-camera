const fs = require('fs');
const path = require('path');
const ort = require('onnxruntime-node');

const MODEL_PATH = path.resolve(__dirname, '..', '..', 'models', 'yolo11m.onnx');
const INPUT_SIZE = 640;

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

const ANIMAL_CLASSES = new Set([
  'bird', 'cat', 'dog', 'horse', 'sheep', 'cow', 'elephant',
  'bear', 'zebra', 'giraffe',
]);

const INTERESTING_CLASSES = new Set(['person', 'car', ...ANIMAL_CLASSES]);

const ANIMAL_DISPLAY = {};
for (const a of ANIMAL_CLASSES) ANIMAL_DISPLAY[a] = 'animal';

let session = null;
let modelLoadPromise = null;

async function loadModel() {
  if (session) return session;
  if (modelLoadPromise) return modelLoadPromise;
  modelLoadPromise = (async () => {
    if (!fs.existsSync(MODEL_PATH)) {
      throw new Error(`Model not found at ${MODEL_PATH}`);
    }
    session = await ort.InferenceSession.create(MODEL_PATH, {
      executionProviders: ['cpu'],
      graphOptimizationLevel: 'all',
    });
    return session;
  })();
  return modelLoadPromise;
}

async function preprocess(buffer) {
  const sharp = require('sharp');
  const resized = await sharp(buffer)
    .resize(INPUT_SIZE, INPUT_SIZE, { fit: 'fill' })
    .raw()
    .toBuffer();

  const input = new Float32Array(3 * INPUT_SIZE * INPUT_SIZE);
  for (let y = 0; y < INPUT_SIZE; y++) {
    for (let x = 0; x < INPUT_SIZE; x++) {
      const pixel = (y * INPUT_SIZE + x) * 3;
      input[0 * INPUT_SIZE * INPUT_SIZE + y * INPUT_SIZE + x] = resized[pixel] / 255.0;
      input[1 * INPUT_SIZE * INPUT_SIZE + y * INPUT_SIZE + x] = resized[pixel + 1] / 255.0;
      input[2 * INPUT_SIZE * INPUT_SIZE + y * INPUT_SIZE + x] = resized[pixel + 2] / 255.0;
    }
  }
  return input;
}

function computeIoU(a, b) {
  const ax = a.box.x, ay = a.box.y, aw = a.box.w, ah = a.box.h;
  const bx = b.box.x, by = b.box.y, bw = b.box.w, bh = b.box.h;
  const x1 = Math.max(ax, bx), y1 = Math.max(ay, by);
  const x2 = Math.min(ax + aw, bx + bw), y2 = Math.min(ay + ah, by + bh);
  const inter = Math.max(0, x2 - x1) * Math.max(0, y2 - y1);
  const union = aw * ah + bw * bh - inter;
  return inter / union;
}

function nonMaxSuppression(detections, iouThreshold) {
  const sorted = [...detections].sort((a, b) => b.confidence - a.confidence);
  const keep = [];
  while (sorted.length) {
    const best = sorted.shift();
    keep.push(best);
    for (let i = sorted.length - 1; i >= 0; i--) {
      if (sorted[i].classId === best.classId && computeIoU(best, sorted[i]) > iouThreshold) {
        sorted.splice(i, 1);
      }
    }
  }
  return keep;
}

function parseDetections(output, confidenceThreshold, imgWidth = 640, imgHeight = 480) {
  const tensor = output.dims ? output : output[0];
  let [, d1, d2] = tensor.dims;
  if (d1 === 8400 && d2 === 84) [d1, d2] = [d2, d1];
  const cols = d1, rows = d2;
  const data = tensor.data;
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
    const className = YOLO_CLASSES[classId] || 'unknown';

    detections.push({
      class: ANIMAL_DISPLAY[className] || className,
      classId,
      confidence: Math.round(maxScore * 10000) / 10000,
      box: { x, y, w, h },
      interesting: INTERESTING_CLASSES.has(className),
    });
  }

  return nonMaxSuppression(detections, 0.4);
}

async function detect(buffer, { confidenceThreshold = 80, imgWidth, imgHeight } = {}) {
  const sess = await loadModel();
  const input = await preprocess(buffer);
  const tensor = new ort.Tensor('float32', input, [1, 3, INPUT_SIZE, INPUT_SIZE]);
  const feeds = { images: tensor };
  const results = await sess.run(feeds);
  const output = results.output0 || results[Object.keys(results)[0]];
  return parseDetections(output, confidenceThreshold, imgWidth, imgHeight);
}

module.exports = { detect, loadModel };
