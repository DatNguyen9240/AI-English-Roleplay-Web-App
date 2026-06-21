import { useState, useRef, useCallback, useEffect } from 'react';
import { downsampleBuffer, convertFloat32ToInt16 } from '../utils/audioDownsampler';
import { audioConfig } from '../config/audioConfig';
import { EnergyVadProcessor } from '../services/EnergyVadProcessor';
import { SocketIOStreamer } from '../services/SocketIOStreamer';
import { logger } from '../../../utils/logger';

const SAMPLES_PER_CHUNK = (audioConfig.targetSampleRate * audioConfig.chunkDurationMs) / 1000;

// Path to the AudioWorklet module served from /public
const WORKLET_MODULE_URL = '/worklets/audio-capture-processor.worklet.js';

/**
 * Custom React hook coordinating Web Audio streams, VAD transitions,
 * and binary audio streaming via abstract service interfaces (Section 7.5).
 *
 * Audio pipeline:
 *   Microphone → AudioWorkletNode (dedicated thread) → downsample → PCM16 chunks → SocketIOStreamer
 */
export function useAudioRecorder(socketUrl) {
  const [isRecording, setIsRecording] = useState(false);
  const [status, setStatus] = useState('IDLE'); // IDLE, LISTENING, PROCESSING, ERROR
  const [rmsVolume, setRmsVolume] = useState(0);

  // Service layer refs — lazily initialized once per component mount
  const streamerRef = useRef(null);
  const vadProcessorRef = useRef(null);
  if (!streamerRef.current) streamerRef.current = new SocketIOStreamer();
  if (!vadProcessorRef.current) vadProcessorRef.current = new EnergyVadProcessor(audioConfig);

  // Web Audio API node refs
  const audioContextRef = useRef(null);
  const mediaStreamRef = useRef(null);
  const workletNodeRef = useRef(null);   // AudioWorkletNode (replaces deprecated ScriptProcessorNode)
  const audioInputRef = useRef(null);

  // Accumulated sample buffer for downsampling
  const audioBufferQueueRef = useRef([]);
  const sequenceNumberRef = useRef(0);
  const lastVolumeUpdateRef = useRef(0); // Throttle rmsVolume state to ~30fps

  // Forward ref to stopRecording — prevents stale closure in useEffect cleanup
  const stopRecordingRef = useRef(null);

  // Stop recording helper
  const stopRecording = useCallback(() => {
    setIsRecording(false);
    setStatus('IDLE');
    setRmsVolume(0);

    vadProcessorRef.current.reset();

    if (workletNodeRef.current) {
      workletNodeRef.current.port.onmessage = null; // detach message handler
      workletNodeRef.current.disconnect();
      workletNodeRef.current = null;
    }

    if (audioInputRef.current) {
      audioInputRef.current.disconnect();
      audioInputRef.current = null;
    }

    if (mediaStreamRef.current) {
      mediaStreamRef.current.getTracks().forEach((track) => track.stop());
      mediaStreamRef.current = null;
    }

    if (audioContextRef.current && audioContextRef.current.state !== 'closed') {
      audioContextRef.current.close();
      audioContextRef.current = null;
    }

    if (streamerRef.current) {
      streamerRef.current.sendSpeechEnd();
      streamerRef.current.disconnect();
    }

    audioBufferQueueRef.current = [];
    sequenceNumberRef.current = 0;
    lastVolumeUpdateRef.current = 0;
  }, []);

  // Keep forward ref in sync with latest stopRecording
  stopRecordingRef.current = stopRecording;

  // Safety cleanup on unmount
  useEffect(() => {
    return () => {
      stopRecordingRef.current();
    };
  }, []);

  // Start recording
  const startRecording = useCallback(async () => {
    setIsRecording(true);
    setStatus('LISTENING');
    sequenceNumberRef.current = 0;
    audioBufferQueueRef.current = [];
    vadProcessorRef.current.reset();

    try {
      // 1. Establish Signaling Stream
      streamerRef.current.connect(socketUrl, {
        onConnect: () => {
          logger.log('[Socket] Connected to backend');
        },
        onConnectError: (err) => {
          logger.error('[Socket] Connection error:', err.message);
          setStatus('ERROR');
          stopRecording();
        },
        onDisconnect: () => {
          logger.log('[Socket] Disconnected from backend');
          stopRecording();
        },
      });

      // 2. Request microphone access with acoustic improvements
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
        },
      });

      mediaStreamRef.current = stream;

      // 3. Setup Web Audio API Context
      const audioContext = new window.AudioContext();
      audioContextRef.current = audioContext;

      // Unlock browser autoplay block if context is suspended (iOS Safari policy)
      if (audioContext.state === 'suspended') {
        await audioContext.resume();
      }

      // 4. Register and attach AudioWorkletNode
      //    AudioWorkletNode runs in a dedicated audio rendering thread —
      //    unlike the deprecated ScriptProcessorNode which ran on the main thread.
      await audioContext.audioWorklet.addModule(WORKLET_MODULE_URL);
      const workletNode = new AudioWorkletNode(audioContext, 'audio-capture-processor');
      workletNodeRef.current = workletNode;

      audioInputRef.current = audioContext.createMediaStreamSource(stream);
      audioInputRef.current.connect(workletNode);
      workletNode.connect(audioContext.destination);

      // 5. Process audio frames posted from the worklet thread
      workletNode.port.onmessage = (event) => {
        const inputData = event.data; // Float32Array (zero-copy transfer)

        // Run VAD — fires silence callback when speech pauses exceed threshold
        vadProcessorRef.current.process(inputData, () => {
          logger.log('[VAD] Silence detected, triggering speech-end');
          setStatus('PROCESSING');
          stopRecording();
        });

        // Throttle volume UI updates to ~30fps (avoids excessive re-renders)
        const now = performance.now();
        if (now - lastVolumeUpdateRef.current > 33) {
          setRmsVolume(vadProcessorRef.current.getVolume());
          lastVolumeUpdateRef.current = now;
        }

        // Downsample to target sample rate (e.g. 48kHz → 16kHz)
        const downsampled = downsampleBuffer(
          inputData,
          audioContext.sampleRate,
          audioConfig.targetSampleRate
        );

        // Append downsampled samples into accumulation queue
        audioBufferQueueRef.current.push(...downsampled);

        // Slice queue into fixed-size chunks and stream
        while (audioBufferQueueRef.current.length >= SAMPLES_PER_CHUNK) {
          const chunkToEmit = audioBufferQueueRef.current.splice(0, SAMPLES_PER_CHUNK);
          const pcm16Buffer = convertFloat32ToInt16(new Float32Array(chunkToEmit));
          streamerRef.current.sendChunk(sequenceNumberRef.current++, pcm16Buffer);
        }
      };

    } catch (err) {
      logger.error('Failed to start audio recording:', err);
      setStatus('ERROR');
      stopRecording();
    }
  }, [socketUrl, stopRecording]);

  return {
    isRecording,
    status,
    rmsVolume,
    startRecording,
    stopRecording,
  };
}
