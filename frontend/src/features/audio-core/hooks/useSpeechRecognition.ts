import { useState, useRef, useCallback } from 'react';
import { logger } from '@/utils/logger';

export function useSpeechRecognition() {
  const [transcript, setTranscript] = useState('');
  const transcriptRef = useRef('');
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const recognitionRef = useRef<any>(null);
  // Accumulates confirmed final segments across onresult events within one session.
  const finalTranscriptRef = useRef('');
  // Incremented each time a new session starts to invalidate stale event callbacks
  // from previous recognition instances that may still be firing.
  const sessionIdRef = useRef(0);

  const startSpeechRecognition = useCallback((onStartError: () => void) => {
    // ── Guard: Stop any existing recognition instance before starting a new one.
    // Without this, old instances keep firing onresult and corrupt finalTranscriptRef.
    if (recognitionRef.current) {
      try {
        recognitionRef.current.stop();
      } catch (e) {
        // ignore — it may have already stopped on its own
      }
      recognitionRef.current = null;
    }

    // Bump the session ID so any in-flight events from the old instance are ignored.
    sessionIdRef.current += 1;
    const thisSession = sessionIdRef.current;

    setTranscript('');
    transcriptRef.current = '';
    finalTranscriptRef.current = '';

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SpeechRecognition) {
      logger.error('Browser does not support SpeechRecognition');
      onStartError();
      return;
    }

    try {
      const recognition = new SpeechRecognition();
      recognition.continuous = true;
      recognition.interimResults = true;
      recognition.lang = 'en-US';

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      recognition.onresult = (event: any) => {
        // Drop events from stale/old recognition instances.
        if (sessionIdRef.current !== thisSession) return;

        // Loop from event.resultIndex (only NEW results, never re-process old ones).
        // This is the canonical fix for duplicate text on all browsers.
        let interimTranscript = '';
        for (let i = event.resultIndex; i < event.results.length; ++i) {
          const segment = event.results[i][0].transcript;
          if (event.results[i].isFinal) {
            // Permanently confirmed text — add to accumulator.
            finalTranscriptRef.current += segment;
          } else {
            // Interim text — display only, not stored permanently.
            interimTranscript += segment;
          }
        }

        const text = finalTranscriptRef.current + interimTranscript;
        setTranscript(text);
        transcriptRef.current = text;
      };

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      recognition.onerror = (event: any) => {
        if (sessionIdRef.current !== thisSession) return;
        logger.error('[BrowserSTT] Speech recognition error:', event.error || event);
      };

      recognition.onend = () => {
        if (sessionIdRef.current !== thisSession) return;
        logger.log('[BrowserSTT] Speech recognition ended');
      };

      recognitionRef.current = recognition;
      recognition.start();
    } catch (err) {
      logger.error('[BrowserSTT] Failed to start SpeechRecognition:', err);
      onStartError();
    }
  }, []);

  const stopSpeechRecognition = useCallback((): string => {
    // Invalidate the current session first so any queued browser events are ignored.
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
