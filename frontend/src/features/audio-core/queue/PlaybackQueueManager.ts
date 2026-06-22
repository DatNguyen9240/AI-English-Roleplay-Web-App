import { logger } from '@/utils/logger';
import { audioConfig } from '../config/audioConfig';

export interface WordTiming {
  text: string;
  startMs: number;
  endMs: number;
}

export interface PlaybackChunk {
  requestId: string;
  sequenceNumber: number;
  audio: ArrayBuffer;
  sampleRate: number;
  words: WordTiming[];
}

let cachedVoiceName: string | null = null;

// Trigger voice loading early in browser
if (typeof window !== 'undefined' && window.speechSynthesis) {
  window.speechSynthesis.getVoices();
  if ('onvoiceschanged' in window.speechSynthesis) {
    window.speechSynthesis.onvoiceschanged = () => {
      window.speechSynthesis.getVoices();
    };
  }
}

function getEnglishVoice(): SpeechSynthesisVoice | null {
  if (typeof window === 'undefined' || !window.speechSynthesis) return null;
  const voices = window.speechSynthesis.getVoices();
  if (voices.length === 0) return null;

  if (cachedVoiceName) {
    const cached = voices.find(v => v.name === cachedVoiceName);
    if (cached) return cached;
  }

  // Priority 1: Natural English voices
  let voice = voices.find(v => v.lang.startsWith('en') && v.name.includes('Natural'));
  // Priority 2: Google/Local high quality
  if (!voice) {
    voice = voices.find(v => v.lang.startsWith('en') && (v.name.includes('Google') || v.localService));
  }
  // Priority 3: Any English voice
  if (!voice) {
    voice = voices.find(v => v.lang.startsWith('en'));
  }
  // Priority 4: Default voice
  if (!voice) {
    voice = voices.find(v => v.default);
  }

  if (voice) {
    cachedVoiceName = voice.name;
    return voice;
  }
  return null;
}

/**
 * Manages the sequential, gapless playback of raw PCM audio chunks received over WebSockets.
 * Synchronizes playback with word highlight callbacks for karaoke-style subtitle animations.
 */
export class PlaybackQueueManager {
  private audioContext: AudioContext;
  private nextPlayTime: number = 0;
  private expectedSequenceNumber: number = 0;
  private jitterBuffer: PlaybackChunk[] = [];
  private activeSources: Set<AudioBufferSourceNode> = new Set();
  private activeTimeouts: Set<ReturnType<typeof setTimeout>> = new Set();
  private jitterTimeout: ReturnType<typeof setTimeout> | null = null;
  private isPlaying: boolean = false;
  private lastRequestId: string | null = null;

  public useBrowserTts: boolean = false;
  public ttsVoiceName: string | null = null;
  public ttsRate: number = 1.0;
  private totalChunks: number | null = null;
  private activeUtterancesCount: number = 0;

  public onWordSpoken?: (
    wordText: string,
    wordIndex: number,
    sentenceText: string,
    words: WordTiming[],
    requestId: string
  ) => void;

  public onSentenceStart?: (sentenceText: string, requestId: string) => void;
  public onQueueEmpty?: (requestId: string) => void;

  constructor(audioContext: AudioContext) {
    this.audioContext = audioContext;
  }

  /**
   * Enqueues a new audio chunk for playback.
   */
  public enqueue(chunk: PlaybackChunk): void {
    // Reset expected sequence number if this is a new request
    if (this.lastRequestId !== chunk.requestId) {
      this.stop();
      this.lastRequestId = chunk.requestId;
      this.expectedSequenceNumber = 0;
      this.isPlaying = true;
    }

    // Insert chunk into jitter buffer sorted by sequence number
    this.jitterBuffer.push(chunk);
    this.jitterBuffer.sort((a, b) => a.sequenceNumber - b.sequenceNumber);

    this.processQueue();
  }

