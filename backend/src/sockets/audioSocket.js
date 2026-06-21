const { SOCKET_EVENTS } = require('shared-contracts');
const { TokenAggregator } = require('@services/ai/tokenAggregator');
const { SessionManager } = require('../session/sessionManager');
const { STATES } = require('../state-machine/fsm');
const configLogger = require('@config/logger');

// Initialize SessionManager with config logger
const sessionManager = new SessionManager(configLogger);

const SAVE_DEBUG_RECORDINGS = process.env.SAVE_DEBUG_RECORDINGS === 'true';
const MAX_CONTEXT_MESSAGES = parseInt(process.env.MAX_CONTEXT_MESSAGES, 10);

if (isNaN(MAX_CONTEXT_MESSAGES)) {
  throw new Error('MAX_CONTEXT_MESSAGES environment variable is missing or invalid.');
}

const SESSION_TIMEOUT = parseInt(process.env.SESSION_TIMEOUT, 10);
if (isNaN(SESSION_TIMEOUT)) {
  throw new Error('SESSION_TIMEOUT environment variable is missing or invalid.');
}

const TTS_TOKEN_THRESHOLD = parseInt(process.env.TTS_TOKEN_THRESHOLD, 10);
if (isNaN(TTS_TOKEN_THRESHOLD)) {
  throw new Error('TTS_TOKEN_THRESHOLD environment variable is missing or invalid.');
}

// Start periodic cleanup of idle sessions (runs every 60 seconds)
setInterval(() => {
  sessionManager.cleanupIdleSessions(SESSION_TIMEOUT);
}, 60000);

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
 * @param {import('../services/audio/ttsService').TtsService} ttsService
 */
