import { useState, useRef, useCallback } from 'react';
import { downsampleBuffer, convertFloat32ToInt16 } from '../utils/audioDownsampler';
import { audioConfig } from '../config/audioConfig';
import { EnergyVadProcessor } from '../services/EnergyVadProcessor';
import { RecordingStatus } from 'shared-contracts';

const SAMPLES_PER_CHUNK = (audioConfig.targetSampleRate * audioConfig.chunkDurationMs) / 1000;
const WORKLET_MODULE_URL = '/worklets/audio-capture-processor.worklet.js';

interface AudioCaptureProps {
  status: RecordingStatus;
  onPcmChunk: (chunk: ArrayBuffer, sequence: number) => void;
  onSilenceDetected: () => void;
  onInterruptionDetected: (volume: number) => void;
}

export function useAudioCapture({
  status,
  onPcmChunk,
  onSilenceDetected,
  onInterruptionDetected,
}: AudioCaptureProps) {
  const [rmsVolume, setRmsVolume] = useState(0);

  const mediaStreamRef = useRef<MediaStream | null>(null);
  const workletNodeRef = useRef<AudioWorkletNode | null>(null);
  const audioInputRef = useRef<MediaStreamAudioSourceNode | null>(null);
  const vadProcessorRef = useRef<EnergyVadProcessor | null>(null);

  if (!vadProcessorRef.current) {
    vadProcessorRef.current = new EnergyVadProcessor(audioConfig);
  }

  const audioBufferQueueRef = useRef<number[]>([]);
  const sequenceNumberRef = useRef(0);
  const lastVolumeUpdateRef = useRef(0);

  // Keep callback refs fresh to prevent closures capturing stale status or listeners
  const statusRef = useRef(status);
  statusRef.current = status;

  const onPcmChunkRef = useRef(onPcmChunk);
  onPcmChunkRef.current = onPcmChunk;

  const onSilenceDetectedRef = useRef(onSilenceDetected);
  onSilenceDetectedRef.current = onSilenceDetected;

  const onInterruptionDetectedRef = useRef(onInterruptionDetected);
  onInterruptionDetectedRef.current = onInterruptionDetected;

  const startCapture = useCallback(async (audioContext: AudioContext) => {
    sequenceNumberRef.current = 0;
    audioBufferQueueRef.current = [];
    vadProcessorRef.current?.reset();
    setRmsVolume(0);

    const stream = await navigator.mediaDevices.getUserMedia({
      audio: {
        echoCancellation: true,
        noiseSuppression: true,
        autoGainControl: true,
      },
    });
    mediaStreamRef.current = stream;

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
          onInterruptionDetectedRef.current(volume);
          return;
        }
      }

      // 2. Silence detection & Audio streaming (only in LISTENING state)
      if (currentStatus === 'LISTENING') {
        vadProcessorRef.current?.process(inputData, () => {
          onSilenceDetectedRef.current();
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
          onPcmChunkRef.current(pcm16, sequenceNumberRef.current++);
        }
      }

      // 3. Update volume visualizer
      const now = performance.now();
      if (now - lastVolumeUpdateRef.current > 33) {
        setRmsVolume(vadProcessorRef.current?.getVolume() ?? 0);
        lastVolumeUpdateRef.current = now;
      }
    };
  }, []);

  const stopCapture = useCallback(() => {
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
    
    audioBufferQueueRef.current = [];
    sequenceNumberRef.current = 0;
    lastVolumeUpdateRef.current = 0;
  }, []);

  const resetCaptureBuffers = useCallback(() => {
    audioBufferQueueRef.current = [];
    sequenceNumberRef.current = 0;
  }, []);

  return {
    rmsVolume,
    setRmsVolume,
    startCapture,
    stopCapture,
    resetCaptureBuffers,
  };
}
