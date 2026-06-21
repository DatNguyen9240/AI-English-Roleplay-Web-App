/**
 * Downsamples Float32Array audio data from input sample rate to target output rate
 * using linear interpolation averaging.
 */
export function downsampleBuffer(
  buffer: Float32Array,
  inputSampleRate: number,
  outputSampleRate: number
): Float32Array {
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
}

/**
 * Converts a Float32Array (range -1.0 to 1.0) to a 16-bit Signed PCM ArrayBuffer.
 * Output is Little-Endian, matching Whisper STT input spec (PCM16 16kHz Mono LE).
 */
export function convertFloat32ToInt16(buffer: Float32Array): ArrayBuffer {
  const arrayBuffer = new ArrayBuffer(buffer.length * 2);
  const view = new DataView(arrayBuffer);

  for (let i = 0; i < buffer.length; i++) {
    const s = Math.max(-1, Math.min(1, buffer[i]));
    const pcmValue = s < 0 ? s * 0x8000 : s * 0x7fff;
    view.setInt16(i * 2, pcmValue, true); // Little-Endian
  }

  return arrayBuffer;
}
