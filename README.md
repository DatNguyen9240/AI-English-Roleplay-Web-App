# Realtime AI English Roleplay Web App — Full System Specification

This document serves as the **single source of truth** for the architecture, technology stack, directory structure, real-time protocols, system design principles, and development roadmap.

---

## 1. Project Goal & Core Concept

Build a modern AI-powered English speaking practice web application focused on real-time voice conversation, immersive roleplay, and low-latency interaction.

* **Immersive Experience:** Users speak directly with AI characters in realistic scenarios (Job Interview, Coffee Shop, Airport, etc.) using their microphone.
* **Cinematic & Conversational:** The app must feel like talking to a real character, reacting dynamically with low-latency and natural emotional engagement. It should NOT feel like a traditional CRUD web dashboard, flashcard learning tool, or dry grammar exercise software.
* **Important Cost-Cutting Decision:** To reduce infrastructure and API costs while maintaining premium user experience, the system **does not** generate heavy 3D rendering, AI video streams, or GPU-expensive facial animations. Instead, it utilizes **static avatar images, speaking animations (pulse, glow), waveform visualizations, and karaoke-style subtitle synchronization**.
* **Latency Budget:** Target total turnaround latency is **1.0s – 1.5s** (under 2s maximum) to maintain natural conversational pacing.

---

## 2. Frozen Technology Stack Decisions

We freeze the following technology stack for the initial implementation:

| Module | Chosen Technology | Rationale |
| :--- | :--- | :--- |
| **Frontend Core** | **React + Vite** | Modern Single Page Application (SPA), fast rendering, and instant reloading. |
| **Styling (CSS)** | **TailwindCSS** | Clean layout construction and highly responsive UI utility styling. |
| **FE State Manager** | **Zustand** | Extremely lightweight; avoids React Context re-rendering lag during continuous websocket packet traffic. |
| **FE Audio Engine** | **Web Audio API (Raw)** | Absolute low-level control over microphone captures, ring buffers, and custom audio playback queues. |
| **BE Server Framework** | **Express.js (Node.js)** | Fast event-driven server, lightweight, and native integrations with Socket.IO. |
| **Real-Time Layer** | **Socket.IO** | Simple binary stream pipeline support, robust connection keep-alive, and auto-reconnection. |
| **Database & ORM** | **Prisma ORM + PostgreSQL** | Strong type-safety, simple migrations, and support for `pgvector` memory embeddings. |
| **STT (Speech-to-Text)** | **Whisper.cpp (`base.en`)** | Server-side compiled inference. Provides extremely low transcription latency (~400ms) on CPU. |
| **TTS (Text-to-Speech)** | **Hybrid Pipeline** | OpenAI TTS API for high-fidelity responses, Piper TTS (local) for cheap developer testing. |

---

## 3. Directory Structure & Responsibilities

The system is organized as a monorepo workspace to share types and configuration assets:

```text
ai-english-roleplay/
├── packages/
│   └── shared-contracts/    # Shared TypeScript types, Zod schemas, event enums, state definitions
├── backend/
│   ├── config/              # Infrastructure configurations (db, logger, env loaders)
│   ├── prisma/              # DB Schema definitions (PostgreSQL + pgvector)
│   └── src/
│       ├── controllers/     # REST Controllers (stateless HTTP endpoints like user profile)
│       ├── routes/          # Express route definitions
│       ├── middleware/       # Rate-limiting, authentication, body validation
│       ├── repositories/    # Database Repository abstraction layer
│       ├── session/         # Session manager layer (tracks active connections, FSMs, cancellation tokens)
│       ├── services/        # Services layer
│       │   ├── ai/          # Swappable LLM wrappers + Streaming Token Aggregator
│       │   ├── audio/       # Whisper STT + TTS wrappers + TTS Chunk Scheduler
│       │   └── feedback/    # Pronunciation scoring algorithms
│       ├── state-machine/   # Finite State Machine implementation for active sessions
│       ├── sockets/         # WebSocket handlers
│       │   └── socketEvents.js  # Socket event name constants (mirrors FE constants/socketEvents.ts)
│       ├── utils/           # Shared backend utilities
│       │   └── wavBuilder.js    # PCM16 → WAV file builder (used by storage + STT services)
│       └── app.js           # Express + Socket.IO setup, exports { app, server }
├── frontend/
│   ├── public/              # Static assets (audio sounds, UI icons)
│   │   └── worklets/        # AudioWorklet processor scripts (.js — cannot use TS modules)
│   └── src/
│       ├── config.ts        # Env var validation — single source of truth for all VITE_ vars
│       ├── vite-env.d.ts    # Vite client type reference (import.meta.env, CSS imports)
│       ├── types/           # Shared domain type definitions
│       │   ├── audio.ts     # RecordingStatus, AudioConfig, socket event payload types
│       │   └── auth.ts      # AuthUser, AuthState interfaces
│       ├── components/      # Global layout primitives (not feature-specific)
│       │   └── PageShell.tsx    # Full-screen background layout wrapper
│       ├── assets/          # Styles and fonts
│       ├── context/         # React Context stores (Global Socket state, global Auth state)
│       ├── features/        # Bounded feature folders
│       │   ├── auth/        # Login, signup, JWT validations
│       │   ├── dashboard/   # Scenario selection list
│       │   ├── conversation/# Voice arena components (Avatar, Waveform, Subtitle Karaoke)
│       │   └── audio-core/  # useAudioRecorder, VAD, mobile Audio policy, Playback Queue Manager
│       │       └── constants/   # socketEvents.ts — event name constants (mirrors BE socketEvents.js)
│       ├── services/        # HTTP client wrappers (e.g. authApiClient.ts)
│       ├── utils/           # Buffer converters, time formatters
│       ├── App.tsx          # Routing configuration
│       └── main.tsx         # Client entrypoint
```

