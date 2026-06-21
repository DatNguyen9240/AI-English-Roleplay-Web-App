const fs = require('fs').promises;
const path = require('path');


/**
 * Abstract class representing the Audio Storage Service interface.
 * Matches design specification 7.5 (API Abstraction & DI Design).
 */
class AudioStorageService {
  /**
   * Save a PCM audio buffer collection into formatted WAV files
   * @param {string} socketId 
   * @param {Buffer[]} buffers 
   * @returns {Promise<{ fileName: string, totalBytes: number }>}
   */
  async saveWavRecording(socketId, buffers) {
    throw new Error('Method saveWavRecording must be implemented.');
  }
}

/**
 * Concrete implementation for Local disk files storage
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
    this.sampleRate = config.sampleRate;
    this.numChannels = config.numChannels;
    this.bitsPerSample = config.bitsPerSample;
  }

  /**
   * Prepends 44-byte standard WAV header helper
   * @private
   */
  _writeWavHeader(rawPcmBuffer) {
    const blockAlign = (this.numChannels * this.bitsPerSample) / 8;
    const byteRate = this.sampleRate * blockAlign;
    const subChunk2Size = rawPcmBuffer.length;
    const chunkSize = 36 + subChunk2Size;

    const header = Buffer.alloc(44);

    header.write('RIFF', 0);
    header.writeUInt32LE(chunkSize, 4);
    header.write('WAVE', 8);
    header.write('fmt ', 12);
    header.writeUInt32LE(16, 16);
    header.writeUInt16LE(1, 20);
    header.writeUInt16LE(this.numChannels, 22);
    header.writeUInt32LE(this.sampleRate, 24);
    header.writeUInt32LE(byteRate, 28);
    header.writeUInt16LE(blockAlign, 32);
    header.writeUInt16LE(this.bitsPerSample, 34);
    header.write('data', 36);
    header.writeUInt32LE(subChunk2Size, 40);

    return Buffer.concat([header, rawPcmBuffer]);
  }

  async saveWavRecording(socketId, buffers) {
    await fs.mkdir(this.recordingsDir, { recursive: true });

    const rawPcmBuffer = Buffer.concat(buffers);
    const wavBuffer = this._writeWavHeader(rawPcmBuffer);

    const fileName = `recording_${socketId}_${Date.now()}.wav`;
    const filePath = path.join(this.recordingsDir, fileName);

    await fs.writeFile(filePath, wavBuffer);

    return {
      fileName,
      totalBytes: wavBuffer.length,
    };
  }
}

/**
 * Concrete implementation for S3 / Cloud Bucket uploads (Extensibility stub)
 */
class S3AudioStorage extends AudioStorageService {
  constructor(config) {
    super();
    this.bucketName = config.bucketName;
  }

  async saveWavRecording(socketId, buffers) {
    // TODO: AWS SDK integration
    // const rawPcmBuffer = Buffer.concat(buffers);
    // await this.s3Client.putObject({ Bucket: this.bucketName, Key: `${socketId}.wav`, Body: rawPcmBuffer }).promise();
    return {
      fileName: `s3://${this.bucketName}/recordings/recording_${socketId}.wav`,
      totalBytes: 0,
    };
  }
}

module.exports = {
  AudioStorageService,
  LocalAudioStorage,
  S3AudioStorage,
};
