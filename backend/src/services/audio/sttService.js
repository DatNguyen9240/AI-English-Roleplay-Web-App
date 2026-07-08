const { spawn } = require('child_process');
const fs = require('fs').promises;
const path = require('path');
const os = require('os');
const { buildWavBuffer } = require('@utils/wavBuilder');

/**
 * Abstract STT (Speech-to-Text) service interface.
 * Concrete implementations are injected via Dependency Injection (Section 7.5).
 */
class SttService {
  /**
   * @param {Buffer[]} pcmBuffers - Raw 16kHz Mono PCM16 chunks
   * @returns {Promise<string>} Transcribed text
   */
  async transcribe(pcmBuffers) {
    throw new Error('transcribe() must be implemented.');
  }
}

/**
 * Mock STT — no binary required.
 * Returns a realistic test phrase after a simulated processing delay.
 */
class MockSttService extends SttService {
  async transcribe() {
    await new Promise((resolve) => setTimeout(resolve, 800));
    return 'This is a mock transcription. The real Whisper STT will replace this.';
  }
}

/**
 * Production STT using a whisper.cpp local binary (README Section 3 — STT Integration).
 * Writes a temp WAV file, spawns the binary, parses the transcript from stdout.
 *
 * Required env vars:
 *   WHISPER_BINARY_PATH  — path to compiled whisper main binary
 *   WHISPER_MODEL_PATH   — path to ggml-base.en.bin model file
 */
class WhisperSttService extends SttService {
  /**
   * @param {object} config
   * @param {string} config.binaryPath
   * @param {string} config.modelPath
   * @param {number} config.sampleRate
   * @param {number} config.numChannels
   * @param {number} config.bitsPerSample
   */
  constructor(config) {
    super();
    this.binaryPath = config.binaryPath;
    this.modelPath = config.modelPath;
    // Grouped for a single pass to buildWavBuffer
    this.wavConfig = {
      sampleRate: config.sampleRate,
      numChannels: config.numChannels,
      bitsPerSample: config.bitsPerSample,
    };
  }

  /**
   * Spawns the whisper.cpp binary and resolves with the parsed transcript.
   * @private
   */
  _runWhisper(wavPath) {
    return new Promise((resolve, reject) => {
      const proc = spawn(this.binaryPath, [
        '-m', this.modelPath,
        '-f', wavPath,
        '-nt',      // suppress timestamp lines
        '-l', 'en', // language hint for speed
        '-nc',      // disable past text context to prevent repetition loops
      ]);

      let stdout = '';
      let stderr = '';

      proc.stdout.on('data', (data) => { stdout += data.toString(); });
      proc.stderr.on('data', (data) => { stderr += data.toString(); });

      proc.on('error', (err) => {
        reject(new Error(`Failed to spawn whisper binary: ${err.message}`));
      });

      proc.on('close', (code) => {
        if (code !== 0) {
          reject(new Error(`Whisper exited with code ${code}: ${stderr.slice(0, 200)}`));
          return;
        }
        const transcript = stdout
          .split('\n')
          .map((line) => line.replace(/^\[.*?\]\s+/, '').trim())
          .filter(Boolean)
          .join(' ')
          .trim();

        resolve(transcript);
      });
    });
  }

  async transcribe(pcmBuffers) {
    const wavBuffer = buildWavBuffer(pcmBuffers, this.wavConfig);
    const tmpPath = path.join(
      os.tmpdir(),
      `whisper_${Date.now()}_${Math.random().toString(36).slice(2)}.wav`
    );

    await fs.writeFile(tmpPath, wavBuffer);

    try {
      return await this._runWhisper(tmpPath);
    } finally {
      await fs.unlink(tmpPath).catch(() => {});
    }
  }
}

module.exports = { SttService, MockSttService, WhisperSttService };
