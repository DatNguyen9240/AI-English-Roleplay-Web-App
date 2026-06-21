// Session memory map to buffer raw audio packets per connected socket.
// Key: SocketID -> Value: { buffers: Buffer[], lastSequence: number, startTime: number }
// NOTE: This is an in-process Map — sufficient for single-instance deployments.
// For horizontal scaling (multiple Node processes), replace with a shared store (e.g. Redis).
const sessionBuffers = new Map();

/**
 * Registers WebSocket handlers for audio capturing and state changes.
 * Complies with Section 7.5: Implements Dependency Injection for storage services.
 * 
 * @param {import('socket.io').Server} io 
 * @param {import('socket.io').Socket} socket 
 * @param {import('pino').Logger} logger 
 * @param {import('../services/storageService').AudioStorageService} storageService - Injected storage provider
 */
function registerAudioHandlers(io, socket, logger, storageService) {
  // Initialize session state
  sessionBuffers.set(socket.id, {
    buffers: [],
    lastSequence: -1,
    startTime: null, // Set on first audio-chunk, not at connect time
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

      // Mark speech start time on the very first chunk of a new utterance
      if (session.buffers.length === 0) {
        session.startTime = Date.now();
      }

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
  socket.on('speech-end', async () => {
    const session = sessionBuffers.get(socket.id);
    if (!session || session.buffers.length === 0) {
      logger.warn({ socketId: socket.id }, 'Received speech-end but no buffered audio segments found');
      return;
    }

    try {
      const durationSec = (Date.now() - session.startTime) / 1000;

      // Save formatted WAV using the injected polymorphic service
      const result = await storageService.saveWavRecording(socket.id, session.buffers);

      logger.info(
        {
          socketId: socket.id,
          fileName: result.fileName,
          totalBytes: result.totalBytes,
          chunksReceived: session.buffers.length,
          streamDurationSec: durationSec.toFixed(2),
        },
        'SPEECH_END_PROCESSED (Playable WAV File Saved Successfully)'
      );

      // Clear memory buffers for this session
      session.buffers = [];
      session.lastSequence = -1;
      session.startTime = null;

    } catch (err) {
      logger.error({ socketId: socket.id, error: err.message }, 'Failed to write final WAV recording file');
    }
  });

  // Connection disconnect cleanup
  socket.on('disconnect', (reason) => {
    logger.info({ socketId: socket.id, reason }, 'USER_DISCONNECTED');
    sessionBuffers.delete(socket.id);
  });
}

module.exports = registerAudioHandlers;
