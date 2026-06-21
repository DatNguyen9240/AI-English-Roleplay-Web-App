/**
 * Shared audio types used across audio-core feature and App layer.
 */

/**
 * FSM states matching the conversation state machine in README Section 6.
 *   IDLE        → user is not interacting
 *   LISTENING   → microphone is active, streaming audio to server
 *   PROCESSING  → speech-end sent, Whisper STT running
 *   THINKING    → STT complete, LLM is streaming response tokens
 *   ERROR       → recoverable error, shows retry UI
 */
export type RecordingStatus = 'IDLE' | 'LISTENING' | 'PROCESSING' | 'THINKING' | 'SPEAKING' | 'ERROR';

/** Audio processing configuration */
export interface AudioConfig {
  vadVolumeThreshold: number;
  vadSilenceTimeoutMs: number;
  targetSampleRate: number;
  chunkDurationMs: number;
  bitsPerSample: number;
  numChannels: number;
}

/** Payload emitted by server on 'stt-completed' event */
export interface SttCompletedPayload {
  transcript: string;
  latencyMs: number;
}

/** Payload emitted by server on 'llm-stream-chunk' event */
export interface LlmChunkPayload {
  token: string;
}

/** Payload emitted by server on 'llm-stream-done' event */
export interface LlmStreamDonePayload {
  latencyMs: number;
}

/** Payload emitted by server on 'session-error' event */
export interface SessionErrorPayload {
  message: string;
}

/** Payload emitted by server on 'tts-audio-chunk' event */
export interface TtsAudioChunkPayload {
  requestId: string;
  sequenceNumber: number;
  audio: ArrayBuffer;
  sampleRate: number;
  words: Array<{
    text: string;
    startMs: number;
    endMs: number;
  }>;
}

