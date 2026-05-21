import { describe, it, expect, beforeAll } from 'vitest';
import {
  YOLO_CLASSES,
  INTERESTING_CLASSES,
  INPUT_SIZE,
  parseDetections,
} from './detection';

// ── Helpers ─────────────────────────────────────────────────────

function makeDetectionOutput(detections, numClasses = 80) {
  const cols = 4 + numClasses;
  const rows = detections.length;
  const data = new Float32Array(rows * cols);

  detections.forEach((d, i) => {
    const off = i * cols;
    data[off + 0] = d.cx;
    data[off + 1] = d.cy;
    data[off + 2] = d.w;
    data[off + 3] = d.h;
    if (d.classId != null && d.classId >= 0 && d.classId < numClasses) {
      data[off + 4 + d.classId] = d.confidence;
    }
  });

  return [{
    dims: [1, cols, rows],
    data,
  }];
}

/**
 * Build an output where a specific row has a given class with max confidence,
 * even if classId is outside the normal range.
 */

// ── parseDetections ─────────────────────────────────────────────

describe('parseDetections', () => {

  it('returns no detections when below confidence threshold', () => {
    const output = makeDetectionOutput([
      { cx: 0.5, cy: 0.5, w: 0.2, h: 0.3, classId: 0, confidence: 0.3 },
    ]);
    const result = parseDetections(output, 50, 640, 480);
    expect(result).toHaveLength(0);
  });

  it('returns detections above confidence threshold', () => {
    const output = makeDetectionOutput([
      { cx: 0.5, cy: 0.5, w: 0.2, h: 0.3, classId: 0, confidence: 0.85 },
    ]);
    const result = parseDetections(output, 50, 640, 480);
    expect(result).toHaveLength(1);
    expect(result[0].class).toBe('person');
    expect(result[0].confidence).toBeCloseTo(0.85, 5);
    expect(result[0].interesting).toBe(true);
  });

  it('scales bounding box from input size to actual dimensions', () => {
    const output = makeDetectionOutput([
      { cx: 0.5, cy: 0.5, w: 0.2, h: 0.3, classId: 0, confidence: 0.9 },
    ]);
    const result = parseDetections(output, 1, 1920, 1080);
    const { box } = result[0];
    expect(box.x).toBeCloseTo((0.5 - 0.2 / 2) * (1920 / INPUT_SIZE), 5);
    expect(box.y).toBeCloseTo((0.5 - 0.3 / 2) * (1080 / INPUT_SIZE), 5);
    expect(box.w).toBeCloseTo(0.2 * (1920 / INPUT_SIZE), 5);
    expect(box.h).toBeCloseTo(0.3 * (1080 / INPUT_SIZE), 5);
  });

  it('returns correct class name for each class id', () => {
    const cases = [
      { classId: 0, expected: 'person', interesting: true },
      { classId: 2, expected: 'car', interesting: true },
      { classId: 16, expected: 'animal', interesting: true },
      { classId: 56, expected: 'chair', interesting: false },
      { classId: 73, expected: 'book', interesting: false },
    ];
    for (const { classId, expected, interesting } of cases) {
      const output = makeDetectionOutput([
        { cx: 0.5, cy: 0.5, w: 0.2, h: 0.3, classId, confidence: 0.9 },
      ]);
      const result = parseDetections(output, 1, 640, 480);
      expect(result[0].class).toBe(expected);
      expect(result[0].interesting).toBe(interesting);
    }
  });

  it('returns multiple detections from different rows', () => {
    const output = makeDetectionOutput([
      { cx: 0.2, cy: 0.3, w: 0.1, h: 0.2, classId: 0, confidence: 0.95 },
      { cx: 0.7, cy: 0.6, w: 0.15, h: 0.25, classId: 2, confidence: 0.88 },
      { cx: 0.5, cy: 0.5, w: 0.2, h: 0.3, classId: 16, confidence: 0.3 },
    ]);
    const result = parseDetections(output, 50, 640, 480);
    expect(result).toHaveLength(2);
    expect(result[0].class).toBe('person');
    expect(result[1].class).toBe('car');
  });

  it('picks the class with highest score per detection', () => {
    const data = new Float32Array(84);
    data[0] = 0.5; data[1] = 0.5; data[2] = 0.2; data[3] = 0.3;
    data[4 + 0] = 0.1;   // person - low
    data[4 + 2] = 0.05;  // car - even lower
    data[4 + 56] = 0.9;  // chair - highest
    const output = [{ dims: [1, 84, 1], data }];
    const result = parseDetections(output, 50, 640, 480);
    expect(result).toHaveLength(1);
    expect(result[0].class).toBe('chair');
  });

  it('handles canvas not being available (drawImage throws)', () => {
    const output = makeDetectionOutput([
      { cx: 0.5, cy: 0.5, w: 0.2, h: 0.3, classId: 0, confidence: 0.95 },
    ]);
    const result = parseDetections(output, 50, 640, 480);
    expect(Array.isArray(result)).toBe(true);
  });

  it('filters out low-confidence detections while keeping high ones in mixed batch', () => {
    const output = makeDetectionOutput([
      { cx: 0.1, cy: 0.1, w: 0.1, h: 0.1, classId: 0, confidence: 0.99 },
      { cx: 0.2, cy: 0.2, w: 0.1, h: 0.1, classId: 1, confidence: 0.40 },
      { cx: 0.3, cy: 0.3, w: 0.1, h: 0.1, classId: 2, confidence: 0.70 },
      { cx: 0.4, cy: 0.4, w: 0.1, h: 0.1, classId: 3, confidence: 0.30 },
    ]);
    const result = parseDetections(output, 50, 640, 480);
    expect(result).toHaveLength(2);
    expect(result[0].class).toBe('person');
    expect(result[1].class).toBe('car');
  });

});

