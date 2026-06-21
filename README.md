# Full Product Prompt — Realtime AI English Roleplay Web App

## Project Goal

Build a modern AI-powered English speaking practice web application focused on realtime voice conversation, immersive roleplay, pronunciation feedback, and natural interaction.

The product should feel:

* immersive
* responsive
* cinematic
* conversational
* emotionally engaging

The app should NOT feel like:

* traditional education software
* grammar exercises
* flashcard learning

Instead, it should feel like:

* talking with a real AI character
* participating in interactive dialogue
* practicing English naturally

---

# Core Concept

Users enter conversation scenarios and talk with AI characters using voice.

The AI character:

* speaks with realistic voice
* displays realtime subtitles
* animates while speaking
* pauses for user responses
* reacts dynamically

The user:

* talks through microphone
* receives realtime feedback
* practices pronunciation
* improves speaking confidence

The application should prioritize:

* low latency
* realtime interaction
* immersive UX
* lightweight infrastructure
* low operational cost

---

# Important Architecture Decision

DO NOT build:

* AI video generation
* heavy 3D rendering
* GPU-expensive facial animation

Instead use:

* static avatar images
* speaking animations
* waveform visualization
* subtitle synchronization
* pulse/glow effects

This dramatically reduces cost while maintaining premium user experience.

---

# Main Features

# 1. AI Roleplay Conversation

Users can choose scenarios such as:

* Job Interview
* Coffee Shop
* Airport
* Daily Conversation
* Office Meeting
* Tech Interview
* Dating
* Startup Pitch
* Travel Conversation

Example:

AI:
"Hello. Welcome to our company. Tell me about yourself."

User responds through microphone.

The AI:

* transcribes speech
* understands intent
* analyzes response
* continues conversation naturally

The conversation should NOT be fully scripted.

The AI should:

* ask follow-up questions
* adapt dynamically
* react naturally
* maintain context

---

# 2. Realtime Speech Recognition

Use realtime streaming speech-to-text.

Requirements:

* low latency
* streaming transcription
* accurate recognition
* punctuation support
* scalable architecture

Recommended Technology:

* whisper.cpp

Reason:

* open-source
* local inference
* no per-minute API cost
* CPU friendly
* extremely popular

---

# 3. AI Conversation Engine

Use modern LLM-based dialogue generation.

The AI should:

* understand user speech
* continue conversations naturally
* provide corrections
* adapt to user level
* simulate realistic dialogue

Recommended:

* OpenRouter
* DeepSeek
* Qwen
* Llama
* Mistral

Goal:
reduce dependency on expensive proprietary APIs.

---

# 4. Text-To-Speech System

The AI should speak using natural voice synthesis.

Requirements:

* realistic voice
* streaming playback
* low latency
* multiple personalities
* multiple accents

Recommended:

* Piper TTS
  OR
* OpenAI TTS initially

---

# 5. Avatar Speaking Animation

Instead of full AI video:

* animate avatar while speaking
* pulse effect
* glow effect
* waveform movement
* subtle bounce animation

The avatar should visually feel alive.

Use:

* Framer Motion
* CSS animation
* Web Audio API

---

# 6. Subtitle Synchronization

The subtitles should synchronize with AI speech in realtime.

As the AI speaks:

* words highlight progressively
* subtitle follows audio timing
* karaoke-style synchronization

Example:

"Hello welcome to the interview"

As audio plays:

* HELLO highlights
* then WELCOME
* then TO
* then THE
* then INTERVIEW

Implementation:

* use word timestamps
* audio currentTime synchronization
* realtime subtitle rendering

Goal:
create immersive speaking experience.

---

# 7. User Speech Analysis

After user speaks:

* convert speech to text
* compare against expected response
* analyze mistakes
* generate feedback

Example:

Expected:
"I would like a cup of coffee."

User:
"I like cup coffee."

System detects:

* missing words
* grammar mistakes
* pronunciation issues

Feedback Example:
"You missed the words 'would', 'a', and 'of'."

---

# 8. Pronunciation Feedback

MVP Version:

* transcript comparison
* confidence scoring
* missing word detection

Advanced Version:

* phoneme analysis
* stress analysis
* intonation analysis

Inspired by:

* ELSA Speak

---

# 9. Difficulty Levels

Levels:

* Beginner
* Intermediate
* Advanced

The AI adjusts:

* vocabulary
* sentence complexity
* speaking speed
* slang usage
* accent difficulty

---

# 10. Character Personalities

Different AI personalities:

* Friendly Teacher
* Strict Interviewer
* British Manager
* Casual Friend
* Startup Founder
* Travel Guide

Each personality includes:

* unique voice
* unique vocabulary
* unique speaking style
* unique emotional tone

---

# UI / UX Direction

The interface should feel:

* futuristic
* premium
* AI-native
* minimal
* responsive

Use:

* dark mode
* glassmorphism
* smooth transitions
* modern animations

Avoid:

* educational software aesthetics
* boring dashboards
* cluttered layouts

---

# Recommended Technology Stack

# Frontend

## React + Vite

Purpose:

* modern SPA
* fast UI rendering
* realtime updates

---

## TailwindCSS

Purpose:

* rapid UI development
* responsive design
* modern styling

---

## Framer Motion

Purpose:

* avatar animation
* subtitle transition
* speaking effects

---

## Web Audio API

Purpose:

* microphone capture
* waveform visualization
* audio analysis

---

# Backend

## Node.js + Express

Responsibilities:

* API
* AI orchestration
* session management
* websocket communication

---

## Socket.IO

Purpose:

* realtime communication
* streaming updates
* low latency interaction

---

# Database

## PostgreSQL

Store:

* users
* progress
* conversations
* scores
* scenarios

---

## pgvector

Purpose:

* semantic memory
* AI context memory
* personalized learning

---

# Hosting

Frontend:

* Vercel

Backend:

* Hetzner
* Railway
* Render

Database:

* Supabase
* Neon

---

# Audio Pipeline Architecture

User Microphone
↓
Streaming Audio
↓
whisper.cpp Transcription
↓
LLM Conversation Engine
↓
TTS Voice Generation
↓
Audio Playback
↓
Avatar Animation + Subtitle Sync

---

# Important Product Philosophy

The product should prioritize:

* responsiveness
* emotional immersion
* realtime interaction
* conversation quality

NOT:

* expensive graphics
* AI video generation
* unnecessary complexity

The illusion of realtime intelligence matters more than visual realism.

---

# MVP Scope

Build FIRST:

* static avatar
* mic input
* speech-to-text
* AI conversation
* subtitle synchronization
* voice playback
* waveform animation

DO NOT build initially:

* AI video generation
* advanced 3D avatars
* complex lipsync systems

Goal:
launch quickly with minimal cost.

---

# Long-Term Vision

Create:
"Interactive AI conversation universe for language learning"

Inspired by:

* Duolingo
* Character AI
* realtime voice assistants
* immersive storytelling
* conversational AI

The final experience should make users feel:
"I am living inside English conversation."
