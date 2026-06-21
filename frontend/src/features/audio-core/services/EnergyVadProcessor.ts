import type { AudioConfig } from '../../../types/audio';

/**
 * Voice Activity Detector using root-mean-square (RMS) energy analysis.
 * Complies with Section 7.5: Swappable VAD processor pattern.
 */
export class EnergyVadProcessor {
  private readonly threshold: number;
  private readonly timeoutMs: number;
  private speakingActive: boolean = false;
  private silenceTimer: ReturnType<typeof setTimeout> | null = null;
  private currentRms: number = 0;

  constructor(config: AudioConfig) {
    this.threshold = config.vadVolumeThreshold;
    this.timeoutMs = config.vadSilenceTimeoutMs;
  }

  /**
   * Evaluates input audio samples for speech activity.
   * Fires onSilenceDetected after the configured silence timeout.
   */
  process(inputData: Float32Array, onSilenceDetected: () => void): boolean {
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

  /** Returns the current raw RMS volume reading */
  getVolume(): number {
    return this.currentRms;
  }

  /** Clears active timers and resets all state */
  reset(): void {
    this.speakingActive = false;
    if (this.silenceTimer) {
      clearTimeout(this.silenceTimer);
      this.silenceTimer = null;
    }
    this.currentRms = 0;
  }
}
