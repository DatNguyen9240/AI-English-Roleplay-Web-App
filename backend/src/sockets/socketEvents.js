/**
 * Socket.IO event name constants — single source of truth for the backend.
 *
 * Mirror of: frontend/src/features/audio-core/constants/socketEvents.ts
 * ⚠ If you rename any event here, update the mirror file too.
 */
const SOCKET_EVENTS = {
  // ── Client → Server ────────────────────────────────────────────────────────
  AUDIO_CHUNK:    'audio-chunk',
  SPEECH_END:     'speech-end',
  USER_INTERRUPT: 'user-interrupt',

  // ── Server → Client ────────────────────────────────────────────────────────
  STT_COMPLETED:    'stt-completed',
  LLM_STREAM_CHUNK: 'llm-stream-chunk',
  LLM_STREAM_DONE:  'llm-stream-done',
  TTS_AUDIO_CHUNK:  'tts-audio-chunk',
  STATE_TRANSITION: 'state-transition',
  SESSION_ERROR:    'session-error',
};

module.exports = { SOCKET_EVENTS };
