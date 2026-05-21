export const YOLO_CLASSES = [
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

export const INTERESTING_CLASSES = new Set([
  'person', 'car',
  ...ANIMAL_CLASSES,
]);

const DISPLAY_NAME = {};
for (const a of ANIMAL_CLASSES) DISPLAY_NAME[a] = 'animal';

export const INPUT_SIZE = 640;

export function preprocessFrame(video) {
  const canvas = document.createElement('canvas');
  canvas.width = INPUT_SIZE;
  canvas.height = INPUT_SIZE;
  const ctx = canvas.getContext('2d');
  ctx.drawImage(video, 0, 0, INPUT_SIZE, INPUT_SIZE);
  const imageData = ctx.getImageData(0, 0, INPUT_SIZE, INPUT_SIZE).data;

  const input = new Float32Array(3 * INPUT_SIZE * INPUT_SIZE);
  for (let y = 0; y < INPUT_SIZE; y++) {
    for (let x = 0; x < INPUT_SIZE; x++) {
      const pixel = y * INPUT_SIZE + x;
      const idx = pixel * 4;
      input[0 * INPUT_SIZE * INPUT_SIZE + y * INPUT_SIZE + x] = imageData[idx] / 255.0;
      input[1 * INPUT_SIZE * INPUT_SIZE + y * INPUT_SIZE + x] = imageData[idx + 1] / 255.0;
      input[2 * INPUT_SIZE * INPUT_SIZE + y * INPUT_SIZE + x] = imageData[idx + 2] / 255.0;
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

export function parseDetections(output, confidenceThreshold, imgWidth, imgHeight) {
  const tensor = output.dims ? output : output[0];
  let [, d1, d2] = tensor.dims;
  // Handle transposed output [1, 8400, 84] → [1, 84, 8400]
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
      class: DISPLAY_NAME[className] || className,
      classId,
      confidence: maxScore,
      box: { x, y, w, h },
      interesting: INTERESTING_CLASSES.has(className),
    });
  }

  return nonMaxSuppression(detections, 0.4);
}