  /**
   * Processes the jitter buffer, playing any sequential chunks.
   */
  private processQueue(): void {
    if (!this.isPlaying) return;

    if (this.useBrowserTts) {
      while (this.jitterBuffer.length > 0 && this.jitterBuffer[0].sequenceNumber === this.expectedSequenceNumber) {
        const nextChunk = this.jitterBuffer.shift()!;
        this.playChunk(nextChunk);
        this.expectedSequenceNumber++;
      }
      return;
    }

    // Clear any pending jitter timeout since we are processing
    if (this.jitterTimeout) {
      clearTimeout(this.jitterTimeout);
      this.jitterTimeout = null;
    }

    // Process all chunks that match the expected sequence number
    while (this.jitterBuffer.length > 0 && this.jitterBuffer[0].sequenceNumber === this.expectedSequenceNumber) {
      const nextChunk = this.jitterBuffer.shift()!;
      this.playChunk(nextChunk);
      this.expectedSequenceNumber++;
    }

    // If we have chunks in the buffer but there is a gap (packet lost or out of order),
    // wait for a brief period (150ms) to allow the missing packet to arrive.
    if (this.jitterBuffer.length > 0) {
      const gapSize = this.jitterBuffer[0].sequenceNumber - this.expectedSequenceNumber;
      if (gapSize > 0) {
        logger.log(
          `[PlayoutQueue] Gap detected. Expected: ${this.expectedSequenceNumber}, Found: ${this.jitterBuffer[0].sequenceNumber}. Waiting for missing packets.`
        );
        this.jitterTimeout = setTimeout(() => {
          logger.warn(
            `[PlayoutQueue] Jitter buffer timeout. Skipping sequence number ${this.expectedSequenceNumber} up to ${this.jitterBuffer[0].sequenceNumber}`
          );
          if (this.jitterBuffer.length > 0) {
            this.expectedSequenceNumber = this.jitterBuffer[0].sequenceNumber;
            this.processQueue();
          }
        }, audioConfig.jitterBufferDelayMs);
      }
    }
  }

  /**
   * Decodes PCM ArrayBuffer to AudioBuffer and schedules it in AudioContext.
   */
  private playChunk(chunk: PlaybackChunk): void {
    if (this.useBrowserTts) {
      this.playChunkBrowserTts(chunk);
      return;
    }

    try {
      const float32Data = this.convertInt16ToFloat32(chunk.audio);
      
      // Create Web Audio Buffer
      const audioBuffer = this.audioContext.createBuffer(
        1, // Mono
        float32Data.length,
        chunk.sampleRate
      );
      audioBuffer.copyToChannel(float32Data as any, 0);

      const currentTime = this.audioContext.currentTime;
      let scheduledTime = this.nextPlayTime;

      // If we ran dry (nextPlayTime is in the past), start playing with a small lookahead buffer to avoid clicking/glitches
      const lookahead = audioConfig.playbackLookaheadSec;
      if (scheduledTime < currentTime + lookahead) {
        scheduledTime = currentTime + lookahead;
      }

      // Schedule Audio Buffer Source Node
      const sourceNode = this.audioContext.createBufferSource();
      sourceNode.buffer = audioBuffer;
      sourceNode.connect(this.audioContext.destination);

      sourceNode.start(scheduledTime);
      this.activeSources.add(sourceNode);

      // Clean up source node when it finishes playing
      sourceNode.onended = () => {
        this.activeSources.delete(sourceNode);
        sourceNode.disconnect();
        this.checkQueueEmpty(chunk.requestId);
      };

      // Set the sentence text as all words joined by space
      const sentenceText = chunk.words.map((w) => w.text).join(' ');

      // Schedule Sentence Start callback
      if (this.onSentenceStart) {
        const sentenceDelayMs = Math.max(0, (scheduledTime - currentTime) * 1000);
        const sentenceTimeout = setTimeout(() => {
          this.activeTimeouts.delete(sentenceTimeout);
          logger.log(`[Playout] AUDIO_PLAYBACK_STARTED (requestId: ${chunk.requestId})`);
          if (this.onSentenceStart) {
            this.onSentenceStart(sentenceText, chunk.requestId);
          }
        }, sentenceDelayMs);
        this.activeTimeouts.add(sentenceTimeout);
      }

      // Schedule Word highlights using setTimeout based on the scheduled start time
      for (let i = 0; i < chunk.words.length; i++) {
        const word = chunk.words[i];
        // Calculate milliseconds from now until the word should be spoken
        const delayMs = (scheduledTime - currentTime) * 1000 + word.startMs;

        if (delayMs >= 0) {
          const wordTimeout = setTimeout(() => {
            this.activeTimeouts.delete(wordTimeout);
            if (this.onWordSpoken) {
              this.onWordSpoken(word.text, i, sentenceText, chunk.words, chunk.requestId);
            }
          }, delayMs);
          this.activeTimeouts.add(wordTimeout);
        }
      }

      // Update nextPlayTime for the next chunk
      const chunkDuration = audioBuffer.duration;
      this.nextPlayTime = scheduledTime + chunkDuration;

    } catch (err) {
      logger.error('[PlayoutQueue] Failed to play chunk:', err);
    }
  }

