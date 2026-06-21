const path = require('path');

module.exports = {
  sampleRate: 16000,
  numChannels: 1,
  bitsPerSample: 16,
  recordingsDir: path.join(__dirname, '..', 'test_recordings'),
};
