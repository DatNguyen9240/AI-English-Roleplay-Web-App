import { useState, useRef, useCallback } from 'react';
import { logger } from '@/utils/logger';

export function useSpeechRecognition() {
  const [transcript, setTranscript] = useState('');
  const transcriptRef = useRef('');
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const recognitionRef = useRef<any>(null);

  const startSpeechRecognition = useCallback((onStartError: () => void) => {
    setTranscript('');
    transcriptRef.current = '';

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
        let interimTranscript = '';
        let finalTranscript = '';
        for (let i = 0; i < event.results.length; ++i) {
          if (event.results[i].isFinal) {
            finalTranscript += event.results[i][0].transcript;
          } else {
            interimTranscript += event.results[i][0].transcript;
          }
        }
        const text = finalTranscript + interimTranscript;
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
  }, []);

  return {
    transcript,
    startSpeechRecognition,
    stopSpeechRecognition,
    resetSpeechTranscript,
  };
}
