import { io, Socket } from 'socket.io-client';
import { SOCKET_EVENTS } from 'shared-contracts';
import type {
  SttCompletedPayload,
  LlmChunkPayload,
  LlmStreamDonePayload,
  LearningUpdatePayload,
  SessionErrorPayload,
  TtsAudioChunkPayload,
} from 'shared-contracts';

interface StreamerOptions {
  onConnect?: () => void;
  onConnectError?: (err: Error) => void;
  onDisconnect?: (reason: string) => void;
}

/**
 * Typed server → client event map.
 * Keys are derived from SOCKET_EVENTS constants (as const) so renaming
 * a constant automatically propagates the type change.
 */
type ServerEvents = {
  [SOCKET_EVENTS.STT_COMPLETED]:    (payload: SttCompletedPayload)    => void;
  [SOCKET_EVENTS.LLM_STREAM_CHUNK]: (payload: LlmChunkPayload)        => void;
  [SOCKET_EVENTS.LLM_STREAM_DONE]:  (payload: LlmStreamDonePayload)   => void;
  [SOCKET_EVENTS.TTS_AUDIO_CHUNK]:  (payload: TtsAudioChunkPayload)   => void;
  [SOCKET_EVENTS.SESSION_ERROR]:    (payload: SessionErrorPayload)     => void;
  [SOCKET_EVENTS.LEARNING_UPDATE]:  (payload: LearningUpdatePayload)   => void;
};

/**
 * WebSocket streaming provider using Socket.IO.
 * Complies with README Section 7.5: Swappable network interface pattern.
 */
export class SocketIOStreamer {
  private socket: Socket | null = null;

  /**
   * Establishes socket connection and maps lifecycle callbacks.
   * Safely disconnects any previous socket before creating a new one.
   */
  connect(socketUrl: string, options: StreamerOptions = {}): void {
    if (this.socket) {
      this.disconnect();
    }

    this.socket = io(socketUrl, {
      transports: ['websocket'],
      withCredentials: true,
      auth: { learnerKey: getLearnerKey() },
    });

    if (options.onConnect)      this.socket.on('connect',       options.onConnect);
    if (options.onConnectError) this.socket.on('connect_error', options.onConnectError);
    if (options.onDisconnect)   this.socket.on('disconnect',    options.onDisconnect);
  }

  /** Subscribes to a typed server-emitted event */
  on<K extends keyof ServerEvents>(event: K, handler: ServerEvents[K]): void {
    if (this.socket) {
      // Cast socket to avoid socket.io-client's complex FallbackToUntypedListener type.
      // Type safety is enforced at the call-site via the ServerEvents generic.
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (this.socket as any).on(event, handler);
    }
  }

  /** Emits a raw PCM audio chunk to the server */
  sendChunk(sequenceNumber: number, pcmBuffer: ArrayBuffer): void {
    if (this.socket?.connected) {
      this.socket.emit(SOCKET_EVENTS.AUDIO_CHUNK, { sequenceNumber, chunk: pcmBuffer });
    }
  }

  /** Signals the server that voice activity has ceased */
  sendSpeechEnd(): void {
    if (this.socket?.connected) {
      this.socket.emit(SOCKET_EVENTS.SPEECH_END);
    }
  }

  /** Signals the server that the user has interrupted the playback */
  sendUserInterrupt(): void {
    if (this.socket?.connected) {
      this.socket.emit(SOCKET_EVENTS.USER_INTERRUPT);
    }
  }

  /** Sends a text input message to the server */
  sendTextInput(text: string): void {
    if (this.socket?.connected) {
      this.socket.emit(SOCKET_EVENTS.TEXT_INPUT, { text });
    }
  }

  /** Emits a custom topic to start a topic-specific roleplay */
  sendTopic(topic: string, targetBand?: string, ieltsPart?: string): void {
    if (this.socket?.connected) {
      this.socket.emit(SOCKET_EVENTS.SET_TOPIC, { topic, targetBand, ieltsPart });
    }
  }

  /** Disconnects and clears the socket reference */
  disconnect(): void {
    if (this.socket) {
      this.socket.disconnect();
      this.socket = null;
    }
  }
}

function getLearnerKey(): string {
  const storageKey = 'ai_tutor_learner_key';
  const existing = window.localStorage.getItem(storageKey);
  if (existing) return existing;
  const learnerKey = window.crypto?.randomUUID?.() || `learner-${Date.now()}-${Math.random().toString(36).slice(2)}`;
  window.localStorage.setItem(storageKey, learnerKey);
  return learnerKey;
}
