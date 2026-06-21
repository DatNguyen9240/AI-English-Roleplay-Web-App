const path = require('path');

/**
 * Audio format constants for the backend pipeline.
 *
 * These values are spec constants (PCM16 16kHz Mono) that MUST stay in sync with:
 *   frontend/src/features/audio-core/config/audioConfig.ts  (targetSampleRate, bitsPerSample, numChannels)
 */
module.exports = {
  sampleRate: 16_000,   // Hz — Whisper STT input requirement
  numChannels: 1,       // Mono
  bitsPerSample: 16,    // PCM16
  recordingsDir: path.join(__dirname, '..', 'test_recordings'),
};
