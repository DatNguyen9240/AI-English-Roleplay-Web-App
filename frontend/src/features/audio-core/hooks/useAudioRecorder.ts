import { useState, useRef, useCallback, useEffect } from 'react';
import { audioConfig } from '../config/audioConfig';
import { PlaybackQueueManager } from '../queue/PlaybackQueueManager';
import { logger } from '@/utils/logger';
import { RecordingStatus } from 'shared-contracts';

// Import sub-hooks
import { useSpeechRecognition } from './useSpeechRecognition';
import { useAudioCapture } from './useAudioCapture';
import { useSocketStream } from './useSocketStream';

export interface ChatMessage {
  id: string;
  sender: 'user' | 'ai';
  text: string;
  timestamp: number;
}

export interface UseAudioRecorderReturn {
  isRecording: boolean;
  status: RecordingStatus;
  rmsVolume: number;
  transcript: string;
  llmText: string;
  chatHistory: ChatMessage[];
  currentPlayingSentence: string;
  highlightedWordIndex: number;
  startRecording: (topic?: string) => Promise<void>;
  stopRecording: () => void;
  sendTextMessage: (text: string) => void;
  useBrowserTts: boolean;
  toggleBrowserTts: (val: boolean) => void;
  useBrowserStt: boolean;
  toggleBrowserStt: (val: boolean) => void;
  startMicManual: () => Promise<void>;
  resetSession: () => void;
  ttsVoiceName: string | null;
  changeTtsVoiceName: (val: string | null) => void;
  ttsRate: number;
  changeTtsRate: (val: number) => void;
  availableVoices: SpeechSynthesisVoice[];
  suggestions: string[];
}

/**
 * Main turn-taking coordination hook.
 * Composes useSpeechRecognition, useAudioCapture, and useSocketStream.
 */
