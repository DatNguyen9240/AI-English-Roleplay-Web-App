import { z } from 'zod';

// ── Socket Events Constants ──────────────────────────────────────────────────
export const SOCKET_EVENTS = {
  // Client → Server
  AUDIO_CHUNK:    'audio-chunk',
  SPEECH_END:     'speech-end',
  USER_INTERRUPT: 'user-interrupt',

  // Server → Client
  STT_COMPLETED:    'stt-completed',
  LLM_STREAM_CHUNK: 'llm-stream-chunk',
  LLM_STREAM_DONE:  'llm-stream-done',
  TTS_AUDIO_CHUNK:  'tts-audio-chunk',
  STATE_TRANSITION: 'state-transition',
  SESSION_ERROR:    'session-error',
} as const;

export type SocketEventValue = (typeof SOCKET_EVENTS)[keyof typeof SOCKET_EVENTS];

// ── State & Config Types ─────────────────────────────────────────────────────
export type RecordingStatus = 'IDLE' | 'LISTENING' | 'PROCESSING' | 'THINKING' | 'SPEAKING' | 'ERROR';

export interface AudioConfig {
  vadVolumeThreshold: number;
  vadSilenceTimeoutMs: number;
  targetSampleRate: number;
  chunkDurationMs: number;
  bitsPerSample: number;
  numChannels: number;
  interruptionVolumeThreshold: number;
  sttTimeoutMs: number;
  llmTimeoutMs: number;
  playbackLookaheadSec: number;
  jitterBufferDelayMs: number;
}

// ── Payloads Interfaces ──────────────────────────────────────────────────────
export interface SttCompletedPayload {
  transcript: string;
  latencyMs: number;
}

export interface LlmChunkPayload {
  token: string;
}

export interface LlmStreamDonePayload {
  latencyMs: number;
}

export interface SessionErrorPayload {
  message: string;
}

export interface TtsAudioChunkPayload {
  requestId: string;
  sequenceNumber: number;
  audio: any; // ArrayBuffer in browser, Buffer in Node.js
  sampleRate: number;
  words: Array<{
    text: string;
    startMs: number;
    endMs: number;
  }>;
}

// ── Zod Validation Schemas ───────────────────────────────────────────────────
export const AudioChunkSchema = z.object({
  sequenceNumber: z.number().int(),
  chunk: z.any() // Can be ArrayBuffer or Buffer
});

export const TtsAudioChunkSchema = z.object({
  requestId: z.string(),
  sequenceNumber: z.number().int(),
  audio: z.any(),
  sampleRate: z.number().int(),
  words: z.array(z.object({
    text: z.string(),
    startMs: z.number(),
    endMs: z.number()
  }))
});
