const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const cors = require('cors');
const fs = require('fs');
const path = require('path');
const pino = require('pino');
const pinoPretty = require('pino-pretty');
require('dotenv').config();

// Create logger
const logger = pino(
  {
    level: process.env.LOG_LEVEL || 'info',
  },
  process.env.NODE_ENV !== 'production' ? pinoPretty() : undefined
);

const app = express();
const port = process.env.PORT || 5000;

// Middleware
app.use(cors());
app.use(express.json());

// Target directory for local test recordings
const RECORDINGS_DIR = path.join(__dirname, 'test_recordings');
if (!fs.existsSync(RECORDINGS_DIR)) {
  fs.mkdirSync(RECORDINGS_DIR, { recursive: true });
}

// Helper to prepend a 44-byte standard WAV header to raw PCM 16-bit Mono 16kHz data
function writeWavHeader(rawPcmBuffer, sampleRate, numChannels, bitsPerSample) {
  const blockAlign = (numChannels * bitsPerSample) / 8;
  const byteRate = sampleRate * blockAlign;
  const subChunk2Size = rawPcmBuffer.length;
  const chunkSize = 36 + subChunk2Size;

  const header = Buffer.alloc(44);

  header.write('RIFF', 0);                          // ChunkID
  header.writeUInt32LE(chunkSize, 4);               // ChunkSize
  header.write('WAVE', 8);                          // Format
  header.write('fmt ', 12);                         // Subchunk1ID
  header.writeUInt32LE(16, 16);                     // Subchunk1Size
  header.writeUInt16LE(1, 20);                      // AudioFormat (1 = PCM)
  header.writeUInt16LE(numChannels, 22);            // NumChannels
  header.writeUInt32LE(sampleRate, 24);             // SampleRate
  header.writeUInt32LE(byteRate, 28);               // ByteRate
  header.writeUInt16LE(blockAlign, 32);             // BlockAlign
  header.writeUInt16LE(bitsPerSample, 34);          // BitsPerSample
  header.write('data', 36);                         // Subchunk2ID
  header.writeUInt32LE(subChunk2Size, 40);          // Subchunk2Size

  return Buffer.concat([header, rawPcmBuffer]);
}

// Session memory map to buffer raw audio packets
// Key: SocketID -> Value: { buffers: Buffer[], lastSequence: number, startTime: number }
const sessionBuffers = new Map();

app.get('/health', (req, res) => {
  res.json({ status: 'ok', recordingsCount: fs.readdirSync(RECORDINGS_DIR).length });
});

const server = http.createServer(app);

const io = new Server(server, {
  cors: {
    origin: '*',
    methods: ['GET', 'POST'],
  },
});

io.on('connection', (socket) => {
  logger.info({ socketId: socket.id }, 'USER_CONNECTED (WebSocket Connection Established)');

  // Initialize session state
  sessionBuffers.set(socket.id, {
    buffers: [],
    lastSequence: -1,
    startTime: Date.now(),
  });

  // Handle incoming audio chunk packets
  socket.on('audio-chunk', (data) => {
    const session = sessionBuffers.get(socket.id);
    if (!session) {
      logger.warn({ socketId: socket.id }, 'Received audio-chunk but session state is missing');
      return;
    }

    try {
      const { sequenceNumber, chunk } = data;

      // Validate sequence ordering
      if (sequenceNumber !== session.lastSequence + 1) {
        logger.warn(
          { 
            socketId: socket.id, 
            expectedSeq: session.lastSequence + 1, 
            receivedSeq: sequenceNumber 
          },
          'PACKET_DISORDER_DETECTED (Sequence Jump)'
        );
      }
      session.lastSequence = sequenceNumber;

      // Convert chunk to Node Buffer safely
      let audioBuffer;
      if (Buffer.isBuffer(chunk)) {
        audioBuffer = chunk;
      } else if (chunk instanceof ArrayBuffer) {
        audioBuffer = Buffer.from(chunk);
      } else {
        // Fallback for typed array/object formats
        audioBuffer = Buffer.from(new Uint8Array(chunk));
      }

      session.buffers.push(audioBuffer);

      logger.debug(
        { 
          socketId: socket.id, 
          seq: sequenceNumber, 
          bytes: audioBuffer.length 
        },
        'AUDIO_CHUNK_RECEIVED'
      );

    } catch (err) {
      logger.error({ socketId: socket.id, error: err.message }, 'Failed to process audio chunk');
    }
  });

  // Handle end of speaking event (VAD triggered silence)
  socket.on('speech-end', () => {
    const session = sessionBuffers.get(socket.id);
    if (!session || session.buffers.length === 0) {
      logger.warn({ socketId: socket.id }, 'Received speech-end but no buffered audio segments found');
      return;
    }

    try {
      // Concatenate raw PCM buffers
      const rawPcmBuffer = Buffer.concat(session.buffers);
      
      // Wrap PCM bytes with a standard 44-byte WAV header so it's instantly playable
      const wavBuffer = writeWavHeader(rawPcmBuffer, 16000, 1, 16);
      
      const recordingFilename = `recording_${socket.id}_${Date.now()}.wav`;
      const filePath = path.join(RECORDINGS_DIR, recordingFilename);

      // Save formatted WAV file to disk
      fs.writeFileSync(filePath, wavBuffer);

      const durationSec = (Date.now() - session.startTime) / 1000;
      logger.info(
        {
          socketId: socket.id,
          fileName: recordingFilename,
          totalBytes: wavBuffer.length,
          chunksReceived: session.buffers.length,
          streamDurationSec: durationSec.toFixed(2),
        },
        'SPEECH_END_PROCESSED (Playable WAV File Saved Successfully)'
      );

      // Clear memory buffers for this session
      session.buffers = [];
      session.lastSequence = -1;

    } catch (err) {
      logger.error({ socketId: socket.id, error: err.message }, 'Failed to write final WAV recording file');
    }
  });

  // Connection disconnect cleanup
  socket.on('disconnect', (reason) => {
    logger.info({ socketId: socket.id, reason }, 'USER_DISCONNECTED');
    sessionBuffers.delete(socket.id);
  });
});

server.listen(port, () => {
  logger.info(`Backend server running on port ${port} in ${process.env.NODE_ENV || 'development'} mode`);
});
