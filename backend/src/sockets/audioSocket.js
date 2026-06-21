const { SOCKET_EVENTS } = require('./socketEvents');

const sessionBuffers = new Map();

const SAVE_DEBUG_RECORDINGS = process.env.SAVE_DEBUG_RECORDINGS === 'true';


/**
 * Registers WebSocket handlers for audio capturing and STT transcription.
 * Complies with Section 7.5: Dependency Injection for all services.
 *
 * @param {import('socket.io').Server} io
 * @param {import('socket.io').Socket} socket
 * @param {import('pino').Logger} logger
 * @param {import('../services/storageService').AudioStorageService} storageService - WAV file storage (debug)
 * @param {import('../services/audio/sttService').SttService} sttService - Injected STT provider
 */
function registerAudioHandlers(io, socket, logger, storageService, sttService) {
  // Initialize session state for this socket
  sessionBuffers.set(socket.id, {
    buffers: [],
    lastSequence: -1,
    startTime: null, // Set on first audio-chunk, not at connect time
  });

  // ── Handle incoming audio chunk packets ─────────────────────────────────
  socket.on(SOCKET_EVENTS.AUDIO_CHUNK, (data) => {
    const session = sessionBuffers.get(socket.id);
    if (!session) {
      logger.warn({ socketId: socket.id }, 'Received audio-chunk but session state is missing');
      return;
    }

    try {
      const { sequenceNumber, chunk } = data;

      // Validate sequence ordering to detect packet loss or reordering
      if (sequenceNumber !== session.lastSequence + 1) {
        logger.warn(
          {
            socketId: socket.id,
            expectedSeq: session.lastSequence + 1,
            receivedSeq: sequenceNumber,
          },
          'PACKET_DISORDER_DETECTED (Sequence Jump)'
        );
      }
      session.lastSequence = sequenceNumber;

      // Mark speech start time on the very first chunk of a new utterance
      if (session.buffers.length === 0) {
        session.startTime = Date.now();
      }

      // Normalize incoming chunk to a Node Buffer
      let audioBuffer;
      if (Buffer.isBuffer(chunk)) {
        audioBuffer = chunk;
      } else if (chunk instanceof ArrayBuffer) {
        audioBuffer = Buffer.from(chunk);
      } else {
        audioBuffer = Buffer.from(new Uint8Array(chunk));
      }

      session.buffers.push(audioBuffer);

      logger.debug(
        { socketId: socket.id, seq: sequenceNumber, bytes: audioBuffer.length },
        'AUDIO_CHUNK_RECEIVED'
      );
    } catch (err) {
      logger.error({ socketId: socket.id, error: err.message }, 'Failed to process audio chunk');
    }
  });

  // ── Handle end of speech event (VAD triggered silence) ──────────────────
  socket.on(SOCKET_EVENTS.SPEECH_END, async () => {
    const session = sessionBuffers.get(socket.id);
    if (!session || session.buffers.length === 0) {
      logger.warn({ socketId: socket.id }, 'Received speech-end but no buffered audio segments found');
      return;
    }

    const sttStart = Date.now();

    try {
      // Optionally persist a debug WAV file to disk for review
      if (SAVE_DEBUG_RECORDINGS) {
        const result = await storageService.saveWavRecording(socket.id, session.buffers);
        logger.info(
          { socketId: socket.id, fileName: result.fileName, totalBytes: result.totalBytes },
          'DEBUG_WAV_SAVED'
        );
      }

      // Run transcription via the injected STT provider
      logger.info({ socketId: socket.id }, 'STT_STARTED');
      const transcript = await sttService.transcribe(session.buffers);
      const latencyMs = Date.now() - sttStart;

      logger.info(
        {
          socketId: socket.id,
          transcript,
          latencyMs,
          streamDurationSec: ((Date.now() - session.startTime) / 1000).toFixed(2),
        },
        'STT_COMPLETED'
      );

      // Deliver transcription result back to the originating client
      socket.emit(SOCKET_EVENTS.STT_COMPLETED, { transcript, latencyMs });

    } catch (err) {
      logger.error({ socketId: socket.id, error: err.message }, 'STT_FAILED');
      socket.emit(SOCKET_EVENTS.SESSION_ERROR, { message: 'Transcription failed. Please try again.' });
    } finally {
      // Always reset session memory after a speech turn
      session.buffers = [];
      session.lastSequence = -1;
      session.startTime = null;
    }
  });

  // ── Connection cleanup ───────────────────────────────────────────────────
  socket.on('disconnect', (reason) => {
    logger.info({ socketId: socket.id, reason }, 'USER_DISCONNECTED');
    sessionBuffers.delete(socket.id);
  });
}

module.exports = registerAudioHandlers;
