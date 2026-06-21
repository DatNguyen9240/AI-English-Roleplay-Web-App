/**
 * Voice Activity Detector using root-mean-square (RMS) energy analysis.
 * Complies with Section 7.5: Swappable VAD processor pattern.
 */
export class EnergyVadProcessor {
  /**
   * @param {object} config 
   * @param {number} config.vadVolumeThreshold 
   * @param {number} config.vadSilenceTimeoutMs 
   */
  constructor(config) {
    this.threshold = config.vadVolumeThreshold;
    this.timeoutMs = config.vadSilenceTimeoutMs;
    
    this.speakingActive = false;
    this.silenceTimer = null;
    this.currentRms = 0;
  }

  /**
   * Evaluates input audio samples for speech indicators
   * @param {Float32Array} inputData 
   * @param {() => void} onSilenceDetected - Triggered on silent pauses
   * @returns {boolean} Whether speech is actively detected
   */
  process(inputData, onSilenceDetected) {
    let sum = 0;
    for (let i = 0; i < inputData.length; i++) {
      sum += inputData[i] * inputData[i];
    }
    this.currentRms = Math.sqrt(sum / inputData.length);

    if (this.currentRms > this.threshold) {
      this.speakingActive = true;
      if (this.silenceTimer) {
        clearTimeout(this.silenceTimer);
        this.silenceTimer = null;
      }
    } else if (this.speakingActive) {
      if (!this.silenceTimer) {
        this.silenceTimer = setTimeout(() => {
          this.speakingActive = false;
          this.silenceTimer = null;
          onSilenceDetected();
        }, this.timeoutMs);
      }
    }

    return this.speakingActive;
  }

  /**
   * Returns current raw volume reading
   * @returns {number}
   */
  getVolume() {
    return this.currentRms;
  }

  /**
   * Cleans active timers and resets volume state
   */
  reset() {
    this.speakingActive = false;
    if (this.silenceTimer) {
      clearTimeout(this.silenceTimer);
      this.silenceTimer = null;
    }
    this.currentRms = 0;
  }
}
