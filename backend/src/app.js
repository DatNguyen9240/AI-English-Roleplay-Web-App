const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const cors = require('cors');
const cookieParser = require('cookie-parser');
const fs = require('fs').promises;

const logger = require('@config/logger');
const audioConfig = require('@config/audioConfig');
const { LocalAudioStorage } = require('@services/storageService');
const { MockSttService, WhisperSttService } = require('@services/audio/sttService');
const { MockLlmService, OpenRouterLlmService } = require('@services/ai/llmService');
const { MockTtsService, OpenAiTtsService } = require('@services/audio/ttsService');
const registerAudioHandlers = require('@sockets/audioSocket');

// ── Service instantiation (Dependency Injection) ────────────────────────────

const storageService = new LocalAudioStorage(audioConfig);

const useMocks = process.env.USE_MOCKS !== 'false';
const useSttMocks = process.env.USE_STT_MOCKS ? process.env.USE_STT_MOCKS === 'true' : useMocks;
const useLlmMocks = process.env.USE_LLM_MOCKS ? process.env.USE_LLM_MOCKS === 'true' : useMocks;
const useTtsMocks = process.env.USE_TTS_MOCKS ? process.env.USE_TTS_MOCKS === 'true' : useMocks;

const sttService =
  useSttMocks
    ? new MockSttService()
    : new WhisperSttService({
        binaryPath: process.env.WHISPER_BINARY_PATH,
        modelPath: process.env.WHISPER_MODEL_PATH,
        sampleRate: audioConfig.sampleRate,
        numChannels: audioConfig.numChannels,
        bitsPerSample: audioConfig.bitsPerSample,
      });

const llmService =
  useLlmMocks
    ? new MockLlmService()
    : new OpenRouterLlmService({
        apiKey: process.env.OPENROUTER_API_KEY,
        model: process.env.LLM_MODEL,
      });

const ttsService =
  useTtsMocks
    ? new MockTtsService()
    : new OpenAiTtsService({
        apiKey: process.env.OPENAI_API_KEY,
        model: process.env.TTS_MODEL,
        voice: process.env.TTS_VOICE,
      });

// Dictionary lookups are deterministic enough to reuse and otherwise each
// click consumes a full LLM request. Keep a small bounded in-memory cache.
const WORD_INFO_CACHE_LIMIT = 300;
const wordInfoCache = new Map();

function cacheWordInfo(cacheKey, value) {
  wordInfoCache.set(cacheKey, value);
  if (wordInfoCache.size > WORD_INFO_CACHE_LIMIT) {
    wordInfoCache.delete(wordInfoCache.keys().next().value);
  }
}

// ── Express application ──────────────────────────────────────────────────────

const app = express();

// Setup CORS configurations
const allowedOrigins = process.env.FRONTEND_URL
  ? process.env.FRONTEND_URL.split(',').map(o => o.trim())
  : [];

/**
 * Shared CORS origin resolver logic.
 * Ensures consistent handling for both Express HTTP requests and Socket.IO handshakes.
 */
function resolveCorsOrigin(origin, callback) {
  if (!origin || allowedOrigins.length === 0 || allowedOrigins.indexOf(origin) !== -1 || process.env.NODE_ENV !== 'production') {
    callback(null, true);
  } else {
    callback(new Error('Not allowed by CORS'));
  }
}

const corsOptions = {
  origin: resolveCorsOrigin,
  credentials: true,
};

app.use(cors(corsOptions));
app.use(express.json());
app.use(cookieParser());



// Health check
app.get('/health', async (_req, res) => {
  let recordingsCount = 0;
  try {
    const files = await fs.readdir(audioConfig.recordingsDir);
    recordingsCount = files.length;
  } catch {
    // Directory may not exist yet
  }
  res.json({ status: 'ok', recordingsCount });
});

// Dictionary word info lookup (Gemini-backed translation + usage helper)
app.get('/api/word-info', async (req, res) => {
  const word = req.query.word;
  if (!word || typeof word !== 'string') {
    return res.status(400).json({ error: 'Word parameter is required' });
  }

  logger.info({ word }, 'DICTIONARY_LOOKUP_REQUEST');

  const cacheKey = word.trim().toLowerCase();
  const cached = wordInfoCache.get(cacheKey);
  if (cached) {
    return res
      .set('Cache-Control', 'private, max-age=86400')
      .json(cached);
  }

  const respondWithWordInfo = (data) => {
    cacheWordInfo(cacheKey, data);
    return res
      .set('Cache-Control', 'private, max-age=86400')
      .json(data);
  };

  if (useLlmMocks) {
    return respondWithWordInfo({
      word: word,
      phonetic: `/${word.toLowerCase().replace(/[^a-z]/g, '')}/`,
      translation: `dịch nghĩa của "${word}"`,
      definition: `A mock definition for "${word}" since mocks are enabled.`,
      examples: [
        {
          en: `This is a mock example sentence demonstrating the word "${word}".`,
          vi: `Đây là câu ví dụ mô phỏng cho từ "${word}".`
        },
        {
          en: `You can use "${word}" in many different contexts.`,
          vi: `Bạn có thể sử dụng "${word}" trong nhiều ngữ cảnh khác nhau.`
        }
      ]
    });
  }

  try {
    const dictionarySystemPrompt = 
      "You are a helpful ESL dictionary assistant. Your job is to analyze the English word or phrase provided by the user and return a JSON object with the following fields:\n" +
      "{\n" +
      "  \"word\": \"the word itself\",\n" +
      "  \"phonetic\": \"IPA phonetic spelling (British or American English)\",\n" +
      "  \"translation\": \"Vietnamese translation\",\n" +
      "  \"definition\": \"A simple, clear English definition (suitable for ESL learners)\",\n" +
      "  \"examples\": [\n" +
      "    {\n" +
      "      \"en\": \"An English example sentence demonstrating practical usage of the word\",\n" +
      "      \"vi\": \"Vietnamese translation of the example sentence\"\n" +
      "    },\n" +
      "    {\n" +
      "      \"en\": \"Another English example sentence\",\n" +
      "      \"vi\": \"Vietnamese translation of the second example sentence\"\n" +
      "    }\n" +
      "  ]\n" +
      "}\n" +
      "IMPORTANT: Return ONLY the JSON object. Do not include markdown code block syntax (like ```json), explanations, or any other characters. Return pure, valid JSON.";

    const messages = [
      { role: 'user', content: `Analyze the word: "${word}"` }
    ];

    const result = await llmService.generateStream(
      messages,
      () => {}, // Empty callback since we don't need tokens streaming
      null,
      dictionarySystemPrompt
    );

    // Parse the result
    const cleanResult = result.replace(/```json/g, '').replace(/```/g, '').trim();
    const parsedData = JSON.parse(cleanResult);
    respondWithWordInfo(parsedData);
  } catch (err) {
    logger.error({ word, error: err.message }, 'DICTIONARY_LOOKUP_FAILED');
    res.status(500).json({ error: 'Failed to look up word details' });
  }
});


// ── HTTP + Socket.IO server ──────────────────────────────────────────────────

const server = http.createServer(app);

const io = new Server(server, {
  cors: {
    origin: resolveCorsOrigin,
    methods: ['GET', 'POST'],
    credentials: true,
  },
});

io.on('connection', (socket) => {
  logger.info(
    { socketId: socket.id },
    'USER_CONNECTED (WebSocket Connection Established)'
  );
  registerAudioHandlers(io, socket, logger, storageService, sttService, llmService, ttsService);
});

module.exports = { app, server };
