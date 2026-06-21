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

const sttService =
  process.env.USE_MOCKS === 'true'
    ? new MockSttService()
    : new WhisperSttService({
        binaryPath: process.env.WHISPER_BINARY_PATH,
        modelPath: process.env.WHISPER_MODEL_PATH,
        sampleRate: audioConfig.sampleRate,
        numChannels: audioConfig.numChannels,
        bitsPerSample: audioConfig.bitsPerSample,
      });

const llmService =
  process.env.USE_MOCKS === 'true'
    ? new MockLlmService()
    : new OpenRouterLlmService({
        apiKey: process.env.OPENROUTER_API_KEY,
        model: process.env.LLM_MODEL,
      });

const ttsService =
  process.env.USE_MOCKS === 'true'
    ? new MockTtsService()
    : new OpenAiTtsService({
        apiKey: process.env.OPENAI_API_KEY,
        model: process.env.TTS_MODEL,
        voice: process.env.TTS_VOICE,
      });

// ── Express application ──────────────────────────────────────────────────────

const app = express();

app.use(cors({ origin: process.env.FRONTEND_URL, credentials: true }));
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
    origin: process.env.FRONTEND_URL,
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
