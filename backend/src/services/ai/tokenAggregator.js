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

    this._processBuffer();
  }

  /**
   * Scans the buffer to split sentences precisely at punctuation boundaries,
   * preserving any trailing text from the next sentence for subsequent tokens.
   * @private
   */
  _processBuffer() {
    let i = 0;
    while (i < this._buffer.length) {
      const char = this._buffer[i];
      let isBoundary = false;

      if (char === '\n') {
        isBoundary = true;
      } else if (/[.!?]/.test(char)) {
        // Avoid splitting decimals like 3.14
        const prevChar = this._buffer[i - 1];
        const nextChar = this._buffer[i + 1];
        const isDecimal = prevChar && nextChar && /\d/.test(prevChar) && /\d/.test(nextChar);
        if (!isDecimal) {
          isBoundary = true;
        }
      }

      if (isBoundary) {
        const sentence = this._buffer.slice(0, i + 1).trim();
        if (sentence) {
          this.onSentenceReady(sentence);
        }
        this._buffer = this._buffer.slice(i + 1);
        this._tokenCount = 0;
        i = 0; // Reset scanner to scan the remaining buffer
      } else {
        i++;
      }
    }

    // Fallback: if token threshold is reached, force emit the buffer to keep latency low
    if (this._tokenCount >= this.tokenThreshold && this._buffer.trim()) {
      const sentence = this._buffer.trim();
      this.onSentenceReady(sentence);
      this._buffer = '';
      this._tokenCount = 0;
    }
  }

  /**
   * Flushes any remaining buffered content at end of stream.
   * Must be called after the LLM stream completes.
   */
  flush() {
    const sentence = this._buffer.trim();
    if (sentence) {
      this.onSentenceReady(sentence);
    }
    this._buffer = '';
    this._tokenCount = 0;
  }
}

module.exports = { TokenAggregator };
