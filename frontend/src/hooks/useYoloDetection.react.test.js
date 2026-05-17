import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';

// ── Hoisted mocks (run before all imports) ──────────────────────

const { mockSession, mockOrt, mockPreprocessFrame, mockParseDetections } =
  vi.hoisted(() => {
    const session = {
      run: vi
        .fn()
        .mockResolvedValue({
          output0: { dims: [1, 84, 1], data: new Float32Array(84) },
        }),
    };

    return {
      mockSession: session,
      mockOrt: {
        InferenceSession: { create: vi.fn().mockResolvedValue(session) },
        Tensor: vi.fn(function MockTensor(type, data, dims) {
          this.type = type;
          this.data = data;
          this.dims = dims;
        }),
        env: { wasm: { wasmPaths: '', numThreads: 0 } },
      },
      mockPreprocessFrame: vi.fn().mockReturnValue(
        new Float32Array(3 * 640 * 640),
      ),
      mockParseDetections: vi.fn().mockReturnValue([]),
    };
  });

vi.mock('onnxruntime-web', () => mockOrt);

vi.mock('../ml/detection', () => ({
  YOLO_CLASSES: [],
  INTERESTING_CLASSES: new Set(),
  INPUT_SIZE: 640,
  preprocessFrame: mockPreprocessFrame,
  parseDetections: mockParseDetections,
}));

// ── Helpers ─────────────────────────────────────────────────────

function makeVideoElement() {
  const video = document.createElement('video');
  Object.defineProperties(video, {
    readyState: { value: 4, writable: true },
    videoWidth: { value: 1280, writable: true },
    videoHeight: { value: 720, writable: true },
  });
  return video;
}

function mockCanvas() {
  const origCreateElement = document.createElement.bind(document);
  const spy = vi
    .spyOn(document, 'createElement')
    .mockImplementation(function mockCreateElement(tag) {
      if (tag === 'canvas') {
        const pixels = new Uint8ClampedArray(640 * 640 * 4);
        const ctx = {
          drawImage: vi.fn(),
          getImageData: vi.fn(() => ({
            data: pixels,
            width: 640,
            height: 640,
          })),
        };
        return /** @type {any} */ ({
          width: 0,
          height: 0,
          getContext: vi.fn(() => ctx),
          toDataURL: vi.fn(() => 'data:image/jpeg;base64,mocked'),
        });
      }
      return origCreateElement(tag);
    });
  return spy;
}

async function importHook() {
  vi.resetModules();
  const mod = await import('./useYoloDetection');
  return mod.useYoloDetection;
}

// ── Tests ───────────────────────────────────────────────────────

describe('useYoloDetection - model loading', () => {
  let createElementSpy;

  beforeEach(() => {
    vi.useFakeTimers();
    createElementSpy = mockCanvas();
    mockOrt.InferenceSession.create.mockReset();
    mockOrt.Tensor.mockClear();
    mockPreprocessFrame.mockClear();
    mockParseDetections.mockClear();
    mockSession.run.mockClear();
  });

  afterEach(() => {
    vi.restoreAllMocks();
    vi.useRealTimers();
  });

  it('sets loadingError when model fails to load', async () => {
    mockOrt.InferenceSession.create.mockRejectedValue(
      new Error('Failed to fetch model'),
    );
    const useYoloDetection = await importHook();

    const videoRef = { current: makeVideoElement() };
    const { result } = renderHook(() => useYoloDetection({ videoRef }));

    await act(async () => {
      await result.current.startDetection();
    });

    expect(result.current.loadingError).toBe('Failed to fetch model');
    expect(result.current.isDetecting).toBe(false);
    expect(result.current.modelLoaded).toBe(false);
  });

  it('loads model successfully on first call', async () => {
    mockOrt.InferenceSession.create.mockResolvedValue(mockSession);
    const useYoloDetection = await importHook();

    const videoRef = { current: makeVideoElement() };
    const { result } = renderHook(() => useYoloDetection({ videoRef }));

    await act(async () => {
      await result.current.startDetection();
    });

    expect(result.current.loadingError).toBeNull();
    expect(result.current.modelLoaded).toBe(true);
    expect(result.current.isDetecting).toBe(true);
    expect(mockOrt.InferenceSession.create).toHaveBeenCalledTimes(1);
  });

  it('sets loadingError when model is not found (404)', async () => {
    mockOrt.InferenceSession.create.mockRejectedValue(
      new Error('Failed to fetch'),
    );
    const useYoloDetection = await importHook();

    const videoRef = { current: makeVideoElement() };
    const { result } = renderHook(() => useYoloDetection({ videoRef }));

    await act(async () => {
      await result.current.startDetection();
    });

    expect(result.current.loadingError).toBe('Failed to fetch');
  });
});

