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
const { socketAuth } = require('@middleware/authMiddleware');
const registerAudioHandlers = require('@sockets/audioSocket');
const authRoutes = require('@routes/auth');

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

// ── Express application ──────────────────────────────────────────────────────

const app = express();

// Setup CORS configurations
const allowedOrigins = process.env.FRONTEND_URL
  ? process.env.FRONTEND_URL.split(',').map(o => o.trim())
  : [];

const corsOptions = {
  origin: (origin, callback) => {
    // If FRONTEND_URL is not set, or request has no origin (like curl), or matches allowedOrigins, or not in prod
    if (!origin || allowedOrigins.length === 0 || allowedOrigins.indexOf(origin) !== -1 || process.env.NODE_ENV !== 'production') {
      callback(null, true);
    } else {
      callback(new Error('Not allowed by CORS'));
    }
  },
  credentials: true,
};

app.use(cors(corsOptions));
app.use(express.json());
app.use(cookieParser());

// Routes
app.use('/api/auth', authRoutes);

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

// ── HTTP + Socket.IO server ──────────────────────────────────────────────────

const server = http.createServer(app);

const io = new Server(server, {
  cors: {
    origin: (origin, callback) => {
      if (!origin || allowedOrigins.length === 0 || allowedOrigins.indexOf(origin) !== -1 || process.env.NODE_ENV !== 'production') {
        callback(null, true);
      } else {
        callback(new Error('Not allowed by CORS'));
      }
    },
    methods: ['GET', 'POST'],
    credentials: true,
  },
});

io.use(socketAuth);

io.on('connection', (socket) => {
  logger.info(
    { socketId: socket.id, user: socket.user },
    'USER_CONNECTED (WebSocket Connection Established & Authenticated)'
  );
  registerAudioHandlers(io, socket, logger, storageService, sttService, llmService, ttsService);
});

module.exports = { app, server };