function registerAudioHandlers(io, socket, logger, storageService, sttService, llmService, ttsService) {
  
  // Register session with a state transition callback that broadcasts back to client
  const session = sessionManager.createSession(socket.id, (fromState, toState) => {
    socket.emit(SOCKET_EVENTS.STATE_TRANSITION, { state: toState });
  });

  // Client connects exactly when startRecording is called, so transition to LISTENING
  session.fsm.transition(STATES.LISTENING);

  // ── Handle incoming audio chunk packets ─────────────────────────────────
  socket.on(SOCKET_EVENTS.AUDIO_CHUNK, (data) => {
    const session = sessionManager.getSession(socket.id);
    if (!session) {
      logger.warn({ sessionId: socket.id }, 'Received audio-chunk but session state is missing');
      return;
    }

    try {
      // Transition back to LISTENING if it was IDLE or SPEAKING (automatic turn-taking)
      if (session.fsm.state === STATES.IDLE || session.fsm.state === STATES.SPEAKING) {
        session.fsm.transition(STATES.LISTENING);
      }

      // Enforce FSM state: discard chunks if not in LISTENING state (abuse/jitter protection)
      if (session.fsm.state !== STATES.LISTENING) {
        logger.debug(
          { sessionId: socket.id, state: session.fsm.state, requestId: session.currentRequestId || '' },
          'AUDIO_CHUNK_DISCARDED: Session not in LISTENING state'
        );
        return;
      }

      const { sequenceNumber, chunk } = data;

      if (sequenceNumber !== session.lastSequence + 1) {
        logger.warn(
          { sessionId: socket.id, expectedSeq: session.lastSequence + 1, receivedSeq: sequenceNumber, requestId: session.currentRequestId || '' },
          'PACKET_DISORDER_DETECTED (Sequence Jump)'
        );
      }
      session.lastSequence = sequenceNumber;

      if (session.buffers.length === 0) {
        session.startTime = Date.now();
        session.currentRequestId = `req-${socket.id}-${Date.now()}`;
        logger.info(
          { sessionId: socket.id, requestId: session.currentRequestId },
          'USER_STARTED_SPEAKING'
        );
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
        { sessionId: socket.id, seq: sequenceNumber, bytes: audioBuffer.length, requestId: session.currentRequestId || '' },
        'AUDIO_CHUNK_RECEIVED'
      );
    } catch (err) {
      logger.error({ sessionId: socket.id, error: err.message, requestId: session.currentRequestId || '' }, 'Failed to process audio chunk');
    }
  });

  // ── Handle end of speech — triggers STT → LLM pipeline ──────────────────
  socket.on(SOCKET_EVENTS.SPEECH_END, async () => {
    const session = sessionManager.getSession(socket.id);
    if (!session || session.buffers.length === 0) {
      logger.warn({ sessionId: socket.id }, 'Received speech-end but no buffered audio found');
      return;
    }

    const requestId = session.currentRequestId || `req-${socket.id}-${Date.now()}`;
    if (!session.currentRequestId) {
      session.currentRequestId = requestId;
    }

    // Transition to processing state
    try {
      session.fsm.transition(STATES.PROCESSING_STT);
    } catch (err) {
      return; // Invalid transition, ignore
    }

    logger.info(
      { sessionId: socket.id, requestId },
      'VAD_DETECTED_SILENCE'
    );

    const sttStart = Date.now();

    try {
      // ── Phase 3: STT ────────────────────────────────────────────────────
      if (SAVE_DEBUG_RECORDINGS) {
        const result = await storageService.saveWavRecording(socket.id, session.buffers);
        logger.info(
          { sessionId: socket.id, requestId, fileName: result.fileName, totalBytes: result.totalBytes },
          'DEBUG_WAV_SAVED'
        );
      }

      logger.info({ sessionId: socket.id, requestId }, 'STT_STARTED');
      const transcript = await sttService.transcribe(session.buffers);
      const sttLatencyMs = Date.now() - sttStart;

      logger.info(
        { sessionId: socket.id, requestId, transcript, sttLatencyMs },
        'STT_COMPLETED'
      );

      socket.emit(SOCKET_EVENTS.STT_COMPLETED, { transcript, latencyMs: sttLatencyMs });

      // Add user turn to conversation history
      session.conversationHistory.push({ role: 'user', content: transcript });

      // Transition FSM to thinking
      session.fsm.transition(STATES.THINKING);

      // ── Phase 4: LLM ────────────────────────────────────────────────────
      const llmStart = Date.now();
      logger.info({ sessionId: socket.id, requestId }, 'LLM_STARTED');

      // Create a fresh AbortSignal linked to LLM and TTS tasks for this turn
      const signal = session.createAbortSignal();

      // Trim history to max context window (keeps most-recent turns)
      const contextMessages = session.conversationHistory.slice(-MAX_CONTEXT_MESSAGES);

      let fullResponse = '';
      let sentenceSeq = 0;

      // TokenAggregator prepares sentence-level batches for TTS (Phase 5)
      const aggregator = new TokenAggregator(
        async (sentence) => {
          const currentSeq = sentenceSeq++;
          const ttsStart = Date.now();
          logger.info(
            { sessionId: socket.id, requestId, seq: currentSeq, sentence },
            'TTS_STARTED'
          );
          try {
            const { audio, sampleRate, words } = await ttsService.synthesize(sentence, requestId, signal);
            
            // Transition FSM to SPEAKING when the first synthesized chunk is ready
            if (session.fsm.state === STATES.THINKING) {
              session.fsm.transition(STATES.SPEAKING);
            }

            const ttsLatencyMs = Date.now() - ttsStart;
            logger.info(
              { sessionId: socket.id, requestId, seq: currentSeq, ttsLatencyMs },
              'TTS_COMPLETED'
            );
            socket.emit(SOCKET_EVENTS.TTS_AUDIO_CHUNK, {
              requestId,
              sequenceNumber: currentSeq,
              audio,
              sampleRate,
              words,
            });
          } catch (err) {
            if (err.name === 'AbortError' || signal.aborted) {
              logger.info(
                { sessionId: socket.id, requestId, seq: currentSeq },
                'TTS synthesis aborted.'
              );
              return;
            }
            logger.error(
              { sessionId: socket.id, requestId, seq: currentSeq, error: err.message },
              'TTS_SYNTHESIS_FAILED'
            );
          }
        },
        { tokenThreshold: TTS_TOKEN_THRESHOLD }
      );

      let llmFirstTokenReceived = false;

      fullResponse = await llmService.generateStream(
        contextMessages,
        (token) => {
          if (signal.aborted) return;
          if (!llmFirstTokenReceived) {
            llmFirstTokenReceived = true;
            const firstTokenLatencyMs = Date.now() - llmStart;
            logger.info(
              { sessionId: socket.id, requestId, llmLatencyMs: firstTokenLatencyMs },
              'LLM_RESPONSE_RECEIVED'
            );
          }
          socket.emit(SOCKET_EVENTS.LLM_STREAM_CHUNK, { token });
          aggregator.push(token);
        },
        signal
      );

      aggregator.flush();

      const llmLatencyMs = Date.now() - llmStart;
      logger.info(
        { sessionId: socket.id, requestId, llmLatencyMs, responseLength: fullResponse.length },
        'LLM_COMPLETED'
      );

      // Add assistant turn to history
      if (fullResponse && !signal.aborted) {
        session.conversationHistory.push({ role: 'assistant', content: fullResponse });
      }

      if (!signal.aborted) {
        socket.emit(SOCKET_EVENTS.LLM_STREAM_DONE, { latencyMs: llmLatencyMs });
      }

    } catch (err) {
      if (err.name === 'AbortError' || signal.aborted) {
        logger.info(
          { sessionId: socket.id, requestId },
          'Generation task aborted successfully.'
        );
        return;
      }
      logger.error(
        { sessionId: socket.id, requestId, error: err.message },
        'PIPELINE_FAILED'
      );
      socket.emit(SOCKET_EVENTS.SESSION_ERROR, { message: 'Something went wrong. Please try again.' });
      session.fsm.transition(STATES.ERROR);
    } finally {
      // Reset audio buffers
      session.clearBuffers();
    }
  });

  // ── Handle user interruption ──────────────────────────────────────────
  socket.on(SOCKET_EVENTS.USER_INTERRUPT, () => {
    const session = sessionManager.getSession(socket.id);
    if (!session) return;

    logger.info(
      { sessionId: socket.id, requestId: session.currentRequestId || '' },
      'USER_INTERRUPT_RECEIVED'
    );
    try {
      session.fsm.transition(STATES.INTERRUPTED);
      session.abortActiveTasks();
      session.clearBuffers();
      session.fsm.transition(STATES.LISTENING);
    } catch (err) {
      logger.error(
        { sessionId: socket.id, requestId: session.currentRequestId || '', error: err.message },
        'Interruption handler failed'
      );
    }
  });

  // ── Connection cleanup ───────────────────────────────────────────────────
  socket.on('disconnect', (reason) => {
    logger.info({ sessionId: socket.id, reason }, 'USER_DISCONNECTED');
    sessionManager.deleteSession(socket.id);
  });
}

module.exports = registerAudioHandlers;
