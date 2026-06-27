import { useState, useRef, useCallback } from 'react';
import { logger } from '@/utils/logger';

export function useSpeechRecognition() {
  const [transcript, setTranscript] = useState('');
  const transcriptRef = useRef('');
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const recognitionRef = useRef<any>(null);
  // Holds the baseline transcript from finalized segments of previous sessions.
  const finalTranscriptRef = useRef('');
  // Incremented on explicit start/stop to invalidate stale callbacks.
  const sessionIdRef = useRef(0);

  const startSpeechRecognition = useCallback((onStartError: () => void) => {
    // Stop any existing instance
    if (recognitionRef.current) {
      try { recognitionRef.current.stop(); } catch (e) { /* ignore */ }
      recognitionRef.current = null;
    }

    sessionIdRef.current += 1;
    const thisSession = sessionIdRef.current;

    // Reset transcripts
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

    const createAndStart = () => {
      if (sessionIdRef.current !== thisSession) return;

      const recognition = new SpeechRecognition();
      // Crucial: Use continuous = false to prevent the browser from accumulating
      // duplicate segments in event.results. The engine will focus on one segment at a time.
      recognition.continuous = false;
      recognition.interimResults = true;
      recognition.lang = 'en-US';

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      recognition.onresult = (event: any) => {
        if (sessionIdRef.current !== thisSession) return;

        // Since continuous = false, event.results only contains a single active result segment.
        const result = event.results[event.results.length - 1];
        const segment = result[0].transcript;

        // Combine baseline with the current segment (either interim or final)
        const text = finalTranscriptRef.current + segment;
        setTranscript(text);
        transcriptRef.current = text;
      };

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      recognition.onerror = (event: any) => {
        if (sessionIdRef.current !== thisSession) return;
        const errType = event.error;
        logger.error('[BrowserSTT] Recognition error:', errType);
        
        // Fatal errors: user denied permission or service is not allowed.
        if (errType === 'not-allowed' || errType === 'service-not-allowed') {
          sessionIdRef.current += 1;
          onStartError();
        }
      };

      recognition.onend = () => {
        if (sessionIdRef.current !== thisSession) return;

        // Segment has finished. Save the current text as the baseline for the next segment.
        // Add a space to separate the next segment.
        const currentText = transcriptRef.current.trim();
        if (currentText) {
          finalTranscriptRef.current = currentText + ' ';
        }

        logger.log('[BrowserSTT] Segment completed — restarting session');
        // Restart the recognition for the next segment
        setTimeout(createAndStart, 50);
      };

      recognitionRef.current = recognition;
      try {
        recognition.start();
      } catch (err) {
        logger.error('[BrowserSTT] Failed to start:', err);
        onStartError();
      }
    };

    createAndStart();
  }, []);

  const stopSpeechRecognition = useCallback((): string => {
    // Invalidate the current session so no new auto-restart occurs
    sessionIdRef.current += 1;
    if (recognitionRef.current) {
      try { 
        recognitionRef.current.stop(); 
      } catch (err) {
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
