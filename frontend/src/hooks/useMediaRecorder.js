/**
 * useMediaRecorder
 * ─────────────────────────────────────────────────────────────
 * Records a MediaStream (local camera or remote WebRTC stream)
 * and uploads completed blobs to the backend.
 *
 * Usage:
 *   const { startRecording, stopRecording, isRecording } =
 *     useMediaRecorder({ cameraId, trigger: 'MOTION' });
 *
 *   startRecording(stream);
 *   stopRecording();   // finalises, uploads, notifies
 */

import { useState, useRef, useCallback } from 'react';
import { recordingAPI } from '../services/api';
import toast from 'react-hot-toast';

const MIME_TYPE = MediaRecorder.isTypeSupported('video/webm;codecs=vp9')
  ? 'video/webm;codecs=vp9'
  : 'video/webm';

const MAX_RECORDING_MS = 5 * 60 * 1000; // auto-stop at 5 min

export function useMediaRecorder({ cameraId, trigger: defaultTrigger = 'MANUAL', onRecordingReady }) {
  const [isRecording, setIsRecording] = useState(false);
  const [duration, setDuration]       = useState(0);

  const recorderRef  = useRef(null);
  const chunksRef    = useRef([]);
  const startTimeRef = useRef(null);
  const timerRef     = useRef(null);
  const autoStopRef  = useRef(null);
  const currentTriggerRef = useRef(defaultTrigger);

  const startRecording = useCallback((stream, trigger = defaultTrigger) => {
    if (!stream || isRecording || !cameraId) return;

    chunksRef.current  = [];
    startTimeRef.current = Date.now();
    currentTriggerRef.current = trigger;

    const recorder = new MediaRecorder(stream, { mimeType: MIME_TYPE });
    recorderRef.current = recorder;

    recorder.ondataavailable = (e) => {
      if (e.data.size > 0) chunksRef.current.push(e.data);
    };

    recorder.onstop = async () => {
      clearInterval(timerRef.current);
      clearTimeout(autoStopRef.current);
      setIsRecording(false);

      const blob = new Blob(chunksRef.current, { type: MIME_TYPE });
      const durationSecs = Math.round((Date.now() - startTimeRef.current) / 1000);

      // Upload
      const formData = new FormData();
      formData.append('video',    blob, `recording-${Date.now()}.webm`);
      formData.append('trigger',  currentTriggerRef.current);
      formData.append('duration', durationSecs);

      try {
        const { data } = await recordingAPI.upload(cameraId, formData);
        onRecordingReady?.(data.data);
        toast.success('Recording saved');
      } catch (err) {
        toast.error('Failed to save recording');
        console.error(err);
      }
    };

    recorder.start(1000); // collect chunks every 1s
    setIsRecording(true);
    setDuration(0);

    timerRef.current = setInterval(() => setDuration((d) => d + 1), 1000);
    autoStopRef.current = setTimeout(() => stopRecording(), MAX_RECORDING_MS);
  }, [cameraId, defaultTrigger, isRecording, onRecordingReady, stopRecording]);

  const stopRecording = useCallback(() => {
    if (recorderRef.current?.state === 'recording') {
      recorderRef.current.stop();
    }
  }, []);

  return { startRecording, stopRecording, isRecording, duration };
}
