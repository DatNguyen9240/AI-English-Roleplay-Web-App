/**
 * Shared WAV file builder utility.
 * Extracted to avoid duplication between storageService and sttService.
 *
 * Spec: PCM16, Little-Endian, configurable sample rate, channels, and bit depth.
 * See README Section 7.3 for the audio pipeline format requirements.
 */

/**
 * @typedef {{ sampleRate: number, numChannels: number, bitsPerSample: number }} WavConfig
 */

/**
 * Concatenates raw PCM chunks and prepends a standard 44-byte WAV header.
 *
 * @param {Buffer[]} pcmBuffers - Raw PCM16 chunk array (e.g. session.buffers)
 * @param {WavConfig} config - Audio format parameters
 * @returns {Buffer} Complete WAV file buffer ready to write or pass to Whisper
 */
function buildWavBuffer(pcmBuffers, { sampleRate, numChannels, bitsPerSample }) {
  const rawPcm = Buffer.concat(pcmBuffers);
  const blockAlign = (numChannels * bitsPerSample) / 8;
  const byteRate = sampleRate * blockAlign;
  const subChunk2Size = rawPcm.length;
  const chunkSize = 36 + subChunk2Size;

  const header = Buffer.alloc(44);
  header.write('RIFF', 0);
  header.writeUInt32LE(chunkSize, 4);
  header.write('WAVE', 8);
  header.write('fmt ', 12);
  header.writeUInt32LE(16, 16);           // PCM subchunk size
  header.writeUInt16LE(1, 20);            // AudioFormat: 1 = PCM
  header.writeUInt16LE(numChannels, 22);
  header.writeUInt32LE(sampleRate, 24);
  header.writeUInt32LE(byteRate, 28);
  header.writeUInt16LE(blockAlign, 32);
  header.writeUInt16LE(bitsPerSample, 34);
  header.write('data', 36);
  header.writeUInt32LE(subChunk2Size, 40);

  return Buffer.concat([header, rawPcm]);
}

module.exports = { buildWavBuffer };
