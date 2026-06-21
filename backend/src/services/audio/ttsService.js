/**
 * TTS Service — Abstract interface + concrete implementations.
 * Injected via Dependency Injection (README Section 7.5).
 */

class TtsService {
  /**
   * Synthesizes text into raw 16-bit PCM audio with word boundary timestamps.
   * @param {string} text - The text to synthesize.
   * @param {string} [requestId] - Associated request trace ID.
   * @param {AbortSignal} [signal] - Optional AbortSignal.
   * @returns {Promise<{ audio: Buffer, sampleRate: number, words: Array<{ text: string, startMs: number, endMs: number }> }>}
   */
  async synthesize(text, requestId, signal) {
    throw new Error('synthesize() must be implemented.');
  }
}

/**
 * Mock TTS Service — Generates synthetic PCM beep waveforms for words with estimated timings.
 * No API key required. Used when USE_MOCKS=true.
 */
class MockTtsService extends TtsService {
  async synthesize(text, requestId, signal) {
    const words = text.trim().split(/\s+/).filter(Boolean);
    const sampleRate = 16000; // 16kHz for mock
    const wordTimings = [];
    let currentMs = 0;

    // Calculate word timings
    for (const word of words) {
      if (signal?.aborted) {
        throw new Error('TTS synthesis aborted');
      }
      const wordLen = word.replace(/[.,\/#!$%\^&\*;:{}=\-_`~()]/g, "").length;
      // Heuristic: ~80ms per character + 100ms baseline duration
      const durationMs = Math.max(150, wordLen * 80 + 100);
      const gapMs = 60; // 60ms gap between words

      wordTimings.push({
        text: word,
        startMs: currentMs,
        endMs: currentMs + durationMs,
      });

      currentMs += durationMs + gapMs;
    }

    const totalDurationMs = currentMs > 0 ? currentMs - 60 : 0;
    const totalSamples = Math.floor((totalDurationMs * sampleRate) / 1000);
    const audioBuffer = new Int16Array(totalSamples);

    // Populate buffer with synthetic tone bursts for each word
    for (const timing of wordTimings) {
      const startSample = Math.floor((timing.startMs * sampleRate) / 1000);
      const endSample = Math.floor((timing.endMs * sampleRate) / 1000);
      
      // Determine a unique pitch/frequency for each word just to make it sound slightly dynamic
      const charCodeSum = timing.text.split('').reduce((sum, c) => sum + c.charCodeAt(0), 0);
      const frequency = 220 + (charCodeSum % 180); // range: 220Hz - 400Hz
      const amplitude = 8000; // moderate volume

      for (let i = startSample; i < endSample && i < totalSamples; i++) {
        // Generate a sine wave hum
        const t = (i - startSample) / sampleRate;
        // Fade in/out slightly at boundaries to prevent clicking sounds
        let scale = 1.0;
        const fadeInSamples = Math.min(200, (endSample - startSample) / 5);
        if (i - startSample < fadeInSamples) {
          scale = (i - startSample) / fadeInSamples;
        } else if (endSample - i < fadeInSamples) {
          scale = (endSample - i) / fadeInSamples;
        }

        audioBuffer[i] = Math.sin(2 * Math.PI * frequency * t) * amplitude * scale;
      }
    }

    // Convert Int16Array to Node Buffer
    const buffer = Buffer.from(audioBuffer.buffer);

    return {
      audio: buffer,
      sampleRate,
      words: wordTimings,
    };
  }
}

/**
 * Production OpenAI TTS Service — Generates high-fidelity audio via OpenAI api.
 * Uses response_format='pcm' to fetch 24kHz 16-bit Mono PCM.
 */
class OpenAiTtsService extends TtsService {
  /**
   * @param {object} config
   * @param {string} config.apiKey
   * @param {string} config.model
   * @param {string} config.voice
   */
  constructor({ apiKey, model, voice }) {
    super();
    if (!apiKey) {
      throw new Error('OpenAiTtsService requires an API key.');
    }
    if (!model) {
      throw new Error('OpenAiTtsService requires a model (TTS_MODEL).');
    }
    if (!voice) {
      throw new Error('OpenAiTtsService requires a voice (TTS_VOICE).');
    }
    this.apiKey = apiKey;
    this.model = model;
    this.voice = voice;
  }

  async synthesize(text, requestId, signal) {
    const cleanText = text.trim();
    if (!cleanText) {
      return { audio: Buffer.alloc(0), sampleRate: 24000, words: [] };
    }

    const response = await fetch('https://api.openai.com/v1/audio/speech', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${this.apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: this.model,
        voice: this.voice,
        input: cleanText,
        response_format: 'pcm', // returns raw 24kHz 16-bit Mono PCM
      }),
      signal,
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`OpenAI TTS API error ${response.status}: ${errorText.slice(0, 200)}`);
    }

    // Read response as ArrayBuffer and convert to Buffer
    const arrayBuffer = await response.arrayBuffer();
    const audioBuffer = Buffer.from(arrayBuffer);

    // OpenAI 'pcm' response format is 24000Hz, 16-bit (2 bytes per sample), mono
    const sampleRate = 24000;
    const totalSamples = audioBuffer.length / 2;
    const totalDurationMs = (totalSamples / sampleRate) * 1000;

    // Estimate word timings proportionally based on character lengths
    const words = cleanText.split(/\s+/).filter(Boolean);
    const wordTimings = [];
    
    if (words.length > 0) {
      const totalChars = words.reduce((sum, w) => sum + w.length, 0);
      const msPerChar = totalDurationMs / (totalChars || 1);
      
      let currentMs = 0;
      for (const word of words) {
        const startMs = currentMs;
        const duration = word.length * msPerChar;
        const endMs = startMs + duration;
        currentMs = endMs;

        wordTimings.push({
          text: word,
          startMs: Math.round(startMs),
          endMs: Math.round(endMs),
        });
      }
    }

    return {
      audio: audioBuffer,
      sampleRate,
      words: wordTimings,
    };
  }
}

module.exports = { TtsService, MockTtsService, OpenAiTtsService };
