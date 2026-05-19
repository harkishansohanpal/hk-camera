import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';

const mockDetect = vi.fn();

vi.mock('../services/api', () => ({
  detectAPI: {
    detect: mockDetect,
  },
}));

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
  return vi.spyOn(document, 'createElement').mockImplementation((tag) => {
    if (tag === 'canvas') {
      const ctx = { drawImage: vi.fn() };
      return {
        width: 0,
        height: 0,
        getContext: vi.fn(() => ctx),
        toDataURL: vi.fn(() => 'data:image/jpeg;base64,mocked'),
      };
    }
    return origCreateElement(tag);
  });
}

async function importHook() {
  vi.resetModules();
  const mod = await import('./useYoloDetection');
  return mod.useYoloDetection;
}

describe('useYoloDetection - backend API', () => {
  const INTERVAL_MS = 3000;

  beforeEach(() => {
    vi.useFakeTimers();
    mockCanvas();
    mockDetect.mockReset();
    mockDetect.mockResolvedValue({
      data: {
        data: { detections: [], count: 0, interestingCount: 0 },
      },
    });
  });

  afterEach(() => {
    vi.restoreAllMocks();
    vi.useRealTimers();
  });

  it('starts detection immediately without model loading', async () => {
    const useYoloDetection = await importHook();
    const videoRef = { current: makeVideoElement() };
    const { result } = renderHook(() => useYoloDetection({ videoRef }));

    await act(async () => { await result.current.startDetection(); });

    expect(result.current.isDetecting).toBe(true);
    expect(result.current.modelLoaded).toBe(true);
    expect(result.current.loadingError).toBeNull();
  });

  it('calls detect API on each interval tick', async () => {
    const useYoloDetection = await importHook();
    const videoRef = { current: makeVideoElement() };
    const { result } = renderHook(() => useYoloDetection({ videoRef }));

    await act(async () => { await result.current.startDetection(); });
    await act(async () => { vi.advanceTimersByTime(INTERVAL_MS); });

    expect(mockDetect).toHaveBeenCalledTimes(1);
  });

  it('does not call detect if video is not ready', async () => {
    const useYoloDetection = await importHook();
    const video = makeVideoElement();
    Object.defineProperty(video, 'readyState', { value: 0 });
    const videoRef = { current: video };
    const { result } = renderHook(() => useYoloDetection({ videoRef }));

    await act(async () => { await result.current.startDetection(); });
    await act(async () => { vi.advanceTimersByTime(INTERVAL_MS); });

    expect(mockDetect).not.toHaveBeenCalled();
  });

  it('stops the interval when stopDetection is called', async () => {
    const useYoloDetection = await importHook();
    const videoRef = { current: makeVideoElement() };
    const { result } = renderHook(() => useYoloDetection({ videoRef }));

    await act(async () => { await result.current.startDetection(); });
    expect(result.current.isDetecting).toBe(true);
    act(() => { result.current.stopDetection(); });
    expect(result.current.isDetecting).toBe(false);

    mockDetect.mockClear();
    await act(async () => { vi.advanceTimersByTime(INTERVAL_MS + 1000); });
    expect(mockDetect).not.toHaveBeenCalled();
  });

  it('is idempotent: starting twice does not create two intervals', async () => {
    const useYoloDetection = await importHook();
    const videoRef = { current: makeVideoElement() };
    const { result } = renderHook(() => useYoloDetection({ videoRef }));

    await act(async () => { await result.current.startDetection(); });
    await act(async () => { await result.current.startDetection(); });

    await act(async () => { vi.advanceTimersByTime(INTERVAL_MS); });
    expect(mockDetect).toHaveBeenCalledTimes(1);
  });

  it('calls onDetection with detections from API response', async () => {
    const onDetection = vi.fn();
    mockDetect.mockResolvedValue({
      data: {
        data: {
          detections: [
            { class: 'person', confidence: 0.95, interesting: true, box: { x: 0, y: 0, w: 0.1, h: 0.2 } },
          ],
          count: 1,
          interestingCount: 1,
        },
      },
    });

    const useYoloDetection = await importHook();
    const videoRef = { current: makeVideoElement() };
    const { result } = renderHook(() => useYoloDetection({ videoRef, onDetection }));

    await act(async () => { await result.current.startDetection(); });
    await act(async () => { vi.advanceTimersByTime(INTERVAL_MS); });

    expect(onDetection).toHaveBeenCalledWith([
      expect.objectContaining({ class: 'person', confidence: 0.95 }),
    ]);
  });

  it('calls onMotion with interesting detections after cooldown', async () => {
    const onMotion = vi.fn();
    mockDetect.mockResolvedValue({
      data: {
        data: {
          detections: [
            { class: 'person', confidence: 0.95, interesting: true, box: { x: 0, y: 0, w: 0.1, h: 0.2 } },
          ],
          count: 1,
          interestingCount: 1,
        },
      },
    });

    const useYoloDetection = await importHook();
    const videoRef = { current: makeVideoElement() };
    const { result } = renderHook(() => useYoloDetection({ videoRef, onMotion, cooldownMs: 3000 }));

    await act(async () => { await result.current.startDetection(); });

    await act(async () => { vi.advanceTimersByTime(INTERVAL_MS); });
    expect(onMotion).toHaveBeenCalledTimes(1);

    await act(async () => { vi.advanceTimersByTime(INTERVAL_MS); });
    expect(onMotion).toHaveBeenCalledTimes(1);

    await act(async () => { vi.advanceTimersByTime(INTERVAL_MS); });
    expect(onMotion).toHaveBeenCalledTimes(2);
  });

  it('does not call onMotion for uninteresting detections', async () => {
    const onMotion = vi.fn();
    mockDetect.mockResolvedValue({
      data: {
        data: {
          detections: [
            { class: 'chair', confidence: 0.9, interesting: false, box: { x: 0, y: 0, w: 0.1, h: 0.2 } },
          ],
          count: 1,
          interestingCount: 0,
        },
      },
    });

    const useYoloDetection = await importHook();
    const videoRef = { current: makeVideoElement() };
    const { result } = renderHook(() => useYoloDetection({ videoRef, onMotion }));

    await act(async () => { await result.current.startDetection(); });
    await act(async () => { vi.advanceTimersByTime(INTERVAL_MS); });

    expect(onMotion).not.toHaveBeenCalled();
  });

  it('sets inferenceError when API call fails', async () => {
    mockDetect.mockRejectedValue(new Error('Network error'));

    const useYoloDetection = await importHook();
    const videoRef = { current: makeVideoElement() };
    const { result } = renderHook(() => useYoloDetection({ videoRef }));

    await act(async () => { await result.current.startDetection(); });
    await act(async () => { vi.advanceTimersByTime(INTERVAL_MS); });

    expect(result.current.inferenceError).toBe('Network error');
  });

  it('skips frame if previous request is still in flight', async () => {
    let resolveDetect;
    mockDetect.mockImplementation(() => new Promise((r) => { resolveDetect = r; }));

    const useYoloDetection = await importHook();
    const videoRef = { current: makeVideoElement() };
    const { result } = renderHook(() => useYoloDetection({ videoRef }));

    await act(async () => { await result.current.startDetection(); });
    await act(async () => { vi.advanceTimersByTime(INTERVAL_MS); });
    expect(mockDetect).toHaveBeenCalledTimes(1);

    mockDetect.mockClear();
    await act(async () => { vi.advanceTimersByTime(INTERVAL_MS); });
    expect(mockDetect).not.toHaveBeenCalled();

    await act(async () => { resolveDetect({ data: { data: { detections: [], count: 0, interestingCount: 0 } } }); });
    await vi.advanceTimersToNextTimerAsync();
    expect(mockDetect).toHaveBeenCalledTimes(1);
  });
});
