import { useState, useRef, useCallback } from 'react';
import { logger } from '@/utils/logger';

export function useSpeechRecognition() {
  const [transcript, setTranscript] = useState('');
  const transcriptRef = useRef('');
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const recognitionRef = useRef<any>(null);
  // Carries over finalized text across internal auto-restarts (Chrome stops recognition
  // after silence — we restart transparently so the user doesn't have to re-press).
  const finalTranscriptRef = useRef('');
  // Incremented on EXPLICIT start/stop to invalidate all stale callbacks.
  const sessionIdRef = useRef(0);

  const startSpeechRecognition = useCallback((onStartError: () => void) => {
    // Stop any previous recognition instance to prevent zombie instances
    // concurrently firing onresult and corrupting shared state.
    if (recognitionRef.current) {
      try { recognitionRef.current.stop(); } catch (e) { /* already stopped */ }
      recognitionRef.current = null;
    }

    // Bump session — all callbacks captured with the old thisSession value are now no-ops.
    sessionIdRef.current += 1;
    const thisSession = sessionIdRef.current;

    // Clean slate for this session
    setTranscript('');
    transcriptRef.current = '';
    finalTranscriptRef.current = '';

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SpeechRecognition) {
      logger.error('[BrowserSTT] Browser does not support SpeechRecognition');
      onStartError();
      return;
    }

    // Inner factory — creates, wires, and starts a recognition instance.
    // Called once initially and again after each Chrome-initiated auto-stop.
    const createAndStart = () => {
      if (sessionIdRef.current !== thisSession) return; // session was explicitly stopped

      const recognition = new SpeechRecognition();
      recognition.continuous = true;
      recognition.interimResults = true;
      recognition.lang = 'en-US';

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      recognition.onresult = (event: any) => {
        if (sessionIdRef.current !== thisSession) return;

        // Rebuild transcript from ALL results in this recognition instance (i = 0).
        // Using event.resultIndex causes isFinal accumulation bugs on Chrome Android
        // where resultIndex stays 0 but isFinal fires repeatedly with growing text.
        let sessionFinal = '';
        let interimTranscript = '';
        for (let i = 0; i < event.results.length; i++) {
          const segment = event.results[i][0].transcript;
          if (event.results[i].isFinal) {
            sessionFinal += segment;
          } else {
            interimTranscript += segment;
          }
        }

        // Full transcript = text from previous auto-restarts + this instance's text
        const text = finalTranscriptRef.current + sessionFinal + interimTranscript;
        setTranscript(text);
        transcriptRef.current = text;
      };

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      recognition.onerror = (event: any) => {
        if (sessionIdRef.current !== thisSession) return;
        const errType = event.error;
        logger.error('[BrowserSTT] Recognition error:', errType);
        // 'no-speech' and 'network' are recoverable — onend will fire and we'll restart.
        // 'not-allowed' / 'service-not-allowed' are fatal — do not restart.
        if (errType === 'not-allowed' || errType === 'service-not-allowed') {
          sessionIdRef.current += 1; // invalidate to prevent restart
          onStartError();
        }
      };

      recognition.onend = () => {
        if (sessionIdRef.current !== thisSession) return;
        // Chrome stopped recognition on its own (silence timeout, network blip, etc).
        // Save current text as the "finalized" baseline before the new instance starts.
        // This prevents text loss across restarts.
        finalTranscriptRef.current = transcriptRef.current;
        logger.log('[BrowserSTT] Recognition ended naturally — restarting in 100ms');
        // Small delay to let Chrome's audio subsystem reset before restarting.
        setTimeout(createAndStart, 100);
      };

      recognitionRef.current = recognition;
      try {
        recognition.start();
        logger.log('[BrowserSTT] Recognition started');
      } catch (err) {
        logger.error('[BrowserSTT] Failed to start:', err);
        onStartError();
      }
    };

    createAndStart();
  }, []);

  const stopSpeechRecognition = useCallback((): string => {
    // Bump session FIRST — this prevents any pending setTimeout(createAndStart) from firing.
    sessionIdRef.current += 1;
    if (recognitionRef.current) {
      try { recognitionRef.current.stop(); } catch (err) {
        logger.warn('[BrowserSTT] Error stopping recognition:', err);
      }
      recognitionRef.current = null;
    }
    return transcriptRef.current;
  }, []);

  const resetSpeechTranscript = useCallback(() => {
    setTranscript('');
    transcriptRef.current = '';
    finalTranscriptRef.current = '';
  }, []);

  return {
    transcript,
    startSpeechRecognition,
    stopSpeechRecognition,
    resetSpeechTranscript,
  };
}
