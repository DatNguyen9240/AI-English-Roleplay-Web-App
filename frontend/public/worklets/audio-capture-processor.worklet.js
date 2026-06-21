/**
 * AudioWorklet processor for low-latency audio capture.
 *
 * Runs in the browser's dedicated AudioWorkletGlobalScope thread —
 * completely separate from the main JS thread, so it never gets
 * blocked by React renders or network activity.
 *
 * Communication to the main thread is via MessagePort using
 * transferable ArrayBuffers (zero-copy — no serialization overhead).
 */
class AudioCaptureProcessor extends AudioWorkletProcessor {
  /**
   * Called by the audio engine at every render quantum (default: 128 frames).
   * @param {Float32Array[][]} inputs  - Array of input channel arrays
   * @returns {boolean} Return true to keep the processor alive
   */
  process(inputs) {
    const inputChannel = inputs[0]?.[0];
    if (inputChannel && inputChannel.length > 0) {
      // Clone before transferring — the original buffer is read-only in this context
      const frame = new Float32Array(inputChannel);
      this.port.postMessage(frame, [frame.buffer]);
    }
    return true; // returning false would terminate the processor
  }
}

registerProcessor('audio-capture-processor', AudioCaptureProcessor);