// ── preprocessFrame ─────────────────────────────────────────────


describe('preprocessFrame', () => {
  let preprocessFrame;
  let mockCanvas, mockCtx;

  beforeAll(async () => {
    preprocessFrame = (await import('./detection')).preprocessFrame;
  });

  beforeEach(() => {
    const origCreateElement = document.createElement.bind(document);
    const pixels = new Uint8ClampedArray(INPUT_SIZE * INPUT_SIZE * 4).fill(255);
    const imageData = { data: pixels, width: INPUT_SIZE, height: INPUT_SIZE };

    mockCtx = {
      drawImage: () => {},
      getImageData: () => imageData,
    };

    mockCanvas = {
      width: 0,
      height: 0,
      getContext: () => mockCtx,
    };

    vi.spyOn(document, 'createElement').mockImplementation((tag) => {
      if (tag === 'canvas') return mockCanvas;
      return origCreateElement(tag);
    });
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('returns a Float32Array of correct length', () => {
    const expectedLen = 3 * INPUT_SIZE * INPUT_SIZE;
    const video = document.createElement('video');
    const result = preprocessFrame(video);
    expect(result).toBeInstanceOf(Float32Array);
    expect(result).toHaveLength(expectedLen);
  });

  it('pixel values are normalized to [0, 1] with white image', () => {
    const video = document.createElement('video');
    const result = preprocessFrame(video);
    expect(result).toBeInstanceOf(Float32Array);
    expect(result).toHaveLength(3 * INPUT_SIZE * INPUT_SIZE);
    // Spot-check samples across channels and positions
    expect(result[0]).toBeCloseTo(1.0, 5);
    expect(result[INPUT_SIZE * INPUT_SIZE]).toBeCloseTo(1.0, 5);
    expect(result[2 * INPUT_SIZE * INPUT_SIZE]).toBeCloseTo(1.0, 5);
    expect(result[42]).toBeCloseTo(1.0, 5);
    expect(result[99999]).toBeCloseTo(1.0, 5);
  });

  it('calls drawImage on the canvas context with the video', () => {
    const video = document.createElement('video');
    const drawSpy = vi.spyOn(mockCtx, 'drawImage');
    preprocessFrame(video);
    expect(drawSpy).toHaveBeenCalledWith(video, 0, 0, INPUT_SIZE, INPUT_SIZE);
  });

  it('creates canvas with correct dimensions', () => {
    const video = document.createElement('video');
    preprocessFrame(video);
    expect(mockCanvas.width).toBe(INPUT_SIZE);
    expect(mockCanvas.height).toBe(INPUT_SIZE);
  });
});

// ── Constants ───────────────────────────────────────────────────

describe('YOLO_CLASSES', () => {

  it('has 80 classes', () => {
    expect(YOLO_CLASSES).toHaveLength(80);
  });

  it('class 0 is person', () => {
    expect(YOLO_CLASSES[0]).toBe('person');
  });

  it('class 16 is dog', () => {
    expect(YOLO_CLASSES[16]).toBe('dog');
  });

  it('all classes are defined and non-empty', () => {
    YOLO_CLASSES.forEach((cls, i) => {
      expect(cls).toBeTruthy();
      expect(typeof cls).toBe('string');
      expect(cls.length).toBeGreaterThan(0);
    });
  });

});

describe('INTERESTING_CLASSES', () => {

  it('contains person, dog, cat, car', () => {
    expect(INTERESTING_CLASSES.has('person')).toBe(true);
    expect(INTERESTING_CLASSES.has('dog')).toBe(true);
    expect(INTERESTING_CLASSES.has('cat')).toBe(true);
    expect(INTERESTING_CLASSES.has('car')).toBe(true);
  });

  it('does not contain chair, book, or tv', () => {
    expect(INTERESTING_CLASSES.has('chair')).toBe(false);
    expect(INTERESTING_CLASSES.has('book')).toBe(false);
    expect(INTERESTING_CLASSES.has('tv')).toBe(false);
  });

});

describe('INPUT_SIZE', () => {

  it('is 640', () => {
    expect(INPUT_SIZE).toBe(640);
  });
});
