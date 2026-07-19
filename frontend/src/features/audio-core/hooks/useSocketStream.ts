import { useRef, useCallback, useEffect } from 'react';
import { SocketIOStreamer } from '../services/SocketIOStreamer';
import { SOCKET_EVENTS } from 'shared-contracts';
import type { LearningUpdatePayload } from 'shared-contracts';

interface SocketStreamProps {
  socketUrl: string;
  onConnect?: () => void;
  onConnectError?: (err: Error) => void;
  onDisconnect?: (reason: string) => void;
  onSttCompleted?: (data: { transcript: string; latencyMs: number }) => void;
  onLlmStreamChunk?: (data: { token: string }) => void;
  onLlmStreamDone?: (data: { latencyMs: number; totalChunks?: number; suggestions?: string[] }) => void;
  onTtsAudioChunk?: (data: any) => void;
  onSessionError?: (data: { message: string }) => void;
  onLearningUpdate?: (data: LearningUpdatePayload) => void;
}

export function useSocketStream({
  socketUrl,
  onConnect,
  onConnectError,
  onDisconnect,
  onSttCompleted,
  onLlmStreamChunk,
  onLlmStreamDone,
  onTtsAudioChunk,
  onSessionError,
  onLearningUpdate,
}: SocketStreamProps) {
  const streamerRef = useRef<SocketIOStreamer | null>(null);

  if (!streamerRef.current) {
    streamerRef.current = new SocketIOStreamer();
  }

  // Keep callback refs fresh to avoid capturing stale state in socket callbacks
  const onConnectRef = useRef(onConnect);
  onConnectRef.current = onConnect;

  const onConnectErrorRef = useRef(onConnectError);
  onConnectErrorRef.current = onConnectError;

  const onDisconnectRef = useRef(onDisconnect);
  onDisconnectRef.current = onDisconnect;

  const onSttCompletedRef = useRef(onSttCompleted);
  onSttCompletedRef.current = onSttCompleted;

  const onLlmStreamChunkRef = useRef(onLlmStreamChunk);
  onLlmStreamChunkRef.current = onLlmStreamChunk;

  const onLlmStreamDoneRef = useRef(onLlmStreamDone);
  onLlmStreamDoneRef.current = onLlmStreamDone;

  const onTtsAudioChunkRef = useRef(onTtsAudioChunk);
  onTtsAudioChunkRef.current = onTtsAudioChunk;

  const onSessionErrorRef = useRef(onSessionError);
  onSessionErrorRef.current = onSessionError;

  const onLearningUpdateRef = useRef(onLearningUpdate);
  onLearningUpdateRef.current = onLearningUpdate;

  const connectSocket = useCallback(() => {
    streamerRef.current!.connect(socketUrl, {
      onConnect: () => onConnectRef.current?.(),
      onConnectError: (err) => onConnectErrorRef.current?.(err),
      onDisconnect: (reason) => onDisconnectRef.current?.(reason),
    });

    streamerRef.current!.on(SOCKET_EVENTS.STT_COMPLETED, (data) => {
      onSttCompletedRef.current?.(data);
    });

    streamerRef.current!.on(SOCKET_EVENTS.LLM_STREAM_CHUNK, (data) => {
      onLlmStreamChunkRef.current?.(data);
    });

    streamerRef.current!.on(SOCKET_EVENTS.LLM_STREAM_DONE, (data) => {
      onLlmStreamDoneRef.current?.(data);
    });

    streamerRef.current!.on(SOCKET_EVENTS.TTS_AUDIO_CHUNK, (data) => {
      onTtsAudioChunkRef.current?.(data);
    });

    streamerRef.current!.on(SOCKET_EVENTS.SESSION_ERROR, (data) => {
      onSessionErrorRef.current?.(data);
    });

    streamerRef.current!.on(SOCKET_EVENTS.LEARNING_UPDATE, (data) => {
      onLearningUpdateRef.current?.(data);
    });
  }, [socketUrl]);

  const disconnectSocket = useCallback(() => {
    streamerRef.current?.disconnect();
  }, []);

  const sendAudioChunk = useCallback((sequenceNumber: number, pcmBuffer: ArrayBuffer) => {
    streamerRef.current?.sendChunk(sequenceNumber, pcmBuffer);
  }, []);

  const sendSpeechEndSignal = useCallback(() => {
    streamerRef.current?.sendSpeechEnd();
  }, []);

  const sendUserInterruptSignal = useCallback(() => {
    streamerRef.current?.sendUserInterrupt();
  }, []);

  const sendTextInput = useCallback((text: string) => {
    streamerRef.current?.sendTextInput(text);
  }, []);

  const sendTopic = useCallback((topic: string, targetBand?: string, ieltsPart?: string) => {
    streamerRef.current?.sendTopic(topic, targetBand, ieltsPart);
  }, []);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      streamerRef.current?.disconnect();
    };
  }, []);

  return {
    connectSocket,
    disconnectSocket,
    sendAudioChunk,
    sendSpeechEndSignal,
    sendUserInterruptSignal,
    sendTextInput,
    sendTopic,
  };
}
