/**
 * LLM Service — Abstract interface + concrete implementations.
 * Injected via Dependency Injection (README Section 7.5).
 *
 * generateStream(messages, onToken, signal) → Promise<string>
 *   - messages: Array<{ role: 'system'|'user'|'assistant', content: string }>
 *   - onToken:  (token: string) => void  — called per streamed token
 *   - signal:   AbortSignal (optional)   — for interruption (Phase 6)
 *   - returns:  full accumulated response string
 */

const { DEFAULT_SYSTEM_PROMPT } = require('./prompts');

// ── Abstract base ────────────────────────────────────────────────────────────

class LlmService {
  /**
   * @param {Array<{ role: string, content: string }>} messages
   * @param {(token: string) => void} onToken
   * @param {AbortSignal} [signal]
   * @returns {Promise<string>} Full accumulated response
   */
  async generateStream(messages, onToken, signal, systemPrompt) {
    throw new Error('generateStream() must be implemented.');
  }

  /** Returns the default system message to prepend to every conversation */
  get systemMessage() {
    return { role: 'system', content: DEFAULT_SYSTEM_PROMPT };
  }
}

// ── Mock implementation ──────────────────────────────────────────────────────

/**
 * Mock LLM — streams a pre-written response word-by-word with realistic delays.
 * No API key required. Used when USE_MOCKS=true.
 */
class MockLlmService extends LlmService {
  async generateStream(messages, onToken, signal, systemPrompt) {
    let mockResponse =
      "That's really interesting! Your English is coming along nicely. " +
      'Could you tell me a little more about what you enjoy doing on weekends?' +
      '\n<suggestions>["I enjoy playing football with my friends on Saturday afternoons, and then we usually go out for dinner together."]</suggestions>';

    if (systemPrompt && messages.length === 0) {
      const topicMatch = systemPrompt.match(/practice topic is: "([^"]+)"/i);
      if (topicMatch && topicMatch[1]) {
        const topicName = topicMatch[1];
        mockResponse = 
          `Here is a short overview about "${topicName}": ` +
          `Lately, ${topicName} has become a very popular topic of discussion around the world. ` +
          `Many people believe it is highly important for our future and society, while others think it presents many challenges. ` +
          `Learning to express your opinion on this is a great way to improve your English. ` +
          `What are your personal thoughts or experiences regarding this topic?` +
          `\n<suggestions>["I believe ${topicName} is extremely important for our future because it will change the way we live and work in the next few years."]</suggestions>`;
      }
    }

    const words = mockResponse.split(' ');
    let fullText = '';

    for (let i = 0; i < words.length; i++) {
      if (signal?.aborted) break;

      const token = (i === 0 ? '' : ' ') + words[i];
      await new Promise((resolve) => setTimeout(resolve, 60)); // ~16 tokens/sec
      onToken(token);
      fullText += token;
    }

    return fullText;
  }
}

// ── OpenRouter implementation ────────────────────────────────────────────────

/**
 * Production LLM via OpenRouter API with SSE streaming.
 * Compatible with any OpenRouter-hosted model (DeepSeek, GPT, Claude, etc.).
 *
 * Required env vars: OPENROUTER_API_KEY, LLM_MODEL
 */
class OpenRouterLlmService extends LlmService {
  /**
   * @param {object} config
   * @param {string} config.apiKey
   * @param {string} config.model   e.g. 'deepseek/deepseek-chat'
   * @param {number} [config.maxTokens=300]
   */
  constructor({ apiKey, model, maxTokens = 300 }) {
    super();
    this.apiKey = apiKey;
    this.model = model;
    this.maxTokens = maxTokens;
  }

  async generateStream(messages, onToken, signal, systemPrompt) {
    const systemMsg = systemPrompt
      ? { role: 'system', content: systemPrompt }
      : this.systemMessage;

    const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${this.apiKey}`,
        'Content-Type': 'application/json',
        'HTTP-Referer': 'https://ai-english-roleplay',
        'X-Title': 'AI English Roleplay',
      },
      body: JSON.stringify({
        model: this.model,
        messages: [systemMsg, ...messages],
        stream: true,
        max_tokens: this.maxTokens,
      }),
      signal,
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`OpenRouter API error ${response.status}: ${errorText.slice(0, 200)}`);
    }

    const reader = response.body.getReader();
    const decoder = new TextDecoder();
    let sseBuffer = '';
    let fullText = '';

    while (true) {
      if (signal?.aborted) break;

      const { done, value } = await reader.read();
      if (done) break;

      sseBuffer += decoder.decode(value, { stream: true });
      const lines = sseBuffer.split('\n');
      sseBuffer = lines.pop(); // retain incomplete line

      for (const line of lines) {
        if (!line.startsWith('data: ')) continue;
        const payload = line.slice(6).trim();
        if (payload === '[DONE]') return fullText;

        try {
          const parsed = JSON.parse(payload);
          const token = parsed.choices?.[0]?.delta?.content;
          if (token) {
            onToken(token);
            fullText += token;
          }
        } catch {
          // Ignore malformed SSE chunks
        }
      }
    }

    return fullText;
  }
}

module.exports = { LlmService, MockLlmService, OpenRouterLlmService };
