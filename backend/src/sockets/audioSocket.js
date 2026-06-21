const { SOCKET_EVENTS } = require('./socketEvents');
const { TokenAggregator } = require('@services/ai/tokenAggregator');

// ── Session state ────────────────────────────────────────────────────────────
// In-process Map — sufficient for single-instance deployments.
// For horizontal scaling, replace with a shared store (e.g. Redis).
const sessionMap = new Map();

const SAVE_DEBUG_RECORDINGS = process.env.SAVE_DEBUG_RECORDINGS === 'true';
const MAX_CONTEXT_MESSAGES = parseInt(process.env.MAX_CONTEXT_MESSAGES, 10);

/**
 * Registers WebSocket handlers for the full audio → STT → LLM turn-taking pipeline.
 * Complies with README Section 7.5: Dependency Injection for all services.
 *
 * @param {import('socket.io').Server} io
 * @param {import('socket.io').Socket} socket
 * @param {import('pino').Logger} logger
 * @param {import('../services/storageService').AudioStorageService} storageService
 * @param {import('../services/audio/sttService').SttService} sttService
 * @param {import('../services/ai/llmService').LlmService} llmService
 */
function registerAudioHandlers(io, socket, logger, storageService, sttService, llmService, ttsService) {
  // Initialize per-socket session state
  sessionMap.set(socket.id, {
    buffers: [],
    lastSequence: -1,
    startTime: null,
    conversationHistory: [], // { role: 'user'|'assistant', content: string }[]
  });

  // ── Handle incoming audio chunk packets ─────────────────────────────────
  socket.on(SOCKET_EVENTS.AUDIO_CHUNK, (data) => {
    const session = sessionMap.get(socket.id);
    if (!session) {
      logger.warn({ socketId: socket.id }, 'Received audio-chunk but session state is missing');
      return;
    }

    try {
      const { sequenceNumber, chunk } = data;

      if (sequenceNumber !== session.lastSequence + 1) {
        logger.warn(
          { socketId: socket.id, expectedSeq: session.lastSequence + 1, receivedSeq: sequenceNumber },
          'PACKET_DISORDER_DETECTED (Sequence Jump)'
        );
      }
      session.lastSequence = sequenceNumber;

      if (session.buffers.length === 0) {
        session.startTime = Date.now();
      }

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

  // ── Handle end of speech — triggers STT → LLM pipeline ──────────────────
  socket.on(SOCKET_EVENTS.SPEECH_END, async () => {
    const session = sessionMap.get(socket.id);
    if (!session || session.buffers.length === 0) {
      logger.warn({ socketId: socket.id }, 'Received speech-end but no buffered audio found');
      return;
    }

    const sttStart = Date.now();

    try {
      // ── Phase 3: STT ────────────────────────────────────────────────────
      if (SAVE_DEBUG_RECORDINGS) {
        const result = await storageService.saveWavRecording(socket.id, session.buffers);
        logger.info(
          { socketId: socket.id, fileName: result.fileName, totalBytes: result.totalBytes },
          'DEBUG_WAV_SAVED'
        );
      }

      logger.info({ socketId: socket.id }, 'STT_STARTED');
      const transcript = await sttService.transcribe(session.buffers);
      const sttLatencyMs = Date.now() - sttStart;

      logger.info(
        { socketId: socket.id, transcript, sttLatencyMs },
        'STT_COMPLETED'
      );

      socket.emit(SOCKET_EVENTS.STT_COMPLETED, { transcript, latencyMs: sttLatencyMs });

      // Add user turn to conversation history
      session.conversationHistory.push({ role: 'user', content: transcript });

      // ── Phase 4: LLM ────────────────────────────────────────────────────
      const llmStart = Date.now();
      logger.info({ socketId: socket.id }, 'LLM_STARTED');

      // Trim history to max context window (keeps most-recent turns)
      const contextMessages = session.conversationHistory.slice(-MAX_CONTEXT_MESSAGES);

      let fullResponse = '';

      const requestId = `${socket.id}-${Date.now()}`;
      let sentenceSeq = 0;

      // TokenAggregator prepares sentence-level batches for TTS (Phase 5)
      const aggregator = new TokenAggregator(
        async (sentence) => {
          const currentSeq = sentenceSeq++;
          logger.info({ socketId: socket.id, sentence, seq: currentSeq }, 'LLM_SENTENCE_READY, STARTING TTS');
          try {
            const { audio, sampleRate, words } = await ttsService.synthesize(sentence, requestId);
            logger.info({ socketId: socket.id, seq: currentSeq }, 'TTS_SYNTHESIS_COMPLETE');
            socket.emit(SOCKET_EVENTS.TTS_AUDIO_CHUNK, {
              requestId,
              sequenceNumber: currentSeq,
              audio,
              sampleRate,
              words,
            });
          } catch (err) {
            logger.error({ socketId: socket.id, seq: currentSeq, error: err.message }, 'TTS_SYNTHESIS_FAILED');
          }
        },
        { tokenThreshold: 15 }
      );

      fullResponse = await llmService.generateStream(
        contextMessages,
        (token) => {
          socket.emit(SOCKET_EVENTS.LLM_STREAM_CHUNK, { token });
          aggregator.push(token);
        }
      );

      aggregator.flush();

      const llmLatencyMs = Date.now() - llmStart;
      logger.info(
        { socketId: socket.id, llmLatencyMs, responseLength: fullResponse.length },
        'LLM_COMPLETED'
      );

      // Add assistant turn to history
      if (fullResponse) {
        session.conversationHistory.push({ role: 'assistant', content: fullResponse });
      }

      socket.emit(SOCKET_EVENTS.LLM_STREAM_DONE, { latencyMs: llmLatencyMs });

    } catch (err) {
      logger.error({ socketId: socket.id, error: err.message }, 'PIPELINE_FAILED');
      socket.emit(SOCKET_EVENTS.SESSION_ERROR, { message: 'Something went wrong. Please try again.' });
    } finally {
      // Reset audio buffers — keep conversationHistory for multi-turn conversation
      session.buffers = [];
      session.lastSequence = -1;
      session.startTime = null;
    }
  });

  // ── Connection cleanup ───────────────────────────────────────────────────
  socket.on('disconnect', (reason) => {
    logger.info({ socketId: socket.id, reason }, 'USER_DISCONNECTED');
    sessionMap.delete(socket.id);
  });
}

module.exports = registerAudioHandlers;
