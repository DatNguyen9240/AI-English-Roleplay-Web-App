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

      // Validate sequence ordering (Preshowing packet drops/delays)
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

      // Extract binary buffer payload
      // Socket.IO converts ArrayBuffer/Buffer types cleanly on node backend
      const audioBuffer = Buffer.from(chunk);
      session.buffers.push(audioBuffer);

      logger.debug(
        { 
          socketId: socket.id, 
          seq: sequenceNumber, 
          bytesReceived: audioBuffer.length 
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
      // Concatenate all accumulated buffers into a single buffer
      const finalBuffer = Buffer.concat(session.buffers);
      const recordingFilename = `recording_${socket.id}_${Date.now()}.pcm`;
      const filePath = path.join(RECORDINGS_DIR, recordingFilename);

      // Write PCM raw binary bytes directly to file
      fs.writeFileSync(filePath, finalBuffer);

      const durationSec = (Date.now() - session.startTime) / 1000;
      logger.info(
        {
          socketId: socket.id,
          fileName: recordingFilename,
          totalBytes: finalBuffer.length,
          chunksReceived: session.buffers.length,
          streamDurationSec: durationSec.toFixed(2),
        },
        'SPEECH_END_PROCESSED (Audio File Saved Successfully)'
      );

      // Clear memory buffers for this session
      session.buffers = [];
      session.lastSequence = -1;

    } catch (err) {
      logger.error({ socketId: socket.id, error: err.message }, 'Failed to write final audio recording file');
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
