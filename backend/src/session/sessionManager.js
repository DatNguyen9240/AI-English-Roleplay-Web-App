const { ConversationFSM } = require('../state-machine/fsm');

class Session {
  /**
   * @param {string} socketId - Unique socket connection identifier
   * @param {import('pino').Logger} logger - Pino logger instance
   * @param {function} [onStateTransition] - Optional transition callback
   */
  constructor(socketId, logger, onStateTransition = null) {
    this.socketId = socketId;
    this.logger = logger;
    this.fsm = new ConversationFSM(logger, onStateTransition);
    
    // Audio accumulation
    this.buffers = [];
    this.lastSequence = -1;
    this.startTime = null;
    
    // Conversation history
    this.conversationHistory = []; // Array of { role: 'user'|'assistant', content: string }
    
    // Cancellation tokens for current turn
    this.abortController = null;
    this.lastActiveTime = Date.now();
  }

  /**
   * Creates a fresh AbortSignal for LLM and TTS tasks.
   * Instantly aborts any active tasks from a prior turn first.
   * @returns {AbortSignal}
   */
  createAbortSignal() {
    this.abortActiveTasks();
    this.abortController = new AbortController();
    this.logger.debug({ socketId: this.socketId }, 'Created new AbortController for active turn');
    return this.abortController.signal;
  }

  /**
   * Aborts active LLM stream and TTS HTTP requests.
   */
  abortActiveTasks() {
    if (this.abortController) {
      this.logger.info({ socketId: this.socketId }, 'Aborting active LLM/TTS tasks');
      this.abortController.abort();
      this.abortController = null;
    }
  }

  /**
   * Resets audio accumulation buffers.
   */
  clearBuffers() {
    this.buffers = [];
    this.lastSequence = -1;
    this.startTime = null;
  }

  /**
   * Updates last active timestamp to prevent session timeout.
   */
  touch() {
    this.lastActiveTime = Date.now();
  }
}

class SessionManager {
  /**
   * @param {import('pino').Logger} logger - Pino logger instance
   */
  constructor(logger) {
    this.logger = logger;
    this.sessions = new Map();
  }

  /**
   * Creates and registers a new conversation session.
   * @param {string} socketId
   * @param {function} [onStateTransition]
   * @returns {Session}
   */
  createSession(socketId, onStateTransition = null) {
    const session = new Session(socketId, this.logger, onStateTransition);
    this.sessions.set(socketId, session);
    this.logger.info({ socketId }, 'Session registered in SessionManager');
    return session;
  }

  /**
   * Retrieves an active conversation session.
   * @param {string} socketId
   * @returns {Session|undefined}
   */
  getSession(socketId) {
    const session = this.sessions.get(socketId);
    if (session) {
      session.touch();
    }
    return session;
  }

  /**
   * Aborts and cleans up a session.
   * @param {string} socketId
   */
  deleteSession(socketId) {
    const session = this.sessions.get(socketId);
    if (session) {
      session.abortActiveTasks();
      this.sessions.delete(socketId);
      this.logger.info({ socketId }, 'Session destroyed and removed from SessionManager');
    }
  }

  /**
   * Cleans up sessions that have been inactive for longer than the timeout period.
   * @param {number} maxAgeMs - Maximum allowed duration of inactivity (e.g. 3 minutes)
   */
  cleanupIdleSessions(maxAgeMs) {
    const now = Date.now();
    for (const [socketId, session] of this.sessions.entries()) {
      const age = now - session.lastActiveTime;
      if (age > maxAgeMs) {
        this.logger.warn(
          { socketId, idleTimeMinutes: (age / 60000).toFixed(1) },
          'Session timeout: Inactivity limit reached. Destroying session.'
        );
        this.deleteSession(socketId);
      }
    }
  }
}

module.exports = { Session, SessionManager };
