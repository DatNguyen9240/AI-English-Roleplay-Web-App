import { useState, useRef, useCallback, useEffect } from 'react';
import { downsampleBuffer, convertFloat32ToInt16 } from '../utils/audioDownsampler';
import { audioConfig } from '../config/audioConfig';
import { EnergyVadProcessor } from '../services/EnergyVadProcessor';
import { SocketIOStreamer } from '../services/SocketIOStreamer';
import { PlaybackQueueManager } from '../queue/PlaybackQueueManager';
import { logger } from '@/utils/logger';
import { SOCKET_EVENTS, RecordingStatus } from 'shared-contracts';

const SAMPLES_PER_CHUNK = (audioConfig.targetSampleRate * audioConfig.chunkDurationMs) / 1000;
const WORKLET_MODULE_URL = '/worklets/audio-capture-processor.worklet.js';

export interface UseAudioRecorderReturn {
  isRecording: boolean;
  status: RecordingStatus;
  rmsVolume: number;
  transcript: string;
  llmText: string;
  currentPlayingSentence: string;
  highlightedWordIndex: number;
  startRecording: () => Promise<void>;
  stopRecording: () => void;
}

/**
 * Custom React hook coordinating the full turn-taking audio pipeline.
 *
 * State machine (README Section 6):
 *   IDLE → LISTENING (startRecording)
 *   LISTENING → PROCESSING (stopRecording / VAD silence)
 *   PROCESSING → THINKING (stt-completed received)
 *   THINKING → IDLE (llm-stream-done received)
 *   any → ERROR (socket/mic error)
 */
