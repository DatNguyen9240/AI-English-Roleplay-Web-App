import { useState, useRef, useCallback } from 'react';
import { io } from 'socket.io-client';

const SAMPLING_RATE = 16000;
const CHUNK_DURATION_MS = 500;
const SAMPLES_PER_CHUNK = (SAMPLING_RATE * CHUNK_DURATION_MS) / 1000; // 8000 samples

export function useAudioRecorder(socketUrl = 'http://localhost:5000') {
  const [isRecording, setIsRecording] = useState(false);
  const [status, setStatus] = useState('IDLE'); // IDLE, LISTENING, PROCESSING
  const [rmsVolume, setRmsVolume] = useState(0);

  const socketRef = useRef(null);
  const audioContextRef = useRef(null);
  const mediaStreamRef = useRef(null);
  const processorNodeRef = useRef(null);
  const audioInputRef = useRef(null);

  // Accumulated sample buffer for downsampling
  const audioBufferQueueRef = useRef([]);
  const sequenceNumberRef = useRef(0);
  
  // VAD state trackers
  const silenceTimerRef = useRef(null);
  const speakingActiveRef = useRef(false);

  // Constants for VAD (Thresholds can be moved to config later)
  const VAD_VOLUME_THRESHOLD = 0.015; // RMS threshold
  const VAD_SILENCE_TIMEOUT_MS = 1500; // 1.5 seconds silence triggers speech-end

  // Clean linear interpolation downsampler
  const downsampleBuffer = (buffer, inputSampleRate, outputSampleRate) => {
    if (inputSampleRate === outputSampleRate) {
      return buffer;
    }
    const sampleRateRatio = inputSampleRate / outputSampleRate;
    const newLength = Math.round(buffer.length / sampleRateRatio);
    const result = new Float32Array(newLength);
    let offsetResult = 0;
    let offsetBuffer = 0;
    while (offsetResult < result.length) {
      const nextOffsetBuffer = Math.round((offsetResult + 1) * sampleRateRatio);
      let accum = 0;
      let count = 0;
      for (let i = offsetBuffer; i < nextOffsetBuffer && i < buffer.length; i++) {
        accum += buffer[i];
        count++;
      }
      result[offsetResult] = count > 0 ? accum / count : 0;
      offsetResult++;
      offsetBuffer = nextOffsetBuffer;
    }
    return result;
  };

  // Convert Float32Array to 16-bit Signed PCM ArrayBuffer
  const convertFloat32ToInt16 = (buffer) => {
    let l = buffer.length;
    const arrayBuffer = new ArrayBuffer(l * 2);
    const view = new DataView(arrayBuffer);
    for (let i = 0; i < l; i++) {
      const s = Math.max(-1, Math.min(1, buffer[i]));
      const pcmValue = s < 0 ? s * 0x8000 : s * 0x7FFF;
      view.setInt16(i * 2, pcmValue, true); // Little-Endian
    }
    return arrayBuffer;
  };

  // Stop recording helper
  const stopRecording = useCallback(() => {
    if (!isRecording) return;

    setIsRecording(false);
    setStatus('IDLE');
    setRmsVolume(0);
    speakingActiveRef.current = false;

    if (silenceTimerRef.current) {
      clearTimeout(silenceTimerRef.current);
      silenceTimerRef.current = null;
    }

    if (processorNodeRef.current) {
      processorNodeRef.current.disconnect();
      processorNodeRef.current = null;
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

    if (socketRef.current) {
      socketRef.current.emit('speech-end');
      socketRef.current.disconnect();
      socketRef.current = null;
    }

    audioBufferQueueRef.current = [];
    sequenceNumberRef.current = 0;
  }, [isRecording]);

  // Start recording
  const startRecording = useCallback(async () => {
    if (isRecording) return;

    try {
      // 1. Initialize WebSocket Connection
      socketRef.current = io(socketUrl, {
        transports: ['websocket'],
      });

      socketRef.current.on('connect', () => {
        console.log('[Socket] Connected to backend');
      });

      socketRef.current.on('disconnect', () => {
        console.log('[Socket] Disconnected from backend');
        stopRecording();
      });

      // 2. Request microphone access with Echo Cancellation
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
        },
      });

      mediaStreamRef.current = stream;
      
      // 3. Setup Web Audio API Context
      const AudioContextClass = window.AudioContext || window.webkitAudioContext;
      const audioContext = new AudioContextClass();
      audioContextRef.current = audioContext;

      // Unlock browser autoplay block if context is suspended
      if (audioContext.state === 'suspended') {
        await audioContext.resume();
      }

      audioInputRef.current = audioContext.createMediaStreamSource(stream);
      
      // ScriptProcessorNode for basic MVP downsampling buffer (size 4096)
      const processor = audioContext.createScriptProcessor(4096, 1, 1);
      processorNodeRef.current = processor;

      audioInputRef.current.connect(processor);
      processor.connect(audioContext.destination);

      setIsRecording(true);
      setStatus('LISTENING');
      sequenceNumberRef.current = 0;
      audioBufferQueueRef.current = [];

      // 4. Hook audio process event
      processor.onaudioprocess = (e) => {
        const inputData = e.inputBuffer.getChannelData(0);

        // Calculate current chunk RMS Volume for VAD
        let sum = 0;
        for (let i = 0; i < inputData.length; i++) {
          sum += inputData[i] * inputData[i];
        }
        const rms = Math.sqrt(sum / inputData.length);
        setRmsVolume(rms);

        // Downsample input from native rate (e.g. 48kHz) to 16kHz
        const downsampled = downsampleBuffer(inputData, audioContext.sampleRate, SAMPLING_RATE);
        
        // Push downsampled samples into active queue
        for (let i = 0; i < downsampled.length; i++) {
          audioBufferQueueRef.current.push(downsampled[i]);
        }

        // VAD Logic (Silence trigger)
        if (rms > VAD_VOLUME_THRESHOLD) {
          speakingActiveRef.current = true;
          if (silenceTimerRef.current) {
            clearTimeout(silenceTimerRef.current);
            silenceTimerRef.current = null;
          }
        } else if (speakingActiveRef.current) {
          // If user was speaking and now fell silent, start silence timeout
          if (!silenceTimerRef.current) {
            silenceTimerRef.current = setTimeout(() => {
              console.log('[VAD] Silence detected, trigger speech-end');
              setStatus('PROCESSING');
              stopRecording();
            }, VAD_SILENCE_TIMEOUT_MS);
          }
        }

        // Slice queue into 500ms chunks (8000 samples) and emit
        while (audioBufferQueueRef.current.length >= SAMPLES_PER_CHUNK) {
          const chunkToEmit = audioBufferQueueRef.current.slice(0, SAMPLES_PER_CHUNK);
          audioBufferQueueRef.current = audioBufferQueueRef.current.slice(SAMPLES_PER_CHUNK);

          // Convert slice to PCM 16-bit
          const pcm16Buffer = convertFloat32ToInt16(new Float32Array(chunkToEmit));

          // Emit binary packet over WebSocket
          if (socketRef.current && socketRef.current.connected) {
            socketRef.current.emit('audio-chunk', {
              sequenceNumber: sequenceNumberRef.current++,
              chunk: pcm16Buffer,
            });
          }
        }
      };

    } catch (err) {
      console.error('Failed to start audio recording:', err);
      setStatus('ERROR');
      stopRecording();
    }
  }, [isRecording, socketUrl, stopRecording]);

  return {
    isRecording,
    status,
    rmsVolume,
    startRecording,
    stopRecording,
  };
}
