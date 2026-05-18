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

export const INTERESTING_CLASSES = new Set([
  'person', 'bicycle', 'car', 'motorcycle', 'bus', 'truck', 'dog', 'cat',
  'horse', 'sheep', 'cow', 'bear', 'bird',
]);

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

export function parseDetections(output, confidenceThreshold, imgWidth, imgHeight) {
  const tensor = output.dims ? output : output[0];
  const [rows, cols] = [tensor.dims[2], tensor.dims[1]];
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