export function useAudioRecorder(socketUrl: string): UseAudioRecorderReturn {
  const [isRecording, setIsRecording] = useState(false);
  const [status, setStatus] = useState<RecordingStatus>('IDLE');
  const [rmsVolume, setRmsVolume] = useState(0);
  const [transcript, setTranscript] = useState('');
  const [llmText, setLlmText] = useState('');
  const [currentPlayingSentence, setCurrentPlayingSentence] = useState('');
  const [highlightedWordIndex, setHighlightedWordIndex] = useState(-1);

  const statusRef = useRef<RecordingStatus>('IDLE');
  useEffect(() => {
    statusRef.current = status;
  }, [status]);

  const updateStatus = useCallback((newStatus: RecordingStatus) => {
    setStatus(newStatus);
    statusRef.current = newStatus;
  }, []);

  const triggerInterruption = useCallback((): void => {
    if (statusRef.current !== 'SPEAKING') {
      logger.warn('[useAudioRecorder] triggerInterruption called but state is not SPEAKING:', statusRef.current);
      return;
    }
    updateStatus('LISTENING');

    logger.log('[useAudioRecorder] USER INTERRUPTED AI — Triggering local interruption cleanup');
    playoutQueueRef.current?.stop();
    setCurrentPlayingSentence('');
    setHighlightedWordIndex(-1);

    streamerRef.current?.sendUserInterrupt();

    audioBufferQueueRef.current = [];
    sequenceNumberRef.current = 0;

    setIsRecording(true);
  }, [updateStatus]);

  const triggerInterruptionRef = useRef<() => void>(() => undefined);
  useEffect(() => {
    triggerInterruptionRef.current = triggerInterruption;
  }, [triggerInterruption]);

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
  const playoutQueueRef = useRef<PlaybackQueueManager | null>(null);

  // Audio accumulation
  const audioBufferQueueRef = useRef<number[]>([]);
  const sequenceNumberRef = useRef(0);
  const lastVolumeUpdateRef = useRef(0);
  const sttTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const llmTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Forward refs to avoid stale closure issues
  const stopAudioRef = useRef<() => void>(() => undefined);
  const stopRecordingRef = useRef<() => void>(() => undefined);

  /** Stops mic/worklet/AudioContext — socket stays alive until llm-stream-done */
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
    // Keep audioContextRef.current alive for playout queue.
    
    audioBufferQueueRef.current = [];
    sequenceNumberRef.current = 0;
    lastVolumeUpdateRef.current = 0;
  }, []);

  /** Stops audio, signals server, enters PROCESSING. Socket kept alive. */
  const stopRecording = useCallback((): void => {
    setIsRecording(false);
    setRmsVolume(0);
    vadProcessorRef.current?.reset();

    updateStatus('PROCESSING');
    streamerRef.current?.sendSpeechEnd();

    sttTimeoutRef.current = setTimeout(() => {
      logger.warn('[STT] Timeout — no stt-completed received');
      updateStatus('ERROR');
      streamerRef.current?.disconnect();
    }, audioConfig.sttTimeoutMs);
  }, [updateStatus]);

  stopAudioRef.current = stopAudio;
  stopRecordingRef.current = stopRecording;

  /** Force-disconnects everything immediately — used only on unmount */
  const forceCleanup = useCallback((): void => {
    clearTimeout(sttTimeoutRef.current ?? undefined);
    clearTimeout(llmTimeoutRef.current ?? undefined);
    stopAudioRef.current();
    streamerRef.current?.sendSpeechEnd();
    streamerRef.current?.disconnect();
    
    // Close AudioContext and stop playout queue on unmount
    if (audioContextRef.current && audioContextRef.current.state !== 'closed') {
      audioContextRef.current.close();
      audioContextRef.current = null;
    }
    playoutQueueRef.current?.stop();
    playoutQueueRef.current = null;
  }, []);

  useEffect(() => {
    return () => forceCleanup();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const startRecording = useCallback(async (): Promise<void> => {
    setIsRecording(true);
    updateStatus('LISTENING');
    setTranscript('');
    setLlmText('');
    setCurrentPlayingSentence('');
    setHighlightedWordIndex(-1);
    
    // Reset playout queue for the new turn
    playoutQueueRef.current?.stop();

    sequenceNumberRef.current = 0;
    audioBufferQueueRef.current = [];
    vadProcessorRef.current?.reset();

    try {
      streamerRef.current!.connect(socketUrl, {
        onConnect: () => logger.log('[Socket] Connected to backend'),
        onConnectError: (err: Error) => {
          logger.error('[Socket] Connection error:', err.message);
          updateStatus('ERROR');
          stopAudioRef.current();
        },
        onDisconnect: (reason: string) => {
          if (reason !== 'io client disconnect') {
            logger.warn('[Socket] Unexpected disconnect:', reason);
          }
        },
      });

      // ── STT result → transition to THINKING ─────────────────────────────
      streamerRef.current!.on(SOCKET_EVENTS.STT_COMPLETED, ({ transcript: text, latencyMs }) => {
          clearTimeout(sttTimeoutRef.current ?? undefined);
          logger.log(`[STT] Completed in ${latencyMs}ms: "${text}"`);
          setTranscript(text);
          updateStatus('THINKING');

        // Start LLM timeout watchdog
        llmTimeoutRef.current = setTimeout(() => {
          logger.warn('[LLM] Timeout — no llm-stream-done received');
          updateStatus('ERROR');
          streamerRef.current?.disconnect();
        }, audioConfig.llmTimeoutMs);
      });

      // ── LLM tokens → accumulate into llmText ────────────────────────────
      streamerRef.current!.on(SOCKET_EVENTS.LLM_STREAM_CHUNK, ({ token }) => {
        setLlmText((prev) => prev + token);
      });

      // ── LLM stream done ──────────────────────────────────────────────────
      streamerRef.current!.on(SOCKET_EVENTS.LLM_STREAM_DONE, ({ latencyMs }) => {
        clearTimeout(llmTimeoutRef.current ?? undefined);
        logger.log(`[LLM] Stream done in ${latencyMs}ms`);
        // Note: Do not disconnect socket immediately here because we need it to continue
        // receiving tts-audio-chunk packets. Playout manager will notify when finished.
      });

      // ── TTS audio chunk → playout ─────────────────────────────────────────
      streamerRef.current!.on(SOCKET_EVENTS.TTS_AUDIO_CHUNK, (data) => {
        logger.log(`[TTS] Received chunk sequence: ${data.sequenceNumber}`);
        if (playoutQueueRef.current) {
          playoutQueueRef.current.enqueue({
            requestId: data.requestId,
            sequenceNumber: data.sequenceNumber,
            audio: data.audio,
            sampleRate: data.sampleRate,
            words: data.words,
          });
        }
      });

      // ── Error handler ────────────────────────────────────────────────────
      streamerRef.current!.on(SOCKET_EVENTS.SESSION_ERROR, ({ message }) => {
        clearTimeout(sttTimeoutRef.current ?? undefined);
        clearTimeout(llmTimeoutRef.current ?? undefined);
        logger.error('[Socket] Session error:', message);
        updateStatus('ERROR');
        streamerRef.current?.disconnect();
        playoutQueueRef.current?.stop();
      });

      const stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
        },
      });
      mediaStreamRef.current = stream;

      if (!audioContextRef.current || audioContextRef.current.state === 'closed') {
        audioContextRef.current = new window.AudioContext();
      }
      const audioContext = audioContextRef.current;
      if (audioContext.state === 'suspended') {
        await audioContext.resume();
      }

      // Initialize Playout Queue Manager if not already
      if (!playoutQueueRef.current) {
        const queue = new PlaybackQueueManager(audioContext);
        queue.onSentenceStart = (sentenceText) => {
          setCurrentPlayingSentence(sentenceText);
          setHighlightedWordIndex(-1);
          updateStatus('SPEAKING');
        };
        queue.onWordSpoken = (_wordText, index) => {
          setHighlightedWordIndex(index);
        };
        queue.onQueueEmpty = () => {
          logger.log('[useAudioRecorder] Playout queue empty. Turn complete, auto-transitioning to LISTENING');
          setCurrentPlayingSentence('');
          setHighlightedWordIndex(-1);
          setIsRecording(true);
          updateStatus('LISTENING');
        };
        playoutQueueRef.current = queue;
      }

      await audioContext.audioWorklet.addModule(WORKLET_MODULE_URL);
      const workletNode = new AudioWorkletNode(audioContext, 'audio-capture-processor');
      workletNodeRef.current = workletNode;

      audioInputRef.current = audioContext.createMediaStreamSource(stream);
      audioInputRef.current.connect(workletNode);
      workletNode.connect(audioContext.destination);

      workletNode.port.onmessage = (event: MessageEvent<Float32Array>) => {
        const inputData = event.data;
        const currentStatus = statusRef.current;

        // 1. Interruption Check (during SPEAKING state)
        if (currentStatus === 'SPEAKING') {
          const volume = vadProcessorRef.current?.updateVolume(inputData) ?? 0;
          const interruptionThreshold = audioConfig.interruptionVolumeThreshold;
          if (volume > interruptionThreshold) {
            logger.log(`[useAudioRecorder] Interruption detected. Volume: ${volume.toFixed(3)} (Threshold: ${interruptionThreshold.toFixed(3)})`);
            triggerInterruptionRef.current();
            return;
          }
        }

        // 2. Silence detection & Audio streaming (only in LISTENING state)
        if (currentStatus === 'LISTENING') {
          vadProcessorRef.current?.process(inputData, () => {
            logger.log('[VAD] Silence detected — triggering speech-end');
            stopRecordingRef.current();
          });

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
        }

        // 3. Update volume visualizer
        const now = performance.now();
        if (now - lastVolumeUpdateRef.current > 33) {
          setRmsVolume(vadProcessorRef.current?.getVolume() ?? 0);
          lastVolumeUpdateRef.current = now;
        }
      };
    } catch (err) {
      logger.error('[Audio] Failed to start recording:', err);
      updateStatus('ERROR');
      stopAudioRef.current();
      streamerRef.current?.disconnect();
    }
  }, [socketUrl, updateStatus]);

  return {
    isRecording,
    status,
    rmsVolume,
    transcript,
    llmText,
    currentPlayingSentence,
    highlightedWordIndex,
    startRecording,
    stopRecording,
  };
}
