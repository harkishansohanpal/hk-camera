import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useConnectionStats } from './useConnectionStats';

function createMockStatsReport(overrides = {}) {
  const stats = new Map();
  const base = {
    type: 'remote-inbound-rtp',
    kind: 'video',
    roundTripTime: 0.05,
    jitter: 0.008,
    packetsLost: 2,
    packetsReceived: 200,
    timestamp: 1000000,
    ...overrides,
  };
  stats.set('inbound', base);
  return stats;
}

function createMockPC(statsReport) {
  return {
    connectionState: 'connected',
    getStats: vi.fn().mockResolvedValue(statsReport),
  };
}

describe('useConnectionStats', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('returns null metrics when not enabled', async () => {
    const pcRef = { current: createMockPC(createMockStatsReport()) };
    const { result } = renderHook(() => useConnectionStats(pcRef, { enabled: false }));
    expect(result.current.metrics).toBeNull();
  });

  it('poll q and parses RTT/jitter/packet loss from stats', async () => {
    const report = createMockStatsReport({
      roundTripTime: 0.05,
      jitter: 0.008,
      packetsLost: 2,
      packetsReceived: 200,
    });
    const pcRef = { current: createMockPC(report) };

    const { result } = renderHook(() => useConnectionStats(pcRef, { enabled: true }));

    // Fast-forward past the first poll interval
    await act(async () => { vi.advanceTimersByTime(5000); });
    await act(async () => { vi.advanceTimersByTime(0); }); // flush promises

    const m = result.current.metrics;
    expect(m).not.toBeNull();
    expect(m.rtt).toBe(50); // 0.05 * 1000
    expect(m.jitter).toBe(8); // 0.008 * 1000
    expect(m.packetLossRatio).toBeCloseTo(2 / 202, 4);
    expect(m.packetsLost).toBe(2);
    expect(m.packetsReceived).toBe(200);
  });

  it('handles pc not connected gracefully', async () => {
    const pcRef = { current: { connectionState: 'disconnected', getStats: vi.fn() } };
    const { result } = renderHook(() => useConnectionStats(pcRef, { enabled: true }));
    await act(async () => { vi.advanceTimersByTime(5000); });
    expect(result.current.metrics).toBeNull();
  });

  it('handles getStats throwing', async () => {
    const pcRef = {
      current: {
        connectionState: 'connected',
        getStats: vi.fn().mockRejectedValue(new Error('stats error')),
      },
    };
    const { result } = renderHook(() => useConnectionStats(pcRef, { enabled: true }));
    await act(async () => { vi.advanceTimersByTime(5000); });
    expect(result.current.metrics).toBeNull();
  });
});
