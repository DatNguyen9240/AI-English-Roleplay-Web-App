import { useState, useRef, useCallback, useEffect } from 'react';
import { audioConfig } from '../config/audioConfig';
import { PlaybackQueueManager, robustSpeechCancel } from '../queue/PlaybackQueueManager';
import { pickSantaVoice, SANTA_VOICE_ID, SANTA_VOICE_PITCH, SANTA_VOICE_RATE } from '../voicePresets';
import { logger } from '@/utils/logger';
import { Lipsync } from 'wawa-lipsync';
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
  startRecording: (topic?: string, targetBand?: string, ieltsPart?: string) => Promise<void>;
  stopRecording: () => void;
  sendTextMessage: (text: string) => void;
  useBrowserTts: boolean;
  toggleBrowserTts: (val: boolean) => void;
  useBrowserStt: boolean;
  toggleBrowserStt: (val: boolean) => void;
  startMicManual: () => Promise<void>;
  interruptAi: () => void;
  resetSession: () => void;
  ttsVoiceName: string | null;
  changeTtsVoiceName: (val: string | null) => void;
  ttsRate: number;
  changeTtsRate: (val: number) => void;
  availableVoices: SpeechSynthesisVoice[];
  isVoiceReady: boolean;
  suggestions: string[];
  speakText: (text: string) => void;
  currentlySpeakingText: string | null;
  lipsyncManager: any;
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
  const [currentlySpeakingText, setCurrentlySpeakingText] = useState<string | null>(null);
  const activeSpeakIdRef = useRef<number>(0);
  const lipsyncManagerRef = useRef<any>(null);

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
  // Browser voices are populated asynchronously (and often only after the first render).
  // Do not let the first tutor reply race this initialization.
  const [isVoiceReady, setIsVoiceReady] = useState(() => {
    return typeof window === 'undefined' || !window.speechSynthesis || !useBrowserTts;
  });

  // Refs for tracking active context/timeouts
  const statusRef = useRef<RecordingStatus>('IDLE');
  statusRef.current = status;

  const topicRef = useRef<string | undefined>(undefined);
  const targetBandRef = useRef<string | undefined>(undefined);
  const ieltsPartRef = useRef<string | undefined>(undefined);
  const audioContextRef = useRef<AudioContext | null>(null);
  const playoutQueueRef = useRef<PlaybackQueueManager | null>(null);
  const sttTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const llmTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const hasInitialResponseTextRef = useRef(false);
  const isInitialPlaybackReleasedRef = useRef(false);
  const pendingInitialTtsChunksRef = useRef<any[]>([]);
  const llmTextBufferRef = useRef('');
  const llmRenderTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const enqueueTtsChunk = useCallback((data: any) => {
    playoutQueueRef.current?.enqueue({
      requestId: data.requestId,
      sequenceNumber: data.sequenceNumber,
      audio: data.audio,
      sampleRate: data.sampleRate,
      words: data.words,
    });
  }, []);

  const releaseInitialPlayback = useCallback(() => {
    if (isInitialPlaybackReleasedRef.current) return;

    isInitialPlaybackReleasedRef.current = true;
    const pendingChunks = pendingInitialTtsChunksRef.current.splice(0);
    pendingChunks.forEach(enqueueTtsChunk);
  }, [enqueueTtsChunk]);

  const flushLlmText = useCallback(() => {
    if (llmRenderTimeoutRef.current) {
      clearTimeout(llmRenderTimeoutRef.current);
      llmRenderTimeoutRef.current = null;
    }

    const nextText = llmTextBufferRef.current;
    if (!nextText) return;

    setLlmText(nextText);
    setChatHistory((history) => {
      const lastMsg = history[history.length - 1];
      if (lastMsg && lastMsg.sender === 'ai' && lastMsg.id === 'ai-current') {
        return [...history.slice(0, -1), { ...lastMsg, text: nextText }];
      }
      return [
        ...history,
        {
          id: 'ai-current',
          sender: 'ai',
          text: nextText,
          timestamp: Date.now(),
        },
      ];
    });
  }, []);

  const warmBrowserSpeech = useCallback((): Promise<void> => {
    if (!useBrowserTts || typeof window === 'undefined' || !window.speechSynthesis) {
      return Promise.resolve();
    }

    // This is called synchronously from the Start button handler. A silent,
    // zero-volume utterance wakes Chrome/Safari's speech engine without making
    // the learner hear a sound, so the first real tutor sentence does not pay
    // the engine-startup cost.
    return new Promise((resolve) => {
      let settled = false;
      const finish = () => {
        if (!settled) {
          settled = true;
          window.clearTimeout(timeout);
          resolve();
        }
      };
      const timeout = window.setTimeout(finish, 300);

      try {
        const utterance = new SpeechSynthesisUtterance('warmup');
        utterance.volume = 0;
        utterance.rate = 10;
        utterance.onend = finish;
        utterance.onerror = finish;
        window.speechSynthesis.speak(utterance);
      } catch (error) {
        logger.warn('[Speech] Silent browser TTS warmup failed; continuing normally.', error);
        finish();
      }
    });
  }, [useBrowserTts]);

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

  // Fetch and warm up Speech Synthesis voices before a session can start.
  useEffect(() => {
    if (!useBrowserTts || typeof window === 'undefined' || !window.speechSynthesis) {
      setIsVoiceReady(true);
      return;
    }

    let isMounted = true;
    const updateVoices = () => {
      const voices = window.speechSynthesis.getVoices();
      const enVoices = voices.filter(v => v.lang.startsWith('en'));
      setAvailableVoices(enVoices);
      if (enVoices.length > 0 && isMounted) {
        setIsVoiceReady(true);
      }
    };

    setIsVoiceReady(false);
    updateVoices();
    window.speechSynthesis.addEventListener?.('voiceschanged', updateVoices);

    // Some browsers never fire voiceschanged. Their default voice still works, so
    // release the gate after a short grace period instead of blocking the app forever.
    const fallbackTimeout = window.setTimeout(() => {
      if (isMounted) {
        logger.warn('[Speech] Timed out waiting for an English system voice; using the browser default.');
        setIsVoiceReady(true);
      }
    }, 3500);

    return () => {
      isMounted = false;
      window.clearTimeout(fallbackTimeout);
      window.speechSynthesis.removeEventListener?.('voiceschanged', updateVoices);
    };
  }, [useBrowserTts]);

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
      logger.log('[useAudioRecorder] Sending custom topic to backend:', topicRef.current, targetBandRef.current, ieltsPartRef.current);
      sendTopic(topicRef.current, targetBandRef.current, ieltsPartRef.current);
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
    clearTimeout(llmRenderTimeoutRef.current ?? undefined);
    llmRenderTimeoutRef.current = null;
    llmTextBufferRef.current = '';
    setLlmText('');
    setCurrentPlayingSentence('');
    setHighlightedWordIndex(-1);
    updateStatus('THINKING');

    robustSpeechCancel();
    setCurrentlySpeakingText(null);

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
    // The first response text must be committed to the screen before the first
    // TTS chunk may play. Two animation frames let React paint the new bubble.
    if (!hasInitialResponseTextRef.current) {
      hasInitialResponseTextRef.current = true;
      if (typeof window !== 'undefined' && window.requestAnimationFrame) {
        window.requestAnimationFrame(() => {
          window.requestAnimationFrame(releaseInitialPlayback);
        });
      } else {
        releaseInitialPlayback();
      }
    }

    llmTextBufferRef.current += token;
    // Render streamed text at most 12 times/sec. Rendering every token makes
    // the full chat and 3D workspace reconcile unnecessarily on fast models.
    if (!llmRenderTimeoutRef.current) {
      llmRenderTimeoutRef.current = setTimeout(flushLlmText, 80);
    }
  }, [flushLlmText, releaseInitialPlayback]);

  const handleLlmStreamDone = useCallback(({ latencyMs, totalChunks, suggestions: suggestedAnswers }: { latencyMs: number; totalChunks?: number; suggestions?: string[] }) => {
    clearTimeout(llmTimeoutRef.current ?? undefined);
    flushLlmText();
    logger.log(`[LLM] Stream done in ${latencyMs}ms. Total chunks: ${totalChunks}`);

    if (playoutQueueRef.current && typeof totalChunks === 'number') {
      playoutQueueRef.current.setTotalChunks(totalChunks);
    }

    if (Array.isArray(suggestedAnswers)) {
      setSuggestions(suggestedAnswers);
    } else {
      setSuggestions([]);
    }
  }, [flushLlmText]);

  const handleTtsAudioChunk = useCallback((data: any) => {
    logger.log(`[TTS] Received chunk sequence: ${data.sequenceNumber}`);
    if (!isInitialPlaybackReleasedRef.current) {
      pendingInitialTtsChunksRef.current.push(data);
      return;
    }
    enqueueTtsChunk(data);
  }, [enqueueTtsChunk]);

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
            }
          : msg
      )
    );

    resetCaptureBuffers();
    setIsRecording(true);
  }, [updateStatus, sendUserInterruptSignal, resetCaptureBuffers]);

  const interruptAi = useCallback((): void => {
    logger.log('[useAudioRecorder] Manually interrupting AI speech (mic closed)');
    playoutQueueRef.current?.stop();
    robustSpeechCancel();
    setCurrentlySpeakingText(null);
    setCurrentPlayingSentence('');
    setHighlightedWordIndex(-1);

    sendUserInterruptSignal();

    setChatHistory((history) =>
      history.map((msg) =>
        msg.id === 'ai-current'
          ? {
              ...msg,
              id: `ai-${Date.now()}-${Math.random().toString(36).substring(2, 11)}`,
            }
          : msg
      )
    );

    setIsRecording(false);
    resetCaptureBuffers();
    updateStatus('IDLE');
  }, [sendUserInterruptSignal, updateStatus, resetCaptureBuffers]);

  const sendTextMessage = useCallback((text: string): void => {
    if (!text.trim()) return;
    logger.log('[useAudioRecorder] Sending user text message:', text);
    
    robustSpeechCancel();
    setCurrentlySpeakingText(null);
    
    // Stop speech recognition when sending message to release the mic track
    stopSpeechRecognition();
    
    resetCaptureBuffers();
    sendTextInput(text);
    updateStatus('PROCESSING');
  }, [resetCaptureBuffers, sendTextInput, updateStatus, stopSpeechRecognition]);

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
    // If AI is speaking or thinking, interrupt it!
    if (statusRef.current === 'SPEAKING' || statusRef.current === 'THINKING') {
      logger.log('[useAudioRecorder] Manual Mic click during AI turn — Interrupting AI');
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
              }
            : msg
        )
      );
    }

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
  }, [
    useBrowserStt,
    startSpeechRecognition,
    resetSpeechTranscript,
    startCapture,
    updateStatus,
    sendUserInterruptSignal,
  ]);

  const startRecording = useCallback(async (topic?: string, targetBand?: string, ieltsPart?: string): Promise<void> => {
    setIsRecording(false);
    updateStatus('THINKING');
    resetSpeechTranscript();
    setLlmText('');
    clearTimeout(llmRenderTimeoutRef.current ?? undefined);
    llmRenderTimeoutRef.current = null;
    llmTextBufferRef.current = '';
    setChatHistory([]);
    setCurrentPlayingSentence('');
    setHighlightedWordIndex(-1);
    setSuggestions([]);
    hasInitialResponseTextRef.current = false;
    isInitialPlaybackReleasedRef.current = false;
    pendingInitialTtsChunksRef.current = [];
    
    playoutQueueRef.current?.stop();
    resetCaptureBuffers();

    topicRef.current = topic;
    targetBandRef.current = targetBand;
    ieltsPartRef.current = ieltsPart;
    const voiceWarmup = warmBrowserSpeech();

    try {
      if (!audioContextRef.current || audioContextRef.current.state === 'closed') {
        audioContextRef.current = new window.AudioContext();
      }
      const audioContext = audioContextRef.current;
      if (audioContext.state === 'suspended') {
        await audioContext.resume();
      }

      if (!lipsyncManagerRef.current) {
        try {
          // The library creates its own AudioContext by default. Replace it
          // with the playback context, then close the unused one so we do not
          // leak an extra audio graph for every session.
          const lipsync: any = new Lipsync({ fftSize: 2048, historySize: 10 });
          const unusedAudioContext = lipsync.audioContext as AudioContext;
          if (unusedAudioContext && unusedAudioContext !== audioContext && unusedAudioContext.state !== 'closed') {
            void unusedAudioContext.close();
          }
          lipsync.audioContext = audioContext;
          const analyser = audioContext.createAnalyser();
          analyser.fftSize = 2048;
          lipsync.analyser = analyser;
          lipsync.dataArray = new Uint8Array(analyser.frequencyBinCount);
          lipsync.binWidth = audioContext.sampleRate / analyser.fftSize;
          lipsyncManagerRef.current = lipsync;
        } catch (err) {
          logger.error('[Lipsync] Failed to initialize:', err);
        }
      }

      const queue = new PlaybackQueueManager(audioContext);
      queue.useBrowserTts = useBrowserTts;
      queue.ttsVoiceName = ttsVoiceName;
      queue.ttsRate = ttsRate;
      if (lipsyncManagerRef.current) {
        queue.analyserNode = lipsyncManagerRef.current.analyser;
      }
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

      // Keep the opening LLM request behind the voice warmup. The warmup was
      // started above while the click still counted as a user gesture.
      await voiceWarmup;
      connectSocket();
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
    warmBrowserSpeech,
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
    setCurrentlySpeakingText(null);
  }, [stopAudio, sendSpeechEndSignal, disconnectSocket]);

  useEffect(() => {
    return () => forceCleanup();
  }, [forceCleanup]);

  const speakText = useCallback((text: string): void => {
    if (currentlySpeakingText === text) {
      activeSpeakIdRef.current += 1;
      robustSpeechCancel();
      setCurrentlySpeakingText(null);
      updateStatus('IDLE');
      return;
    }

    const cleanText = text.replace(/<suggestions>[\s\S]*?<\/suggestions>/g, '').trim();
    if (!cleanText) return;

    logger.log('[Speech] Speaking text:', cleanText);

    if (typeof window !== 'undefined' && window.speechSynthesis) {
      activeSpeakIdRef.current += 1;
      const currentSpeakId = activeSpeakIdRef.current;

      robustSpeechCancel();
      
      const voices = window.speechSynthesis.getVoices();
      let englishVoice: SpeechSynthesisVoice | null = null;
      const isSantaVoice = ttsVoiceName === SANTA_VOICE_ID;
      if (isSantaVoice) {
        englishVoice = pickSantaVoice(voices);
      } else if (ttsVoiceName) {
        englishVoice = voices.find(v => v.name === ttsVoiceName) || null;
      }
      if (!englishVoice) {
        englishVoice = voices.find(v => v.lang.startsWith('en') && v.name.includes('Natural')) ||
                       voices.find(v => v.lang.startsWith('en') && (v.name.includes('Google') || v.localService)) ||
                       voices.find(v => v.lang.startsWith('en')) ||
                       voices.find(v => v.default) || null;
      }

      // Fix Chrome bug by chunking text into sentences to prevent stuttering/looping
      const sentences = cleanText.match(/[^.!?]+[.!?]+(\s|$)|[^.!?]+$/g) || [cleanText];
      let currentSentenceIndex = 0;

      updateStatus('SPEAKING');
      setCurrentlySpeakingText(text);

      const playNextSentence = () => {
        if (currentSpeakId !== activeSpeakIdRef.current) return;
        
        if (currentSentenceIndex >= sentences.length) {
          setCurrentlySpeakingText(null);
          updateStatus('IDLE');
          return;
        }

        const chunkText = sentences[currentSentenceIndex].trim();
        if (!chunkText) {
          currentSentenceIndex++;
          playNextSentence();
          return;
        }

        const utterance = new SpeechSynthesisUtterance(chunkText);
        utterance.lang = 'en-US';
        if (englishVoice) {
          utterance.voice = englishVoice;
        }
        utterance.rate = isSantaVoice ? Math.min(ttsRate, SANTA_VOICE_RATE) : ttsRate;
        utterance.pitch = isSantaVoice ? SANTA_VOICE_PITCH : 1;

        utterance.onend = () => {
          if (currentSpeakId === activeSpeakIdRef.current) {
            currentSentenceIndex++;
            playNextSentence();
          }
        };
        
        utterance.onerror = (e) => {
          logger.error('[Speech] Error speaking chunk:', e);
          if (currentSpeakId === activeSpeakIdRef.current) {
            setCurrentlySpeakingText(null);
            updateStatus('IDLE');
          }
        };

        window.speechSynthesis.speak(utterance);
      };

      // Add a slight delay after cancel to allow Chrome engine to reset properly
      setTimeout(() => {
        if (currentSpeakId === activeSpeakIdRef.current) {
           playNextSentence();
        }
      }, 50);
    }
  }, [ttsVoiceName, ttsRate, updateStatus, currentlySpeakingText]);

  const resetSession = useCallback((): void => {
    forceCleanup();
    updateStatus('IDLE');
    resetSpeechTranscript();
    setLlmText('');
    clearTimeout(llmRenderTimeoutRef.current ?? undefined);
    llmRenderTimeoutRef.current = null;
    llmTextBufferRef.current = '';
    setChatHistory([]);
    setCurrentPlayingSentence('');
    setHighlightedWordIndex(-1);
    setSuggestions([]);
    setCurrentlySpeakingText(null);
    hasInitialResponseTextRef.current = false;
    isInitialPlaybackReleasedRef.current = false;
    pendingInitialTtsChunksRef.current = [];
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
    interruptAi,
    resetSession,
    ttsVoiceName,
    changeTtsVoiceName,
    ttsRate,
    changeTtsRate,
    availableVoices,
    isVoiceReady,
    suggestions,
    speakText,
    currentlySpeakingText,
    lipsyncManager: lipsyncManagerRef.current,
  };
}
