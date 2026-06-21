export const audioConfig = {
  // Voice Activity Detection parameters
  vadVolumeThreshold: 0.015,     // RMS amplitude threshold to classify speech
  vadSilenceTimeoutMs: 1500,     // Period of silence in ms to trigger end of speech

  // Hardware processing parameters
  targetSampleRate: 16000,       // Standard 16kHz
  chunkDurationMs: 500,          // 500ms time slice per packet
  bitsPerSample: 16,             // standard PCM16 bit depth
  numChannels: 1,                // Mono audio
};
