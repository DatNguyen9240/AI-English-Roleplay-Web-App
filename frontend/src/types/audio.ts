/**
 * Shared audio types used across audio-core feature and App layer.
 */

/** FSM states matching the conversation state machine in README Section 6 */
export type RecordingStatus = 'IDLE' | 'LISTENING' | 'PROCESSING' | 'ERROR';

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

/** Payload emitted by server on 'session-error' event */
export interface SessionErrorPayload {
  message: string;
}