### Folder logic principles:
* **Modular Architecture:** Do not pool event listening, database writes, AI execution, and UI rendering in a single script. Each folder layer has a single responsibility.
* **Feature-Based Organization:** Frontend components and custom hooks are structured under `features/` bounded contexts (e.g., `conversation/`, `audio-core/`) rather than generic `components/` and `hooks/`.
* **Bounded Context Thinking:** Isolate separate sub-domains (conversation loop, feedback scoring, database migrations) so that a failure in one service does not take down the entire real-time pipeline.

---

## 4. End-to-End Real-Time Audio Pipeline

The raw audio captured by the browser must be downsampled and converted to 16-bit PCM before shipping:

```text
  [MediaStream Audio] 
          ↓
  [AudioWorklet / ScriptProcessorNode] -> Captures Float32 values (-1.0 to 1.0) at native sample rate (usually 44.1kHz or 48kHz).
          ↓
  [Downsampler] -> Downsamples native sample rate to 16,000Hz (16kHz).
          ↓
  [PCM16 Converter] -> Maps Float32 to Int16 (-32768 to 32767).
          ↓
  [Chunk Slicer] -> Collects 500ms slices (8,000 samples / 16KB data).
          ↓
  [WebSocket Stream] -> Ships chunk as binary ArrayBuffer.
```

### Downsampling & Quantization Math (Frontend Code Blueprint):
```javascript
function convertFloat32ToInt16(buffer) {
  let l = buffer.length;
  let buf = new Int16Array(l);
  while (l--) {
    let s = Math.max(-1, Math.min(1, buffer[l]));
    buf[l] = s < 0 ? s * 0x8000 : s * 0x7FFF;
  }
  return buf.buffer; // Raw ArrayBuffer ready for socket emission
}
```

### Audio Playout Specs
* **Audio Decoder Layer:** The system uses **raw PCM chunks (Float32 or PCM16)** or **raw WAV with simple headers** to bypass the computational overhead and latency of real-time MP3 decoding in browser runtime.
* **Playback Clock Source:** `AudioContext.currentTime` is the absolute source of truth for subtitle/karaoke sync. The system avoids using browser `performance.now()` or standard JavaScript timer clocks because they suffer from drift and thread focus throttling in background tabs.

### Communication Flow Sequence Diagram

