const STATES = {
  IDLE: 'IDLE',
  LISTENING: 'LISTENING',
  PROCESSING_STT: 'PROCESSING_STT',
  THINKING: 'THINKING',
  SPEAKING: 'SPEAKING',
  INTERRUPTED: 'INTERRUPTED',
  ERROR: 'ERROR',
};

const ALLOWED_TRANSITIONS = {
  [STATES.IDLE]: [STATES.LISTENING],
  [STATES.LISTENING]: [STATES.PROCESSING_STT, STATES.ERROR, STATES.IDLE],
  [STATES.PROCESSING_STT]: [STATES.THINKING, STATES.ERROR, STATES.IDLE],
  [STATES.THINKING]: [STATES.SPEAKING, STATES.ERROR, STATES.IDLE],
  [STATES.SPEAKING]: [STATES.LISTENING, STATES.INTERRUPTED, STATES.ERROR, STATES.IDLE],
  [STATES.INTERRUPTED]: [STATES.LISTENING, STATES.ERROR, STATES.IDLE],
  [STATES.ERROR]: [STATES.IDLE],
};

class ConversationFSM {
  constructor(logger, onStateTransition = null) {
    this.logger = logger;
    this.currentState = STATES.IDLE;
    this.onStateTransition = onStateTransition;
  }

  /**
   * Attempts to transition to a new state.
   * Throws an error if the transition is invalid.
   * @param {string} toState - Target state
   */
  transition(toState) {
    if (!STATES[toState]) {
      throw new Error(`Invalid state name: "${toState}"`);
    }

    const allowed = ALLOWED_TRANSITIONS[this.currentState];
    // Allow transitioning to ERROR or IDLE from any state as an emergency reset/cleanup
    const isAllowed = allowed.includes(toState) || toState === STATES.ERROR || toState === STATES.IDLE;

    if (!isAllowed) {
      const errMsg = `Invalid state transition: Cannot transition from ${this.currentState} to ${toState}`;
      this.logger.warn({ fromState: this.currentState, toState }, errMsg);
      throw new Error(errMsg);
    }

    const fromState = this.currentState;
    this.currentState = toState;
    
    this.logger.info(
      { fromState, toState },
      `STATE_TRANSITION: ${fromState} -> ${toState}`
    );

    if (this.onStateTransition) {
      this.onStateTransition(fromState, toState);
    }
  }

  get state() {
    return this.currentState;
  }
}

module.exports = { STATES, ConversationFSM };
