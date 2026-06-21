import type { AudioConfig } from '@/types/audio';

/**
 * Audio format constants for the frontend capture pipeline.
 *
 * The PCM spec values (targetSampleRate, bitsPerSample, numChannels) MUST stay in sync with:
 *   backend/config/audioConfig.js  (sampleRate, bitsPerSample, numChannels)
 */
export const audioConfig: AudioConfig = {
  vadVolumeThreshold: 0.015,      // RMS energy threshold for speech detection
  vadSilenceTimeoutMs: 1500,      // Period of silence in ms to trigger end of speech
  bitsPerSample: 16,              // PCM16 standard
  numChannels: 1,                 // Mono
  targetSampleRate: 16_000,       // Standard 16kHz for Whisper STT
  chunkDurationMs: 500,           // 500ms time slice per packet (~16KB PCM16)
};
