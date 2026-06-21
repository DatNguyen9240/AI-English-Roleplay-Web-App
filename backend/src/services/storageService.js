const fs = require('fs').promises;
const path = require('path');
const { buildWavBuffer } = require('@utils/wavBuilder');

/**
 * Abstract class representing the Audio Storage Service interface.
 * Matches design specification 7.5 (API Abstraction & DI Design).
 */
class AudioStorageService {
  /**
   * @param {string} socketId
   * @param {Buffer[]} buffers
   * @returns {Promise<{ fileName: string, totalBytes: number }>}
   */
  async saveWavRecording(socketId, buffers) {
    throw new Error('Method saveWavRecording must be implemented.');
  }
}

/**
 * Concrete implementation for local disk file storage.
 */
class LocalAudioStorage extends AudioStorageService {
  /**
   * @param {object} config
   * @param {string} config.recordingsDir
   * @param {number} config.sampleRate
   * @param {number} config.numChannels
   * @param {number} config.bitsPerSample
   */
  constructor(config) {
    super();
    this.recordingsDir = config.recordingsDir;
    this.wavConfig = {
      sampleRate: config.sampleRate,
      numChannels: config.numChannels,
      bitsPerSample: config.bitsPerSample,
    };
  }

  async saveWavRecording(socketId, buffers) {
    await fs.mkdir(this.recordingsDir, { recursive: true });

    const wavBuffer = buildWavBuffer(buffers, this.wavConfig);
    const fileName = `recording_${socketId}_${Date.now()}.wav`;
    const filePath = path.join(this.recordingsDir, fileName);

    await fs.writeFile(filePath, wavBuffer);

    return { fileName, totalBytes: wavBuffer.length };
  }
}

/**
 * Concrete implementation for S3 / Cloud Bucket uploads (extensibility stub).
 */
class S3AudioStorage extends AudioStorageService {
  constructor(config) {
    super();
    this.bucketName = config.bucketName;
  }

  async saveWavRecording(socketId, _buffers) {
    // TODO: AWS SDK integration
    return {
      fileName: `s3://${this.bucketName}/recordings/recording_${socketId}.wav`,
      totalBytes: 0,
    };
  }
}

module.exports = { AudioStorageService, LocalAudioStorage, S3AudioStorage };
