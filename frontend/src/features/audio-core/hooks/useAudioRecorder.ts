import { useState, useRef, useCallback, useEffect } from 'react';
import { downsampleBuffer, convertFloat32ToInt16 } from '../utils/audioDownsampler';
import { audioConfig } from '../config/audioConfig';
import { EnergyVadProcessor } from '../services/EnergyVadProcessor';
import { SocketIOStreamer } from '../services/SocketIOStreamer';
import { SOCKET_EVENTS } from '../constants/socketEvents';
import { logger } from '../../../utils/logger';
import type { RecordingStatus } from '../../../types/audio';

const SAMPLES_PER_CHUNK = (audioConfig.targetSampleRate * audioConfig.chunkDurationMs) / 1000;
const WORKLET_MODULE_URL = '/worklets/audio-capture-processor.worklet.js';
const STT_TIMEOUT_MS = 15_000;

export interface UseAudioRecorderReturn {
  isRecording: boolean;
  status: RecordingStatus;
  rmsVolume: number;
  transcript: string;
  startRecording: () => Promise<void>;
  stopRecording: () => void;
}

/**
 * Custom React hook coordinating the full turn-taking audio pipeline.
 *
 * State machine:
 *   IDLE → LISTENING (startRecording)
 *   LISTENING → PROCESSING (stopRecording / VAD silence)
 *   PROCESSING → IDLE (stt-completed received)
 *   any → ERROR (socket/mic error)
 */