```mermaid
sequenceDiagram
    autonumber
    actor User as User Microphone
    participant FE as Frontend Client
    participant WS as WebSocket Channel
    participant BE as Backend Sockets
    participant STT as Whisper.cpp (STT)
    participant LLM as Dialog Engine (LLM)
    participant TTS as Voice Engine (TTS)

    User->>FE: Speaks (Capture PCM 16kHz, Mono)
    FE->>FE: VAD monitors energy threshold
    Note over FE: If speaking, buffer and stream audio
    FE->>WS: Emit "audio-chunk" (500ms binary PCM buffer)
    WS->>BE: Forward raw buffers to session queue
    FE->>FE: VAD detects silence (>1.5s)
    FE->>WS: Emit "speech-end"
    WS->>BE: Trigger transcription pipeline
    BE->>STT: Feed accumulated audio buffer to whisper.cpp
    STT-->>BE: Return transcribed text
    BE->>WS: Emit "stt-completed" (Text shown to user)
    
    BE->>LLM: Send prompt (history + scenario instructions + text)
    LLM-->>BE: Stream token chunks in real-time
    BE->>WS: Emit "llm-stream-chunk" (Karaoke subtitles buffer)
    
    Note over BE, TTS: Streaming Pipeline: LLM Stream -> TTS
    BE->>TTS: Feed LLM text stream incrementally
    TTS-->>BE: Generate binary audio chunks (TTS stream)
    BE->>WS: Emit "tts-audio-chunk" (Binary voice chunks + word boundaries)
    
    WS->>FE: Receive Audio & Timestamps
    FE->>FE: Feed playhead queue & sync subtitle highlights
    FE->>User: Play audio through speakers
```

---

## 5. Shared Contracts & WebSocket Protocol

To prevent WebSocket event mismatch between frontend and backend, all event structures are locked in a shared Zod schema:

### Zod Payload Declarations (`packages/shared-contracts/`)
```typescript
import { z } from 'zod';

export const AudioChunkSchema = z.object({
  sessionId: z.string().uuid(),
  sequenceNumber: z.number().int(),
  chunk: z.instanceof(ArrayBuffer) // Raw 16kHz PCM data buffer
});

export const TtsAudioChunkSchema = z.object({
  requestId: z.string().uuid(),
  sequenceNumber: z.number().int(),
  audio: z.instanceof(ArrayBuffer), // Generated voice segment (MP3/WAV/PCM)
  words: z.array(z.object({
    text: z.string(),
    startMs: z.number(),
    endMs: z.number()
  }))
});
```

### Event Catalog Definitions
* **`connection` (Client $\rightarrow$ Server):** Handshake with authorization metadata (JWT validation).
* **`audio-chunk` (Client $\rightarrow$ Server):** Binary DTO payload. Emitted every 500ms during voice activity.
* **`speech-end` (Client $\rightarrow$ Server):** Emitted by client VAD indicating silent pause threshold reached.
* **`user-interrupt` (Client $\rightarrow$ Server):** Emitted instantly if microphone volume exceeds threshold while state is `SPEAKING`.
* **`stt-completed` (Server $\rightarrow$ Client):** Emits final transcription string.
* **`llm-stream-chunk` (Server $\rightarrow$ Client):** Streams LLM text characters for real-time text sync.
* **`tts-audio-chunk` (Server $\rightarrow$ Client):** Delivers synthesized audio bytes with word offsets.
* **`state-transition` (Server $\rightarrow$ Client):** Broadcasts state updates (e.g. `THINKING` $\rightarrow$ `SPEAKING`).
* **`session-error` (Server $\rightarrow$ Client):** Event layer error propagation.

### Exact WebSocket Packet Ordering & Loss Strategy
* **Sequence Numbers:** Packets are tagged with sequential `sequenceNumber` indexes.
* **Loss Strategy:** Real-time audio cannot afford retransmission delay (retransmitting a lost TCP socket segment causes latency). 
  * If a packet arrives out of order but falls within the jitter buffer time window, it is inserted into the correct playout slot.
  * If a packet is lost completely (e.g., sequence jumps from `4` to `6` and `5` is missing after 100ms buffering), the playhead **skips** the missing segment. A 500ms audio glitch is prioritized over cumulative lag.

---

## 6. Conversation State Machine & Interruption Flow

To prevent race conditions, the voice session runs on a strict **Finite State Machine (FSM)**.

```mermaid
stateDiagram-v2
    [*] --> IDLE
    IDLE --> LISTENING : User clicks "Start"
    LISTENING --> PROCESSING_STT : VAD detects silence / user stops
    PROCESSING_STT --> THINKING : Transcript ready
    THINKING --> SPEAKING : LLM & TTS start streaming
    SPEAKING --> LISTENING : AI playback finished
    SPEAKING --> INTERRUPTED : User speaks during playback
    INTERRUPTED --> LISTENING : Server clears audio queue & resets VAD
    SPEAKING --> ERROR : TTS / stream error
    THINKING --> ERROR : LLM timeout
    ERROR --> IDLE : Reset session
    IDLE --> [*]
```

### FSM Transition Validation Table