  /**
   * Speaks the sentence chunk using browser's speechSynthesis API (Free).
   */
  private playChunkBrowserTts(chunk: PlaybackChunk): void {
    try {
      const sentenceText = chunk.words.map((w) => w.text).join(' ');

      // Create SpeechSynthesisUtterance
      const utterance = new SpeechSynthesisUtterance(sentenceText);
      utterance.lang = 'en-US';

      // Try to get a high quality English voice consistently
      let englishVoice: SpeechSynthesisVoice | null = null;
      if (typeof window !== 'undefined' && window.speechSynthesis) {
        const voices = window.speechSynthesis.getVoices();
        if (this.ttsVoiceName) {
          englishVoice = voices.find(v => v.name === this.ttsVoiceName) || null;
        }
      }
      if (!englishVoice) {
        englishVoice = getEnglishVoice();
      }
      if (englishVoice) {
        utterance.voice = englishVoice;
      }

      // Set playback speed
      utterance.rate = this.ttsRate;

      utterance.onstart = () => {
        logger.log(`[BrowserTTS] Playback started: "${sentenceText}"`);
        if (this.onSentenceStart) {
          this.onSentenceStart(sentenceText, chunk.requestId);
        }
      };

      utterance.onboundary = (event) => {
        if (event.name === 'word') {
          let charCount = 0;
          let wordIndex = -1;

          for (let i = 0; i < chunk.words.length; i++) {
            const word = chunk.words[i].text;
            const index = sentenceText.indexOf(word, charCount);
            if (index !== -1 && event.charIndex >= index && event.charIndex < index + word.length + 2) {
              wordIndex = i;
              break;
            }
            if (index !== -1) {
              charCount = index + word.length;
            }
          }

          if (wordIndex !== -1 && this.onWordSpoken) {
            this.onWordSpoken(chunk.words[wordIndex].text, wordIndex, sentenceText, chunk.words, chunk.requestId);
          }
        }
      };

      utterance.onend = () => {
        logger.log(`[BrowserTTS] Playback finished: "${sentenceText}"`);
        this.activeUtterancesCount--;

        this.checkQueueEmpty(chunk.requestId);
        if (this.isPlaying) {
          this.processQueue();
        }
      };

      utterance.onerror = (err) => {
        logger.error('[BrowserTTS] Speech synthesis error:', err);
        this.activeUtterancesCount--;

        this.checkQueueEmpty(chunk.requestId);
        if (this.isPlaying) {
          this.processQueue();
        }
      };

      this.activeUtterancesCount++;
      window.speechSynthesis.speak(utterance);
    } catch (err) {
      logger.error('[BrowserTTS] Failed to execute speak:', err);
      this.checkQueueEmpty(chunk.requestId);
      if (this.isPlaying) {
        this.processQueue();
      }
    }
  }

  public setTotalChunks(total: number): void {
    this.totalChunks = total;
    this.checkQueueEmpty(this.lastRequestId || '');
  }

  private checkQueueEmpty(requestId: string): void {
    if (this.totalChunks === null) return;

    if (this.useBrowserTts) {
      if (this.activeUtterancesCount === 0 && this.expectedSequenceNumber >= this.totalChunks && this.jitterBuffer.length === 0) {
        if (this.onQueueEmpty) {
          this.isPlaying = false;
          this.onQueueEmpty(requestId);
        }
      }
    } else {
      if (this.activeSources.size === 0 && this.expectedSequenceNumber >= this.totalChunks && this.jitterBuffer.length === 0) {
        if (this.onQueueEmpty) {
          this.isPlaying = false;
          this.onQueueEmpty(requestId);
        }
      }
    }
  }

  /**
   * Helper to convert 16-bit Int16 PCM array to Float32Array (-1.0 to 1.0)
   */
  private convertInt16ToFloat32(arrayBuffer: ArrayBuffer): Float32Array {
    const int16Array = new Int16Array(arrayBuffer);
    const float32Array = new Float32Array(int16Array.length);
    for (let i = 0; i < int16Array.length; i++) {
      const val = int16Array[i];
      // Normalize to float
      float32Array[i] = val < 0 ? val / 32768.0 : val / 32767.0;
    }
    return float32Array;
  }

  /**
   * Instantly stops playback, clears the queue, and cancels scheduled events.
   */
  public stop(): void {
    this.isPlaying = false;
    this.totalChunks = null;
    this.activeUtterancesCount = 0;

    // Cancel any browser speech synthesis
    if (typeof window !== 'undefined' && window.speechSynthesis) {
      window.speechSynthesis.cancel();
    }
    
    // Stop all active audio sources
    for (const source of this.activeSources) {
      try {
        source.stop();
        source.disconnect();
      } catch {
        // Source might not have started or already finished
      }
    }
    this.activeSources.clear();

    // Cancel all scheduled timers
    for (const timeout of this.activeTimeouts) {
      clearTimeout(timeout);
    }
    this.activeTimeouts.clear();

    if (this.jitterTimeout) {
      clearTimeout(this.jitterTimeout);
      this.jitterTimeout = null;
    }

    this.jitterBuffer = [];
    this.nextPlayTime = 0;
    this.expectedSequenceNumber = 0;
  }
}
