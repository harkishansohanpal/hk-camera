import { useEffect, useRef, useState, useCallback } from 'react';
import { logger } from '../lib/logger';

const TAG = 'ConnStats';
const POLL_MS = 5000;
const METRICS_LOG_INTERVAL_MS = 30000;

export function useConnectionStats(pcRef, { enabled = true } = {}) {
  const [metrics, setMetrics] = useState(null);
  const intervalRef = useRef(null);
  const logTimerRef = useRef(null);
  const prevBytesRef = useRef(null);

  const poll = useCallback(async () => {
    const pc = pcRef?.current;
    if (!pc || pc.connectionState !== 'connected') return;

    try {
      const report = await pc.getStats();
      let rtt = null;
      let jitter = null;
      let packetsLost = 0;
      let packetsReceived = 0;
      let framesPerSecond = null;
      let framesDecoded = null;
      let frameWidth = null;
      let frameHeight = null;
      let codec = null;
      let bytesReceived = 0;
      let timestamp = null;

      report.forEach((s) => {
        if (s.type === 'remote-inbound-rtp' && s.kind === 'video') {
          rtt = s.roundTripTime ? Math.round(s.roundTripTime * 1000) : null;
          jitter = s.jitter ? Math.round(s.jitter * 1000) : null;
          packetsLost = s.packetsLost ?? 0;
          packetsReceived = s.packetsReceived ?? 0;
          timestamp = s.timestamp;
        }
        if (s.type === 'inbound-rtp' && s.kind === 'video') {
          framesPerSecond = s.framesPerSecond ?? null;
          framesDecoded = s.framesDecoded ?? null;
          bytesReceived = s.bytesReceived ?? 0;
          if (!rtt) rtt = s.roundTripTime ? Math.round(s.roundTripTime * 1000) : null;
          if (!jitter) jitter = s.jitter ? Math.round(s.jitter * 1000) : null;
          if (!packetsLost) packetsLost = s.packetsLost ?? 0;
          if (!packetsReceived) packetsReceived = s.packetsReceived ?? 0;
          timestamp = s.timestamp;
          codec = s.codecId;
          frameWidth = s.frameWidth ?? null;
          frameHeight = s.frameHeight ?? null;
        }
        if (s.type === 'codec' && s.mimeType && !codec) {
          codec = s.mimeType;
        }
      });

      let bitrate = null;
      if (prevBytesRef.current !== null && timestamp && prevBytesRef.current.timestamp) {
        const byteDiff = bytesReceived - prevBytesRef.current.bytes;
        const timeDiff = (timestamp - prevBytesRef.current.timestamp) / 1000;
        if (timeDiff > 0) {
          bitrate = Math.round((byteDiff * 8) / timeDiff);
        }
      }
      prevBytesRef.current = { bytes: bytesReceived, timestamp };

      const packetLossRatio = packetsReceived + packetsLost > 0
        ? packetsLost / (packetsReceived + packetsLost)
        : 0;

      const m = {
        rtt,
        jitter,
        bitrate,
        packetLossRatio: Math.round(packetLossRatio * 10000) / 10000,
        packetsLost,
        packetsReceived,
        framesPerSecond,
        framesDecoded,
        frameWidth,
        frameHeight,
        codec,
      };
      setMetrics(m);
    } catch (err) {
      logger.debug(TAG, 'getStats failed', { error: err.message });
    }
  }, [pcRef]);

  // Periodic sampling
  useEffect(() => {
    if (!enabled) return;
    intervalRef.current = setInterval(poll, POLL_MS);
    poll();
    return () => clearInterval(intervalRef.current);
  }, [enabled, poll]);

  // Periodic summary log (every 30s instead of per-poll to avoid noise)
  useEffect(() => {
    if (!enabled) return;
    const log = () => {
      const m = metrics;
      if (!m) return;
      if (m.rtt === null && m.jitter === null && m.bitrate === null) return;
      logger.info(TAG, 'Connection stats', m);
    };
    logTimerRef.current = setInterval(log, METRICS_LOG_INTERVAL_MS);
    return () => clearInterval(logTimerRef.current);
  }, [enabled, metrics]);

  return { metrics };
}