| From State | To State | Transition Allowed? | Trigger event / Actions |
| :--- | :--- | :--- | :--- |
| **IDLE** | `LISTENING` | ✅ | User clicks "Start Scenario" / Unlock AudioContext & mount mic. |
| **IDLE** | `SPEAKING` | ❌ | Disallowed (No input exists to synthesize). |
| **LISTENING** | `PROCESSING_STT`| ✅ | VAD detects user pause threshold / Flush audio buffers. |
| **PROCESSING_STT**| `THINKING` | ✅ | Whisper transcription completed / Pack prompt context. |
| **THINKING** | `SPEAKING` | ✅ | First aggregated TTS buffer chunk arrives / Playout start. |
| **SPEAKING** | `LISTENING` | ✅ | Playout queue completes / Reactivate mic recording. |
| **SPEAKING** | `INTERRUPTED` | ✅ | Mic energy exceeds threshold (VAD) / Flush audio, call AbortControllers. |
| **INTERRUPTED** | `LISTENING` | ✅ | Cleanup completed on FE and BE / Reset VAD window. |
| **ANY** | `ERROR` | ✅ | Timeout / socket disconnect / API failures. |
| **ERROR** | `IDLE` | ✅ | Call fallback cleanup / Reset active states. |

### Interruption Sequence Diagram
When the user speaks over the AI, the client and server must immediately abort:

```mermaid
graph TD
    A[AI is speaking/playing audio] --> B{User starts talking}
    B -->|VAD triggers on client| C[Client stops current playback queue]
    C --> D[Client clears UI subtitle highlights]
    D --> E[Client emits 'user-interrupt' socket event]
    E --> F[Backend receives 'user-interrupt']
    F --> G[Backend calls AbortControllers for active LLM & TTS promises]
    G --> H[Backend clears audio send buffers & session queues]
    H --> I[Backend state transitions to LISTENING]
    I --> J[Microphone inputs stream normally again]
```

---

## 7. Deep-Dive System Design Principles (Must-Follow)

### 7.1 Latency Optimization & Pipeline Efficiency
* **Total Latency Budget:** Target is **1.0s – 1.5s** total latency.
  * **VAD silence detection:** < 100ms.
  * **STT Transcription:** < 600ms.
  * **LLM first token:** < 500ms.
  * **TTS startup:** < 200ms.
  * **Client playout buffer:** < 100ms.
* **Streaming Tokens & Streaming TTS Pipeline:**
  * **Token Streaming:** LLM must stream generated tokens in real-time.
  * **Streaming TTS:** The backend should feed the LLM stream directly into a streaming TTS engine (chunk-by-chunk) rather than waiting for the complete sentence to finish.
  * **Frontend Playout:** The client plays audio chunks immediately as they arrive over WebSockets.

### 7.2 Interruption Handling & Turn-Taking
* **Behavior:** When the AI is speaking and user starts talking, the client must immediately:
  1. Stop audio playback (clear TTS play queue).
  2. Clear current subtitle highlighting.
  3. Send an interruption signal to the backend.
  4. Backend drops the current generation task and transitions state back to `LISTENING`.

### 7.3 Audio Pipeline Specifications & Buffering
* **Format:** PCM 16-bit, 16kHz, Mono, Little-Endian.
* **Chunk Size:** 500ms chunks (or ~16KB of PCM16 data) to balance network overhead and processing latency.
* **Buffer Strategy:** Implement client and backend buffers to prevent jitter, audio overlap, and subtitle drift.
* **Jitter Buffer:** Client maintains a ring-buffer of audio packets. Playback of the next chunk only begins if at least one chunk is completely buffered ahead of time, ensuring stutter-free playout even on unstable networks.
* **Audio Drift Adjustment:** Subtitle word boundaries are tagged in milliseconds (offset from start of audio track). If the client playback timehead slips behind/ahead of timestamps by more than 150ms, the UI drops frame delay to catch up instantly.
* **Audio Echo Cancellation:** Configure browser's `getUserMedia` with:
  ```javascript
  navigator.mediaDevices.getUserMedia({
    audio: {
      echoCancellation: true,
      noiseSuppression: true,
      autoGainControl: true
    }
  })
  ```
  This prevents the AI's speakers from feeding back into the microphone, avoiding infinite audio loops.