describe('useYoloDetection - lifecycle', () => {

  beforeEach(() => {
    vi.useFakeTimers();
    mockCanvas();
    mockOrt.InferenceSession.create.mockReset();
    mockOrt.InferenceSession.create.mockResolvedValue(mockSession);
    mockPreprocessFrame.mockClear();
    mockPreprocessFrame.mockReturnValue(new Float32Array(3 * 640 * 640));
    mockParseDetections.mockClear();
    mockParseDetections.mockReturnValue([]);
    mockSession.run.mockClear();
    mockSession.run.mockResolvedValue({
      output0: { dims: [1, 84, 1], data: new Float32Array(84) },
    });
  });

  afterEach(() => {
    vi.restoreAllMocks();
    vi.useRealTimers();
  });

  it('starts interval after loading model', async () => {
    const useYoloDetection = await importHook();
    const videoRef = { current: makeVideoElement() };
    const { result } = renderHook(() => useYoloDetection({ videoRef }));

    await act(async () => {
      await result.current.startDetection();
    });

    expect(result.current.isDetecting).toBe(true);
    expect(mockOrt.InferenceSession.create).toHaveBeenCalledTimes(1);
  });

  it('calls analyseFrame on each interval tick', async () => {
    const useYoloDetection = await importHook();
    const videoRef = { current: makeVideoElement() };
    const { result } = renderHook(() => useYoloDetection({ videoRef }));

    await act(async () => {
      await result.current.startDetection();
    });

    await act(async () => {
      vi.advanceTimersByTime(500);
    });

    expect(mockPreprocessFrame).toHaveBeenCalled();
    expect(mockSession.run).toHaveBeenCalled();
    expect(mockParseDetections).toHaveBeenCalled();
  });

  it('does not run analyseFrame if video is not ready', async () => {
    const useYoloDetection = await importHook();
    const video = makeVideoElement();
    Object.defineProperty(video, 'readyState', { value: 0 });
    const videoRef = { current: video };
    const { result } = renderHook(() => useYoloDetection({ videoRef }));

    await act(async () => {
      await result.current.startDetection();
    });

    await act(async () => {
      vi.advanceTimersByTime(500);
    });

    expect(mockSession.run).not.toHaveBeenCalled();
  });

  it('stops the interval when stopDetection is called', async () => {
    const useYoloDetection = await importHook();
    const videoRef = { current: makeVideoElement() };
    const { result } = renderHook(() => useYoloDetection({ videoRef }));

    await act(async () => {
      await result.current.startDetection();
    });

    expect(result.current.isDetecting).toBe(true);

    act(() => {
      result.current.stopDetection();
    });

    expect(result.current.isDetecting).toBe(false);

    mockPreprocessFrame.mockClear();
    await act(async () => {
      vi.advanceTimersByTime(2000);
    });

    expect(mockPreprocessFrame).not.toHaveBeenCalled();
  });

  it('is idempotent: starting twice does not create two intervals', async () => {
    const useYoloDetection = await importHook();
    const videoRef = { current: makeVideoElement() };
    const { result } = renderHook(() => useYoloDetection({ videoRef }));

    await act(async () => {
      await result.current.startDetection();
    });

    await act(async () => {
      await result.current.startDetection();
    });

    expect(mockOrt.InferenceSession.create).toHaveBeenCalledTimes(1);
  });

  it('calls onDetection with detections from each frame', async () => {
    const onDetection = vi.fn();
    mockParseDetections.mockReturnValue([
      {
        class: 'person',
        confidence: 0.95,
        interesting: true,
        box: { x: 0, y: 0, w: 0.1, h: 0.2 },
      },
    ]);

    const useYoloDetection = await importHook();
    const videoRef = { current: makeVideoElement() };
    const { result } = renderHook(() =>
      useYoloDetection({ videoRef, onDetection }),
    );

    await act(async () => {
      await result.current.startDetection();
    });

    await act(async () => {
      vi.advanceTimersByTime(500);
    });

    expect(onDetection).toHaveBeenCalledWith([
      expect.objectContaining({ class: 'person', confidence: 0.95 }),
    ]);
  });

  it('calls onMotion with interesting detections after cooldown', async () => {
    const onMotion = vi.fn();

    mockParseDetections.mockReturnValue([
      {
        class: 'person',
        confidence: 0.95,
        interesting: true,
        box: { x: 0, y: 0, w: 0.1, h: 0.2 },
      },
    ]);

    const useYoloDetection = await importHook();
    const videoRef = { current: makeVideoElement() };
    const { result } = renderHook(() =>
      useYoloDetection({ videoRef, onMotion, cooldownMs: 3000 }),
    );

    await act(async () => {
      await result.current.startDetection();
    });

    // First tick → triggers onMotion
    await act(async () => {
      vi.advanceTimersByTime(500);
    });
    expect(onMotion).toHaveBeenCalledTimes(1);
    expect(onMotion).toHaveBeenCalledWith({
      detections: [expect.objectContaining({ class: 'person' })],
      thumbnail: expect.any(String),
    });

    // Second tick immediately after → should NOT trigger (cooldown)
    await act(async () => {
      vi.advanceTimersByTime(500);
    });
    expect(onMotion).toHaveBeenCalledTimes(1);

    // After cooldown expires → triggers again
    await act(async () => {
      vi.advanceTimersByTime(3000);
    });
    expect(onMotion).toHaveBeenCalledTimes(2);
  });

  it('does not call onMotion for uninteresting detections', async () => {
    const onMotion = vi.fn();

    mockParseDetections.mockReturnValue([
      {
        class: 'chair',
        confidence: 0.9,
        interesting: false,
        box: { x: 0, y: 0, w: 0.1, h: 0.2 },
      },
    ]);

    const useYoloDetection = await importHook();
    const videoRef = { current: makeVideoElement() };
    const { result } = renderHook(() =>
      useYoloDetection({ videoRef, onMotion }),
    );

    await act(async () => {
      await result.current.startDetection();
    });

    await act(async () => {
      vi.advanceTimersByTime(1500);
    });

    expect(onMotion).not.toHaveBeenCalled();
  });
});
