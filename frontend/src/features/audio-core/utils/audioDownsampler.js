/**
 * Downsamples Float32Array audio data from input sample rate to target output sample rate
 * @param {Float32Array} buffer - Source audio buffer
 * @param {number} inputSampleRate - E.g. 48000
 * @param {number} outputSampleRate - E.g. 16000
 * @returns {Float32Array}
 */
export function downsampleBuffer(buffer, inputSampleRate, outputSampleRate) {
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
 * Converts a Float32Array to a 16-bit Signed PCM ArrayBuffer
 * @param {Float32Array} buffer 
 * @returns {ArrayBuffer}
 */
export function convertFloat32ToInt16(buffer) {
  let l = buffer.length;
  const arrayBuffer = new ArrayBuffer(l * 2);
  const view = new DataView(arrayBuffer);
  
  for (let i = 0; i < l; i++) {
    const s = Math.max(-1, Math.min(1, buffer[i]));
    const pcmValue = s < 0 ? s * 0x8000 : s * 0x7FFF;
    view.setInt16(i * 2, pcmValue, true); // Little-Endian
  }
  return arrayBuffer;
}
