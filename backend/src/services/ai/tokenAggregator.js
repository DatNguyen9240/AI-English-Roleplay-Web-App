/**
 * Token Aggregator — sentence boundary batch parser.
 *
 * Buffers LLM streaming tokens and fires onSentenceReady when:
 *   a) A sentence boundary is detected: `.`, `?`, `!`, or newline.
 *   b) The buffer reaches the tokenThreshold count (prevents long sentences from blocking TTS).
 *
 * Used in Phase 5 (TTS) to feed sentence-level chunks to the TTS engine.
 * Phase 4 registers it but onSentenceReady is a no-op until TTS is wired.
 *
 * @see README Section 7.8 — Exact Playout Constraints & Buffers
 */
class TokenAggregator {
  /**
   * @param {(sentence: string) => void} onSentenceReady - Called with each completed sentence
   * @param {{ tokenThreshold?: number }} [options]
   */
  constructor(onSentenceReady, { tokenThreshold = 15 } = {}) {
    this.onSentenceReady = onSentenceReady;
    this.tokenThreshold = tokenThreshold;
    this._buffer = '';
    this._tokenCount = 0;
  }

  /**
   * Pushes the next streamed token into the aggregator.
   * Fires onSentenceReady if a boundary is detected or threshold reached.
   * @param {string} token
   */
  push(token) {
    this._buffer += token;
    this._tokenCount++;

    // Match standard sentence endings (. ? !) or newline, avoiding decimals (e.g. 3.14)
    const hasBoundary = /[\n]/.test(token) || (/[.!?]/.test(token) && !/\d\.\d/.test(token));
    const thresholdReached = this._tokenCount >= this.tokenThreshold;

    if (hasBoundary || thresholdReached) {
      this._emit();
    }
  }

  /**
   * Flushes any remaining buffered content at end of stream.
   * Must be called after the LLM stream completes.
   */
  flush() {
    this._emit();
  }

  /** @private */
  _emit() {
    const sentence = this._buffer.trim();
    if (sentence) {
      this.onSentenceReady(sentence);
    }
    this._buffer = '';
    this._tokenCount = 0;
  }
}

module.exports = { TokenAggregator };