* **Audio Interrupt Priority Manager:** Implement a client-side audio priority manager to resolve playhead conflicts. User interruption immediately takes absolute priority (cancelling all audio playback), followed by system notifications, reconnection sound, and regular conversation.
* **TTS Chunk Scheduler:**
  * **Prefetch Strategy:** Prefetches the next TTS chunk while the client is still playing the current chunk.
  * **Buffer Thresholds:** Limits client-side pre-buffered audio to a maximum threshold (e.g., 3 seconds) to prevent wasting token fees in case of interruption.

### 7.4 FSM State Machine & Session Life
* **FSM Implementation:** Explicit state transitions prevent race conditions. All connections must trace back to the FSM.
* **Session Manager Layer:** Session manager keeps track of active sockets, FSM state, audio buffers, LLM stream refs, and cancellation tokens.
* **Cancellation Token System:** AbortController cancellation is linked to LLM and TTS tasks.
* **Conversation Memory:** Keep the last 10 messages in the active LLM context. Periodically compress older parts using background LLM runs, storing summary vectors in `pgvector` for semantic recall.
* **Reconnection & State Synchronization:**
  * **Resync Handshake:** If WebSocket connection drops, client attempts reconnect.
  * **FSM Restoration:** Backend checks if a session exists for the user. If active, re-maps socket context, keeps conversation history intact, and triggers FSM state validation without restarting the session.
* **Conversation Timeout:** Automatically reset the session, clean up audio buffers, and free backend memory/resources if the user remains silent or disconnects for a prolonged period (e.g. >3 minutes).

### 7.5 API Abstraction & DI Design
* **Dependency Injection:** Program against interfaces rather than concrete classes (e.g., `AIProvider` interface instead of deep integration with `openai` client). Inject dependencies into handlers to enable seamless mock-testing and provider changes.
* **API Abstraction Layer:** Hide infrastructure details from the client. The frontend must only trigger logical actions (e.g., `conversationService.sendMessage()`) without awareness of the underlying AI provider.
* **Repository Pattern:** Centralize all database operations behind Repository classes (e.g., `UserRepository.findById()`) to isolate SQL/Prisma operations from route handlers and services.

### 7.6 Security, Safety & Abuse Protection
* **Rate Limiting:** Discard packages if a client floods the websocket with >4 chunks per second. Limit max session duration to 15 minutes.
* **AI Safety & Guardrails:** Include input moderation checks, prompt injection guardrails, and role/instruction isolation.

### 7.7 Mobile Optimization & Compatibility
* **iOS Safari Policies:** Must unlock AudioContext on user interaction (e.g. click "Start Conversation") to bypass autoplay restrictions.
* **Mobile Battery Optimization:** Suspend Web Audio API analyzers and drop canvas rendering FPS when the tab is running in the background.

### 7.8 Exact Playout Constraints & Buffers
* **Explicit Queue Limits:** Playout queue has a strict cap of **3.0 seconds** of audio. Any incoming chunks that exceed this buffer size are dropped (backpressure trigger) to prevent memory leak and lag.
* **AI Token Buffer Threshold:** LLM text chunks are buffered. TTS is triggered dynamically upon reaching sentence boundaries (punctuation: `.`, `?`, `!`, `\n`) OR if a sentence is long, after a threshold of `15 tokens` to maintain conversational pace.

---

## 8. Memory Cleanup Lifecycle

To prevent memory leaks (which are common in real-time audio systems due to persistent buffers), the application executes specific cleanups triggered by lifecycle events:

```text
  [Lifecycle Trigger] ──> [Actions Executed]
  
  * user-interrupt    ──> Clear client playhead queue, abort backend LLM/TTS streams, clear socket output buffers.
  * tab hidden        ──> Suspend Web Audio API AudioContext, pause canvas waveform rendering.
  * user disconnect   ──> Close AudioContext, remove Web Audio listeners, destroy Socket.IO namespaces, clear active buffers.
  * session timeout   ──> Destroy backend session instance, drop history memory reference, close PostgreSQL cursor.
```

---

## 9. Telemetry & Observability

### Telemetry Stack
* **Frontend (FE):** **Sentry** (React/JS error tracking, WebSocket failures, microphone permission issues, and Session Replay to observe user interactions and UI lags).
* **Backend (BE):** **Pino** (high-performance JSON logger for Node.js).
* **Metrics & Analytics:** **Prometheus + Grafana** for system metrics and WebSocket connection tracking.
* **AI Observability:** **Langfuse** (LLM Engineering Platform) for tracking prompt templates, token costs, generation latency, and conversation trace analysis.
* **Infrastructure:** **Netdata** for lightweight, real-time VPS CPU, RAM, and network traffic tracking.