export function useAudioRecorder(socketUrl: string): UseAudioRecorderReturn {
  const [isRecording, setIsRecording] = useState(false);
  const [status, setStatus] = useState<RecordingStatus>('IDLE');
  const [llmText, setLlmText] = useState('');
  const [chatHistory, setChatHistory] = useState<ChatMessage[]>([]);
  const [currentPlayingSentence, setCurrentPlayingSentence] = useState('');
  const [highlightedWordIndex, setHighlightedWordIndex] = useState(-1);
  const [suggestions, setSuggestions] = useState<string[]>([]);

  // Settings & Preferences stored in LocalStorage
  const [useBrowserTts, setUseBrowserTts] = useState<boolean>(() => {
    if (typeof window !== 'undefined') {
      const stored = localStorage.getItem('use_browser_tts');
      return stored !== 'false';
    }
    return true;
  });

  const [useBrowserStt, setUseBrowserStt] = useState<boolean>(() => {
    if (typeof window !== 'undefined') {
      const stored = localStorage.getItem('use_browser_stt');
      return stored !== 'false';
    }
    return true;
  });

  const [ttsVoiceName, setTtsVoiceName] = useState<string | null>(() => {
    if (typeof window !== 'undefined') {
      return localStorage.getItem('tts_voice_name');
    }
    return null;
  });

  const [ttsRate, setTtsRate] = useState<number>(() => {
    if (typeof window !== 'undefined') {
      const stored = localStorage.getItem('tts_rate');
      return stored ? parseFloat(stored) : 1.0;
    }
    return 1.0;
  });

  const [availableVoices, setAvailableVoices] = useState<SpeechSynthesisVoice[]>([]);

  // Refs for tracking active context/timeouts
  const statusRef = useRef<RecordingStatus>('IDLE');
  statusRef.current = status;

  const topicRef = useRef<string | undefined>(undefined);
  const audioContextRef = useRef<AudioContext | null>(null);
  const playoutQueueRef = useRef<PlaybackQueueManager | null>(null);
  const sttTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const llmTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Toggle callbacks
  const toggleBrowserTts = useCallback((val: boolean) => {
    setUseBrowserTts(val);
    if (typeof window !== 'undefined') {
      localStorage.setItem('use_browser_tts', String(val));
    }
    if (playoutQueueRef.current) {
      playoutQueueRef.current.useBrowserTts = val;
    }
  }, []);

  const toggleBrowserStt = useCallback((val: boolean) => {
    setUseBrowserStt(val);
    if (typeof window !== 'undefined') {
      localStorage.setItem('use_browser_stt', String(val));
    }
  }, []);

  const changeTtsVoiceName = useCallback((val: string | null) => {
    setTtsVoiceName(val);
    if (typeof window !== 'undefined') {
      if (val) localStorage.setItem('tts_voice_name', val);
      else localStorage.removeItem('tts_voice_name');
    }
    if (playoutQueueRef.current) {
      playoutQueueRef.current.ttsVoiceName = val;
      playoutQueueRef.current.applySettingsImmediately();
    }
  }, []);

  const changeTtsRate = useCallback((val: number) => {
    setTtsRate(val);
    if (typeof window !== 'undefined') {
      localStorage.setItem('tts_rate', String(val));
    }
    if (playoutQueueRef.current) {
      playoutQueueRef.current.ttsRate = val;
      playoutQueueRef.current.applySettingsImmediately();
    }
  }, []);

  // Fetch Speech Synthesis Voices
  useEffect(() => {
    if (typeof window === 'undefined' || !window.speechSynthesis) return;
    const updateVoices = () => {
      const voices = window.speechSynthesis.getVoices();
      const enVoices = voices.filter(v => v.lang.startsWith('en'));
      setAvailableVoices(enVoices);
    };

    updateVoices();
    if ('onvoiceschanged' in window.speechSynthesis) {
      window.speechSynthesis.onvoiceschanged = updateVoices;
    }
    return () => {
      if (window.speechSynthesis && 'onvoiceschanged' in window.speechSynthesis) {
        window.speechSynthesis.onvoiceschanged = null;
      }
    };
  }, []);

  // State transitions
  const updateStatus = useCallback((newStatus: RecordingStatus) => {
    setStatus(newStatus);
    statusRef.current = newStatus;
  }, []);

  // ── 1. useSpeechRecognition hook ──
  const {
    transcript,
    startSpeechRecognition,
    stopSpeechRecognition,
    resetSpeechTranscript,
  } = useSpeechRecognition();

  // ── 2. useSocketStream hook ──
  const handleConnect = useCallback(() => {
    logger.log('[Socket] Connected to backend');
    if (topicRef.current) {
      logger.log('[useAudioRecorder] Sending custom topic to backend:', topicRef.current);
      sendTopic(topicRef.current);
    }
  }, []);

  const handleConnectError = useCallback((err: Error) => {
    logger.error('[Socket] Connection error:', err.message);
    updateStatus('ERROR');
    stopAudio();
  }, []);

  const handleDisconnect = useCallback((reason: string) => {
    if (reason !== 'io client disconnect') {
      logger.warn('[Socket] Unexpected disconnect:', reason);
    }
  }, []);

  const handleSttCompleted = useCallback(({ transcript: text, latencyMs }: { transcript: string; latencyMs: number }) => {
    clearTimeout(sttTimeoutRef.current ?? undefined);
    logger.log(`[STT] Completed in ${latencyMs}ms: "${text}"`);
    setLlmText('');
    setCurrentPlayingSentence('');
    setHighlightedWordIndex(-1);
    updateStatus('THINKING');

    setChatHistory((prev) => [
      ...prev,
      {
        id: `user-${Date.now()}-${Math.random().toString(36).substring(2, 11)}`,
        sender: 'user',
        text: text,
        timestamp: Date.now(),
      },
    ]);

    llmTimeoutRef.current = setTimeout(() => {
      logger.warn('[LLM] Timeout — no llm-stream-done received');
      updateStatus('ERROR');
      disconnectSocket();
    }, audioConfig.llmTimeoutMs);
  }, []);

  const handleLlmStreamChunk = useCallback(({ token }: { token: string }) => {
    setLlmText((prev) => {
      const nextText = prev + token;

      setChatHistory((history) => {
        const lastMsg = history[history.length - 1];
        if (lastMsg && lastMsg.sender === 'ai' && lastMsg.id === 'ai-current') {
          return [
            ...history.slice(0, -1),
            {
              ...lastMsg,
              text: nextText,
            },
          ];
        } else {
          return [
            ...history,
            {
              id: 'ai-current',
              sender: 'ai',
              text: token,
              timestamp: Date.now(),
            },
          ];
        }
      });

      return nextText;
    });
  }, []);

  const handleLlmStreamDone = useCallback(({ latencyMs, totalChunks, suggestions: suggestedAnswers }: { latencyMs: number; totalChunks?: number; suggestions?: string[] }) => {
    clearTimeout(llmTimeoutRef.current ?? undefined);
    logger.log(`[LLM] Stream done in ${latencyMs}ms. Total chunks: ${totalChunks}`);

    if (playoutQueueRef.current && typeof totalChunks === 'number') {
      playoutQueueRef.current.setTotalChunks(totalChunks);
    }

    if (Array.isArray(suggestedAnswers)) {
      setSuggestions(suggestedAnswers);
    } else {
      setSuggestions([]);
    }
  }, []);

  const handleTtsAudioChunk = useCallback((data: any) => {
    logger.log(`[TTS] Received chunk sequence: ${data.sequenceNumber}`);
    if (playoutQueueRef.current) {
      playoutQueueRef.current.enqueue({
        requestId: data.requestId,
        sequenceNumber: data.sequenceNumber,
        audio: data.audio,
        sampleRate: data.sampleRate,
        words: data.words,
      });
    }
  }, []);

  const handleSessionError = useCallback(({ message }: { message: string }) => {
    clearTimeout(sttTimeoutRef.current ?? undefined);
    clearTimeout(llmTimeoutRef.current ?? undefined);
    logger.error('[Socket] Session error:', message);
    updateStatus('ERROR');
    disconnectSocket();
    playoutQueueRef.current?.stop();
  }, []);

  const {
    connectSocket,
    disconnectSocket,
    sendAudioChunk,
    sendSpeechEndSignal,
    sendUserInterruptSignal,
    sendTextInput,
    sendTopic,
  } = useSocketStream({
    socketUrl,
    onConnect: handleConnect,
    onConnectError: handleConnectError,
    onDisconnect: handleDisconnect,
    onSttCompleted: handleSttCompleted,
    onLlmStreamChunk: handleLlmStreamChunk,
    onLlmStreamDone: handleLlmStreamDone,
    onTtsAudioChunk: handleTtsAudioChunk,
    onSessionError: handleSessionError,
  });

  // ── 3. useAudioCapture hook ──
  const handlePcmChunk = useCallback((pcm16: ArrayBuffer, sequence: number) => {
    sendAudioChunk(sequence, pcm16);
  }, [sendAudioChunk]);

  const handleSilenceDetected = useCallback(() => {
    logger.log('[VAD] Silence detected — triggering speech-end');
    stopRecording();
  }, []);

  const handleInterruptionDetected = useCallback((volume: number) => {
    logger.log(`[VAD] Interruption detected. Volume: ${volume.toFixed(3)}`);
    triggerInterruption();
  }, []);

  const {
    rmsVolume,
    setRmsVolume,
    startCapture,
    stopCapture,
    resetCaptureBuffers,
  } = useAudioCapture({
    status,
    onPcmChunk: handlePcmChunk,
    onSilenceDetected: handleSilenceDetected,
    onInterruptionDetected: handleInterruptionDetected,
  });

  // Action methods
  const stopAudio = useCallback(() => {
    setIsRecording(false);
    stopCapture();
  }, [stopCapture]);

  const triggerInterruption = useCallback(() => {
    if (statusRef.current !== 'SPEAKING') {
      logger.warn('[useAudioRecorder] triggerInterruption called but state is not SPEAKING:', statusRef.current);
      return;
    }
    updateStatus('LISTENING');

    logger.log('[useAudioRecorder] USER INTERRUPTED AI — Triggering local interruption cleanup');
    playoutQueueRef.current?.stop();
    setCurrentPlayingSentence('');
    setHighlightedWordIndex(-1);

    sendUserInterruptSignal();

    setChatHistory((history) =>
      history.map((msg) =>
        msg.id === 'ai-current'
          ? {
              ...msg,
              id: `ai-${Date.now()}-${Math.random().toString(36).substring(2, 11)}`,
              text: msg.text.trim() + '... [interrupted]',
            }
          : msg
      )
    );

    resetCaptureBuffers();
    setIsRecording(true);
  }, [updateStatus, sendUserInterruptSignal, resetCaptureBuffers]);

  const sendTextMessage = useCallback((text: string): void => {
    if (!text.trim()) return;
    logger.log('[useAudioRecorder] Sending user text message:', text);
    
    resetCaptureBuffers();
    sendTextInput(text);
    updateStatus('PROCESSING');
  }, [resetCaptureBuffers, sendTextInput, updateStatus]);

  const stopRecording = useCallback((): void => {
    setIsRecording(false);
    setRmsVolume(0);

    if (useBrowserStt) {
      const textVal = stopSpeechRecognition();
      if (textVal.trim()) {
        sendTextMessage(textVal);
      } else {
        updateStatus('IDLE');
      }
      return;
    }

    updateStatus('PROCESSING');
    sendSpeechEndSignal();
    stopAudio();

    sttTimeoutRef.current = setTimeout(() => {
      logger.warn('[STT] Timeout — no stt-completed received');
      updateStatus('ERROR');
      disconnectSocket();
    }, audioConfig.sttTimeoutMs);
  }, [useBrowserStt, stopSpeechRecognition, sendTextMessage, updateStatus, sendSpeechEndSignal, stopAudio, disconnectSocket]);

  const startMicManual = useCallback(async () => {
    resetSpeechTranscript();
    setIsRecording(true);
    updateStatus('LISTENING');

    if (useBrowserStt) {
      startSpeechRecognition(() => {
        updateStatus('ERROR');
      });
      return;
    }

    try {
      if (!audioContextRef.current || audioContextRef.current.state === 'closed') {
        audioContextRef.current = new window.AudioContext();
      }
      const audioContext = audioContextRef.current;
      if (audioContext.state === 'suspended') {
        await audioContext.resume();
      }

      await startCapture(audioContext);
    } catch (err) {
      logger.error('[Manual Mic] Failed to start:', err);
      updateStatus('ERROR');
    }
  }, [useBrowserStt, startSpeechRecognition, resetSpeechTranscript, startCapture, updateStatus]);

  const startRecording = useCallback(async (topic?: string): Promise<void> => {
    setIsRecording(false);
    updateStatus('THINKING');
    resetSpeechTranscript();
    setLlmText('');
    setChatHistory([]);
    setCurrentPlayingSentence('');
    setHighlightedWordIndex(-1);
    setSuggestions([]);
    
    playoutQueueRef.current?.stop();
    resetCaptureBuffers();

    topicRef.current = topic;

    try {
      connectSocket();

      if (!audioContextRef.current || audioContextRef.current.state === 'closed') {
        audioContextRef.current = new window.AudioContext();
      }
      const audioContext = audioContextRef.current;
      if (audioContext.state === 'suspended') {
        await audioContext.resume();
      }

      const queue = new PlaybackQueueManager(audioContext);
      queue.useBrowserTts = useBrowserTts;
      queue.ttsVoiceName = ttsVoiceName;
      queue.ttsRate = ttsRate;
      queue.onSentenceStart = (sentenceText) => {
        setCurrentPlayingSentence(sentenceText);
        setHighlightedWordIndex(-1);
        updateStatus('SPEAKING');
      };
      queue.onWordSpoken = (_wordText, index) => {
        setHighlightedWordIndex(index);
      };
      queue.onQueueEmpty = () => {
        logger.log('[useAudioRecorder] Playout queue empty. Turn complete');
        setCurrentPlayingSentence('');
        setHighlightedWordIndex(-1);
        
        setChatHistory((history) =>
          history.map((msg) =>
            msg.id === 'ai-current'
              ? { ...msg, id: `ai-${Date.now()}-${Math.random().toString(36).substring(2, 11)}` }
              : msg
          )
        );

        stopAudio();
        updateStatus('IDLE');
      };
      playoutQueueRef.current = queue;
    } catch (err) {
      logger.error('[Audio] Failed to start recording:', err);
      updateStatus('ERROR');
      stopAudio();
      disconnectSocket();
    }
  }, [
    useBrowserTts,
    ttsVoiceName,
    ttsRate,
    resetSpeechTranscript,
    resetCaptureBuffers,
    connectSocket,
    stopAudio,
    disconnectSocket,
    updateStatus,
  ]);

  const forceCleanup = useCallback((): void => {
    clearTimeout(sttTimeoutRef.current ?? undefined);
    clearTimeout(llmTimeoutRef.current ?? undefined);
    stopAudio();
    sendSpeechEndSignal();
    disconnectSocket();
    
    if (audioContextRef.current && audioContextRef.current.state !== 'closed') {
      audioContextRef.current.close();
      audioContextRef.current = null;
    }
    playoutQueueRef.current?.stop();
    playoutQueueRef.current = null;
  }, [stopAudio, sendSpeechEndSignal, disconnectSocket]);

  useEffect(() => {
    return () => forceCleanup();
  }, [forceCleanup]);

  const resetSession = useCallback((): void => {
    forceCleanup();
    updateStatus('IDLE');
    resetSpeechTranscript();
    setLlmText('');
    setChatHistory([]);
    setCurrentPlayingSentence('');
    setHighlightedWordIndex(-1);
    setSuggestions([]);
  }, [forceCleanup, resetSpeechTranscript, updateStatus]);

  return {
    isRecording,
    status,
    rmsVolume,
    transcript,
    llmText,
    chatHistory,
    currentPlayingSentence,
    highlightedWordIndex,
    startRecording,
    stopRecording,
    sendTextMessage,
    useBrowserTts,
    toggleBrowserTts,
    useBrowserStt,
    toggleBrowserStt,
    startMicManual,
    resetSession,
    ttsVoiceName,
    changeTtsVoiceName,
    ttsRate,
    changeTtsRate,
    availableVoices,
    suggestions,
  };
}
