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
  constructor() {
    super();
    // Batch eight 128-sample quanta (~21ms at 48kHz) before crossing into the
    // main thread. This reduces message pressure by 8x without perceptible VAD delay.
    this.frameSize = 1024;
    this.pendingFrame = new Float32Array(this.frameSize);
    this.pendingOffset = 0;
  }

  /**
   * Called by the audio engine at every render quantum (default: 128 frames).
   * @param {Float32Array[][]} inputs  - Array of input channel arrays
   * @returns {boolean} Return true to keep the processor alive
   */
  process(inputs) {
    const inputChannel = inputs[0]?.[0];
    if (inputChannel && inputChannel.length > 0) {
      // Clone before transferring — the original buffer is read-only in this context
      let sourceOffset = 0;
      while (sourceOffset < inputChannel.length) {
        const writable = this.frameSize - this.pendingOffset;
        const length = Math.min(writable, inputChannel.length - sourceOffset);
        this.pendingFrame.set(inputChannel.subarray(sourceOffset, sourceOffset + length), this.pendingOffset);
        this.pendingOffset += length;
        sourceOffset += length;

        if (this.pendingOffset === this.frameSize) {
          this.port.postMessage(this.pendingFrame, [this.pendingFrame.buffer]);
          this.pendingFrame = new Float32Array(this.frameSize);
          this.pendingOffset = 0;
        }
      }
    }
    return true; // returning false would terminate the processor
  }
}

registerProcessor('audio-capture-processor', AudioCaptureProcessor);