### Core Event Tracing
Every turn-taking interaction must trigger and log:
1. `USER_STARTED_SPEAKING`
2. `VAD_DETECTED_SILENCE`
3. `STT_COMPLETED` (measures STT latency: `speech_end` $\rightarrow$ `transcript_ready`)
4. `LLM_RESPONSE_RECEIVED` (measures LLM latency: `prompt_sent` $\rightarrow$ `response_received`)
5. `TTS_STARTED` (measures TTS latency: `tts_start` $\rightarrow$ `audio_ready`)
6. `AUDIO_PLAYBACK_STARTED`

### Trace Correlation
Tag every log and trace payload with:
* **`sessionId`:** Identifies the user session lifecycle.
* **`requestId`:** Tracks a single turn-taking loop.
* **`traceId`:** Passed to Langfuse and Pino log payloads.

---

## 10. Platform Compatibility & Browser Support Matrix

Audio APIs behavior varies significantly across browsers. We define our compatibility layout:

| Browser | Target Support | Autoplay Caveats | Permission Quirks |
| :--- | :--- | :--- | :--- |
| **Chrome (Desktop/Android)** | ✅ Full | AudioContext must be resumed via user click gesture. | Simple permission prompt, persists easily. |
| **Edge (Desktop)** | ✅ Full | Same as Chrome. | Standard persistence. |
| **Firefox (Desktop)** | ⚠️ Partial | Supports AudioContext, but Opus/PCM decoding buffers show slight latency variation. | Prompt requested per call session unless allowed permanently. |
| **Safari (macOS/iOS)** | ⚠️ Restricted | **Crucial:** Autoplay policy blocks AudioContext completely unless unlocked inside a physical click/touch event loop handler. | iOS closes microphone stream instantly if screen locks or tab goes to background. |

---

## 11. Architecture Decision Records (ADRs)

* **ADR-001: WebSockets (Socket.IO) over WebRTC:** WebSockets (TCP) provide low-overhead implementation and robust socket recovery loops. At current latency thresholds (50-80ms network roundtrip), Socket.IO is chosen over WebRTC to accelerate MVP delivery.
* **ADR-002: Server-Side Whisper.cpp:** Client-side WASM requires downloading a >75MB model on page load and relies on client CPU, causing lag on mobile. Server-side Whisper.cpp ensures unified caching and immediate startup across all device types.
* **ADR-003: Sentence-Aggregated TTS Streaming:** Synthesizing the LLM response sentence-by-sentence (instead of waiting for the full paragraph or word-by-word) provides the optimal balance of vocal cadence quality and reduced Time-to-First-Byte (TTFB) latency.

---

## 12. MVP Boundaries

### Must Have (MVP)
* Web Audio API PCM 16kHz capture.
* WebSocket audio chunk streaming.
* Client-side VAD threshold detection.
* Local server-side Whisper.cpp transcription.
* Streaming LLM and sentence-aggregated TTS.
* Interruption abort handlers.
* Responsive SVG wave visualizer.

### Not Now (Post-MVP)
* ELSA-style phoneme pronunciation grading.
* Long-term RAG/semantic database vector memory.
* Multi-lingual scenarios (English only).
* AI emotional voices.

---

## 13. Docker & Deployment Topology

### Docker Architecture
```text
  [Client Browser]
         │
         │ (Port 5173/80 - Static React Page via Nginx)
         ▼
  [Frontend Container] (Nginx Server)
         │
         │ (Port 5000 - WebSocket / REST API Streams)
         ▼
  [Backend Container] (Node.js App) ──(Docker Bridge Network)──► [Database Container] (PostgreSQL + pgvector)
         │
         │ (Locally spawned child process or socket request)
         ▼
  [Whisper Worker Container] (Whisper.cpp compilation image on CPU/GPU)
```

---

## 14. Environment Structure Configuration

Create a `.env` file at both frontend and backend subdirectories:

