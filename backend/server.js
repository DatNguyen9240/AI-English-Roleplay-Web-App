const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const cors = require('cors');
const cookieParser = require('cookie-parser');
const path = require('path');
const fs = require('fs').promises;
require('dotenv').config({ path: path.join(__dirname, '.env.local') });

// Load configurations and services
const audioConfig = require('./config/audioConfig');
const { LocalAudioStorage } = require('./src/services/storageService');
const storageService = new LocalAudioStorage(audioConfig);

const logger = require('./config/logger');

const app = express();
const port = process.env.PORT;

// Middleware
app.use(cors({
  origin: process.env.FRONTEND_URL,
  credentials: true,
}));
app.use(express.json());
app.use(cookieParser());

// Routes
const authRoutes = require('./src/routes/auth');
app.use('/api/auth', authRoutes);

// Health check endpoint
app.get('/health', async (req, res) => {
  let recordingsCount = 0;
  try {
    const files = await fs.readdir(audioConfig.recordingsDir);
    recordingsCount = files.length;
  } catch {
    // Directory may not exist yet — count stays 0
  }
  res.json({ status: 'ok', recordingsCount });
});

const server = http.createServer(app);

const io = new Server(server, {
  cors: {
    origin: process.env.FRONTEND_URL,
    methods: ['GET', 'POST'],
    credentials: true,
  },
});

// Bind JWT authentication handshake middleware
const { socketAuth } = require('./src/middleware/authMiddleware');
io.use(socketAuth);

// Register socket handlers
const registerAudioHandlers = require('./src/sockets/audioSocket');

io.on('connection', (socket) => {
  logger.info({ socketId: socket.id, user: socket.user }, 'USER_CONNECTED (WebSocket Connection Established & Authenticated)');
  
  // Register audio/VAD events with dependency injection (DI)
  registerAudioHandlers(io, socket, logger, storageService);
});

server.listen(port, () => {
  logger.info(`Backend server running on port ${port} in ${process.env.NODE_ENV} mode`);
});
