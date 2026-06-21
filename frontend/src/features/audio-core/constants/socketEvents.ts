/**
 * Socket.IO event name constants — single source of truth for the frontend.
 *
 * Mirror of: backend/src/sockets/socketEvents.js
 * ⚠ If you rename any event here, update the mirror file too.
 */
export const SOCKET_EVENTS = {
  // ── Client → Server ────────────────────────────────────────────────────────
  AUDIO_CHUNK:    'audio-chunk',
  SPEECH_END:     'speech-end',
  USER_INTERRUPT: 'user-interrupt',

  // ── Server → Client ────────────────────────────────────────────────────────
  STT_COMPLETED:    'stt-completed',
  LLM_STREAM_CHUNK: 'llm-stream-chunk',
  LLM_STREAM_DONE:  'llm-stream-done',  // Signals end of LLM token stream for this turn
  TTS_AUDIO_CHUNK:  'tts-audio-chunk',
  STATE_TRANSITION: 'state-transition',
  SESSION_ERROR:    'session-error',
} as const;

/** Union type of all socket event string values */
export type SocketEventValue = (typeof SOCKET_EVENTS)[keyof typeof SOCKET_EVENTS];