### Backend `.env` Schema:
```env
PORT=5000
NODE_ENV=development
FRONTEND_URL=http://localhost:5173

# Database
DATABASE_URL=postgresql://postgres:password123@localhost:5432/ai_roleplay?schema=public

# Auth
JWT_SECRET=your_jwt_secret_here
JWT_EXPIRES_IN=7d
BCRYPT_SALT_ROUNDS=12

# AI API Keys
OPENROUTER_API_KEY=your_openrouter_key
DEEPSEEK_API_KEY=your_deepseek_key
OPENAI_API_KEY=your_openai_key

# TTS/STT Configurations
TTS_PROVIDER=openai          # openai | piper
STT_MODEL=base.en
WHISPER_BINARY_PATH=         # path to compiled whisper main binary (Linux prod)
WHISPER_MODEL_PATH=          # path to ggml-base.en.bin model file
VAD_TIMEOUT=1500
MAX_CONTEXT_MESSAGES=10

# Observation DSNs
SENTRY_DSN=your_backend_sentry_dsn
LANGFUSE_PUBLIC_KEY=your_langfuse_public
LANGFUSE_SECRET_KEY=your_langfuse_secret

# Developer Mocks Toggle
USE_MOCKS=true               # true = mock STT/LLM/TTS (no binaries needed)
SAVE_DEBUG_RECORDINGS=false  # true = persist WAV files to test_recordings/ for review
```

### Frontend `.env` Schema:
```env
VITE_API_URL=http://localhost:5000
VITE_SENTRY_DSN=your_frontend_sentry_dsn
```

---

## 15. Developer Ergonomics (Mocks)

* **Configuration:** Toggle `USE_MOCKS=true` in `backend/.env`.
* **Behavior:**
  * **Mock STT:** Returns static text 1s after `speech-end`.
  * **Mock LLM:** Streams a pre-written character reply chunk-by-chunk.
  * **Mock TTS:** Delivers static local audio files mapped to simulated word boundaries, bypassing real API costs.

---

## 16. Testing & Validation Strategy

Given the asynchronous nature of voice streams, testing focuses on state transition tables and cancellation triggers:
* **State Machine Unit Tests:** Validate that calling invalid state transitions throws errors.
* **Interruption Integration Tests:**
  1. Boot server in mock mode.
  2. Send `audio-chunk` inputs, trigger `speech-end`.
  3. Wait for `tts-audio-chunk` emissions to begin.
  4. Emit `user-interrupt`.
  5. Assert subsequent `tts-audio-chunk` emissions stop, and backend state loops back to `LISTENING`.
* **Latency Telemetry Test:** Run script measuring time between `speech-end` and first `tts-audio-chunk` to verify total latency is <1.5s.

---

## 17. Engineering Execution Roadmap

```text
Phase 1: Audio Pipeline Validation ✅ COMPLETE
├── Frontend (Client):
│   ├── ✅ Capture getUserMedia microphone stream
│   ├── ✅ Initialize raw AudioContext and AudioWorklet
│   ├── ✅ Convert Float32 native buffer to Int16 PCM (16kHz Mono)
│   └── ✅ Implement silence threshold VAD detector (EnergyVadProcessor)
└── Backend (Server):
    ├── ✅ Setup Express server + Socket.IO receiver
    ├── ✅ Stream raw binary buffers from Client to Server
    └── ✅ Log chunks metrics (Sequence counts, chunk buffer size)

Phase 2: Database & Handshake setup ✅ COMPLETE
├── ✅ Setup PostgreSQL + pgvector Docker container
├── ✅ Build Prisma schema and run migrations
└── ✅ Setup WebSocket Auth handshake validations (JWT httpOnly cookie)

Phase 3: Backend STT Integration (Whisper) ✅ COMPLETE
├── ✅ MockSttService for local development (no binary required)
├── ✅ WhisperSttService for production (whisper.cpp binary)
├── ✅ Pipe incoming socket buffers into Whisper inference process
└── ✅ Emit 'stt-completed' to client → TranscriptDisplay component

Phase 4: LLM Stream & Token Aggregator
├── Connect OpenRouter / DeepSeek API stream
└── Build Token Aggregator boundary parser (regex punctuation)

Phase 5: Streaming TTS & Playout Queue
├── Build hybrid TTS connector (OpenAI/Piper)
├── Stream audio chunks to Client
└── Write Playback Queue Manager on Client (sequenced ordered playout)

Phase 6: Turn-Taking & Interruption loop
├── Implement client interruption trigger (mic activity while speaking)
├── Bind AbortControllers to cancel backend LLM/TTS streams
└── Connect the FSM State loop

Phase 7: Production Polish & Observability
├── Hook Sentry on FE and Pino trace logging on BE
└── Setup Netdata infrastructure monitoring
```
