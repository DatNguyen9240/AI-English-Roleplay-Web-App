import { useState, useRef, useCallback } from 'react';
import { logger } from '@/utils/logger';

export function useSpeechRecognition() {
  const [transcript, setTranscript] = useState('');
  const transcriptRef = useRef('');
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const recognitionRef = useRef<any>(null);
  // Accumulates only the FINALIZED (isFinal) segments across multiple onresult events.
  // This is the canonical fix to prevent duplication on Chrome desktop and mobile.
  const finalTranscriptRef = useRef('');

  const startSpeechRecognition = useCallback((onStartError: () => void) => {
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
        // KEY FIX: Start from event.resultIndex, NOT 0.
        // event.resultIndex points to the first NEW result in this event.
        // Iterating from 0 causes re-processing old results → duplicated text.
        let interimTranscript = '';
        for (let i = event.resultIndex; i < event.results.length; ++i) {
          const segment = event.results[i][0].transcript;
          if (event.results[i].isFinal) {
            // Append only genuinely new finalized text to our persistent accumulator.
            finalTranscriptRef.current += segment;
          } else {
            // Interim result: only shows the current in-progress spoken text.
            interimTranscript += segment;
          }
        }
        const text = finalTranscriptRef.current + interimTranscript;
        setTranscript(text);
        transcriptRef.current = text;
      };

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      recognition.onerror = (event: any) => {
        logger.error('[BrowserSTT] Speech recognition error:', event.error || event);
      };

      recognition.onend = () => {
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