export function useAudioRecorder(socketUrl: string): UseAudioRecorderReturn {
  const [isRecording, setIsRecording] = useState(false);
  const [status, setStatus] = useState<RecordingStatus>('IDLE');
  const [rmsVolume, setRmsVolume] = useState(0);
  const [transcript, setTranscript] = useState('');

  // Services — lazily initialized once per mount
  const streamerRef = useRef<SocketIOStreamer | null>(null);
  const vadProcessorRef = useRef<EnergyVadProcessor | null>(null);
  if (!streamerRef.current) streamerRef.current = new SocketIOStreamer();
  if (!vadProcessorRef.current) vadProcessorRef.current = new EnergyVadProcessor(audioConfig);

  // Web Audio API nodes
  const audioContextRef = useRef<AudioContext | null>(null);
  const mediaStreamRef = useRef<MediaStream | null>(null);
  const workletNodeRef = useRef<AudioWorkletNode | null>(null);
  const audioInputRef = useRef<MediaStreamAudioSourceNode | null>(null);

  // Audio accumulation
  const audioBufferQueueRef = useRef<number[]>([]);
  const sequenceNumberRef = useRef(0);
  const lastVolumeUpdateRef = useRef(0);
  const sttTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Forward refs to avoid stale closure issues
  const stopAudioRef = useRef<() => void>(() => undefined);
  const stopRecordingRef = useRef<() => void>(() => undefined);

  /** Stops mic/worklet/AudioContext — socket stays alive until stt-completed */
  const stopAudio = useCallback((): void => {
    setIsRecording(false);
    setRmsVolume(0);
    vadProcessorRef.current?.reset();

    if (workletNodeRef.current) {
      workletNodeRef.current.port.onmessage = null;
      workletNodeRef.current.disconnect();
      workletNodeRef.current = null;
    }
    if (audioInputRef.current) {
      audioInputRef.current.disconnect();
      audioInputRef.current = null;
    }
    if (mediaStreamRef.current) {
      mediaStreamRef.current.getTracks().forEach((t) => t.stop());
      mediaStreamRef.current = null;
    }
    if (audioContextRef.current && audioContextRef.current.state !== 'closed') {
      audioContextRef.current.close();
      audioContextRef.current = null;
    }

    audioBufferQueueRef.current = [];
    sequenceNumberRef.current = 0;
    lastVolumeUpdateRef.current = 0;
  }, []);

  /** Stops audio, signals server, enters PROCESSING. Socket kept alive for stt-completed. */
  const stopRecording = useCallback((): void => {
    stopAudio();
    setStatus('PROCESSING');
    streamerRef.current?.sendSpeechEnd();

    sttTimeoutRef.current = setTimeout(() => {
      logger.warn('[STT] Timeout — no stt-completed received');
      setStatus('ERROR');
      streamerRef.current?.disconnect();
    }, STT_TIMEOUT_MS);
  }, [stopAudio]);

  stopAudioRef.current = stopAudio;
  stopRecordingRef.current = stopRecording;

  /** Force-disconnects everything immediately — used only on unmount */
  const forceCleanup = useCallback((): void => {
    clearTimeout(sttTimeoutRef.current ?? undefined);
    stopAudioRef.current();
    streamerRef.current?.sendSpeechEnd();
    streamerRef.current?.disconnect();
  }, []);

  useEffect(() => {
    return () => forceCleanup();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const startRecording = useCallback(async (): Promise<void> => {
    setIsRecording(true);
    setStatus('LISTENING');
    setTranscript('');
    sequenceNumberRef.current = 0;
    audioBufferQueueRef.current = [];
    vadProcessorRef.current?.reset();

    try {
      streamerRef.current!.connect(socketUrl, {
        onConnect: () => logger.log('[Socket] Connected to backend'),
        onConnectError: (err: Error) => {
          logger.error('[Socket] Connection error:', err.message);
          setStatus('ERROR');
          stopAudioRef.current();
        },
        onDisconnect: (reason: string) => {
          if (reason !== 'io client disconnect') {
            logger.warn('[Socket] Unexpected disconnect:', reason);
          }
        },
      });

      streamerRef.current!.on(SOCKET_EVENTS.STT_COMPLETED, ({ transcript: text, latencyMs }) => {
        clearTimeout(sttTimeoutRef.current ?? undefined);
        logger.log(`[STT] Completed in ${latencyMs}ms: "${text}"`);
        setTranscript(text);
        setStatus('IDLE');
        streamerRef.current?.disconnect();
      });

      streamerRef.current!.on(SOCKET_EVENTS.SESSION_ERROR, ({ message }) => {
        clearTimeout(sttTimeoutRef.current ?? undefined);
        logger.error('[Socket] Session error:', message);
        setStatus('ERROR');
        streamerRef.current?.disconnect();
      });

      const stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
        },
      });
      mediaStreamRef.current = stream;

      const audioContext = new window.AudioContext();
      audioContextRef.current = audioContext;
      if (audioContext.state === 'suspended') {
        await audioContext.resume();
      }

      await audioContext.audioWorklet.addModule(WORKLET_MODULE_URL);
      const workletNode = new AudioWorkletNode(audioContext, 'audio-capture-processor');
      workletNodeRef.current = workletNode;

      audioInputRef.current = audioContext.createMediaStreamSource(stream);
      audioInputRef.current.connect(workletNode);
      workletNode.connect(audioContext.destination);

      workletNode.port.onmessage = (event: MessageEvent<Float32Array>) => {
        const inputData = event.data;

        vadProcessorRef.current?.process(inputData, () => {
          logger.log('[VAD] Silence detected — triggering speech-end');
          stopRecordingRef.current();
        });

        const now = performance.now();
        if (now - lastVolumeUpdateRef.current > 33) {
          setRmsVolume(vadProcessorRef.current?.getVolume() ?? 0);
          lastVolumeUpdateRef.current = now;
        }

        const downsampled = downsampleBuffer(
          inputData,
          audioContext.sampleRate,
          audioConfig.targetSampleRate
        );

        audioBufferQueueRef.current.push(...downsampled);

        while (audioBufferQueueRef.current.length >= SAMPLES_PER_CHUNK) {
          const chunk = audioBufferQueueRef.current.splice(0, SAMPLES_PER_CHUNK);
          const pcm16 = convertFloat32ToInt16(new Float32Array(chunk));
          streamerRef.current?.sendChunk(sequenceNumberRef.current++, pcm16);
        }
      };
    } catch (err) {
      logger.error('[Audio] Failed to start recording:', err);
      setStatus('ERROR');
      stopAudioRef.current();
      streamerRef.current?.disconnect();
    }
  }, [socketUrl]);

  return { isRecording, status, rmsVolume, transcript, startRecording, stopRecording };
}
