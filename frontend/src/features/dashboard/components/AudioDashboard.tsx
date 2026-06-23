import React, { useState } from 'react';
import { RecordingStatus } from 'shared-contracts';
import { ChatMessage } from '@/features/audio-core/hooks/useAudioRecorder';
import { Volume2, Settings } from 'lucide-react';
import { DashboardHeader } from './DashboardHeader';
import { TopicSelector } from './TopicSelector';
import { ActiveSessionPanel } from './ActiveSessionPanel';
import { OnboardingGuide } from './OnboardingGuide';
import { ChatInterface } from './ChatInterface';

interface AudioDashboardProps {
  isRecording: boolean;
  status: RecordingStatus;
  rmsVolume: number;
  transcript: string;
  llmText: string;
  chatHistory: ChatMessage[];
  currentPlayingSentence?: string;
  highlightedWordIndex?: number;
  startRecording: (topic?: string) => void;
  stopRecording: () => void;
  sendTextMessage: (text: string) => void;
  useBrowserTts: boolean;
  toggleBrowserTts: (val: boolean) => void;
  useBrowserStt: boolean;
  toggleBrowserStt: (val: boolean) => void;
  startMicManual: () => void;
  resetSession: () => void;
  ttsVoiceName: string | null;
  changeTtsVoiceName: (val: string | null) => void;
  ttsRate: number;
  changeTtsRate: (val: number) => void;
  availableVoices: SpeechSynthesisVoice[];
  suggestions: string[];
}

/**
 * Primary audio recording console.
 * Phase 4: Displays user transcript (STT) and streaming AI response (LLM).
 * Refactored: Split into lightweight subcomponents with unified design system tokens.
 * Resolved: Integrated custom browser TTS controls, manual mic commands, and suggestions.
 */
export function AudioDashboard({
  status,
  rmsVolume,
  chatHistory,
  currentPlayingSentence,
  highlightedWordIndex,
  startRecording,
  stopRecording,
  sendTextMessage,
  useBrowserTts,
  toggleBrowserTts,
  useBrowserStt,
  toggleBrowserStt,
  startMicManual,
  resetSession,
  ttsVoiceName,
  changeTtsVoiceName,
  ttsRate,
  changeTtsRate,
  availableVoices,
  suggestions,
}: AudioDashboardProps): React.ReactElement {
  const [topic, setTopic] = useState('');
  const [showSettings, setShowSettings] = useState(false);

  const isDisabled = status === 'PROCESSING' || status === 'THINKING' || status === 'SPEAKING';
  const isSessionActive = chatHistory.length > 0 || (status !== 'IDLE' && status !== 'ERROR');

  const startButtonLabel =
    status === 'ERROR'      ? 'Retry' :
    status === 'PROCESSING' ? 'Transcribing…' :
    status === 'THINKING'   ? 'AI is responding…' :
    status === 'SPEAKING'   ? 'AI is speaking…' :
    'Start General Conversation';

  return (
    <div className="max-w-6xl w-full bg-panel-bg backdrop-blur-xl border-x-0 sm:border border-panel-border rounded-none sm:rounded-3xl p-4 sm:p-8 shadow-card flex flex-col transition-all duration-300">
      
      {/* App Title Header */}
      <DashboardHeader isSessionActive={isSessionActive} />

      {/* Main Grid: Left and Right Columns */}
      <div className="w-full flex flex-col sm:flex-row gap-4 sm:gap-6 items-stretch">
        
        {/* Left Column (State, Volume Visualizer & Connection Controls) */}
        <div className="w-full sm:w-4/12 bg-panel-inner border border-panel-border/60 rounded-2xl p-4 sm:p-6 flex flex-col items-center justify-between min-h-0 sm:min-h-[340px] shadow-inner">
          {!isSessionActive ? (
            <TopicSelector
              topic={topic}
              setTopic={setTopic}
              isDisabled={isDisabled}
              startRecording={startRecording}
              startButtonLabel={startButtonLabel}
            />
          ) : (
            <ActiveSessionPanel
              status={status}
              rmsVolume={rmsVolume}
              stopRecording={stopRecording}
              startMicManual={startMicManual}
              resetSession={resetSession}
            />
          )}
          {/* Settings Toggle Button for Mobile */}
          <button
            type="button"
            onClick={() => setShowSettings(!showSettings)}
            className="w-full py-2.5 px-3 rounded-xl border border-panel-border/60 bg-slate-900/40 hover:bg-slate-900/80 text-xs font-semibold text-slate-300 flex items-center justify-between transition-colors sm:hidden mt-4"
          >
            <span className="flex items-center gap-1.5">
              <Settings className={`w-3.5 h-3.5 text-emerald-400 ${showSettings ? 'animate-spin-slow' : ''}`} />
              Speech Settings (Cấu hình âm thanh)
            </span>
            <span className="text-xs text-slate-400">{showSettings ? 'Hide ▲' : 'Show ▼'}</span>
          </button>

          {/* Settings Section (Cấu hình STT/TTS) - Collapsible on mobile */}
          <div className={`w-full flex-col gap-3 text-left ${showSettings ? 'flex mt-2' : 'hidden sm:flex mt-4'}`}>
            <div className="text-[11px] font-semibold text-slate-450 font-mono uppercase tracking-wider flex items-center gap-1.5 border-t border-panel-border/30 pt-4 w-full">
              <Settings className="w-3.5 h-3.5 text-emerald-400" />
              Speech Engine Settings (Cấu hình âm thanh)
            </div>

            {/* STT Selection */}
            <div className="flex flex-col gap-1">
              <label className="text-[10px] text-slate-500 font-sans">
                Speech-to-Text (Nhận diện giọng nói)
              </label>
              <div className="grid grid-cols-2 gap-1 bg-slate-900/60 p-0.5 rounded-lg border border-panel-border/50">
                <button
                  type="button"
                  onClick={() => toggleBrowserStt(true)}
                  className={`py-1 px-2 rounded-md text-[10px] font-medium transition-all ${
                    useBrowserStt
                      ? 'bg-blue-600/30 text-blue-300 font-semibold shadow-sm'
                      : 'text-slate-400 hover:text-slate-200'
                  }`}
                >
                  Browser (Trình duyệt)
                </button>
                <button
                  type="button"
                  onClick={() => toggleBrowserStt(false)}
                  className={`py-1 px-2 rounded-md text-[10px] font-medium transition-all ${
                    !useBrowserStt
                      ? 'bg-blue-600/30 text-blue-300 font-semibold shadow-sm'
                      : 'text-slate-450 hover:text-slate-200'
                  }`}
                >
                  Whisper (Mạnh mẽ)
                </button>
              </div>
            </div>

            {/* TTS Selection */}
            <div className="flex flex-col gap-1">
              <label className="text-[10px] text-slate-500 font-sans">
                Text-to-Speech (Giọng đọc AI)
              </label>
              <div className="grid grid-cols-2 gap-1 bg-slate-900/60 p-0.5 rounded-lg border border-panel-border/50">
                <button
                  type="button"
                  onClick={() => toggleBrowserTts(true)}
                  className={`py-1 px-2 rounded-md text-[10px] font-medium transition-all ${
                    useBrowserTts
                      ? 'bg-blue-600/30 text-blue-300 font-semibold shadow-sm'
                      : 'text-slate-400 hover:text-slate-200'
                  }`}
                >
                  Browser (Miễn phí)
                </button>
                <button
                  type="button"
                  onClick={() => toggleBrowserTts(false)}
                  className={`py-1 px-2 rounded-md text-[10px] font-medium transition-all ${
                    !useBrowserTts
                      ? 'bg-blue-600/30 text-blue-300 font-semibold shadow-sm'
                      : 'text-slate-450 hover:text-slate-200'
                  }`}
                >
                  OpenAI (Tự nhiên)
                </button>
              </div>
            </div>

            {/* Voice Settings Card (Free Browser Voice settings) */}
            {useBrowserTts && (
              <div className="w-full mt-2 pt-4 border-t border-panel-border/30 flex flex-col gap-3 text-left">
                <div className="text-[11px] font-semibold text-slate-450 font-mono uppercase tracking-wider flex items-center gap-1.5">
                  <Volume2 className="w-3.5 h-3.5 text-blue-400" />
                  Voice Settings (Giọng đọc)
                </div>
                
                {/* Voice Dropdown */}
                <div className="flex flex-col gap-1">
                  <label className="text-[10px] text-slate-500 font-sans">
                    Voice / Accent (Giọng & Phát âm)
                  </label>
                  {availableVoices.length === 0 ? (
                    <div className="text-[10px] text-amber-500 italic">
                      Loading browser voices... (Đang tải...)
                    </div>
                  ) : (
                    <select
                      value={ttsVoiceName || ''}
                      onChange={(e) => changeTtsVoiceName(e.target.value || null)}
                      className="w-full px-2.5 py-1.5 rounded-lg bg-panel-inner border border-panel-border text-slate-200 text-xs focus:outline-none focus:border-blue-500 cursor-pointer"
                    >
                      <option value="">System Default (Mặc định)</option>
                      {availableVoices.map((voice) => (
                        <option key={voice.name} value={voice.name}>
                          {voice.name.replace(/Microsoft|Google|Natural/g, '').trim()} ({voice.lang})
                        </option>
                      ))}
                    </select>
                  )}
                </div>

                {/* Speed Dropdown */}
                <div className="flex flex-col gap-1">
                  <label className="text-[10px] text-slate-500 font-sans">
                    Reading Speed (Tốc độ đọc)
                  </label>
                  <select
                    value={ttsRate}
                    onChange={(e) => changeTtsRate(parseFloat(e.target.value))}
                    className="w-full px-2.5 py-1.5 rounded-lg bg-panel-inner border border-panel-border text-slate-200 text-xs focus:outline-none focus:border-blue-500 cursor-pointer"
                  >
                    <option value="0.8">0.8x (Chậm)</option>
                    <option value="1.0">1.0x (Mặc định)</option>
                    <option value="1.1">1.1x</option>
                    <option value="1.2">1.2x (Nhanh vừa)</option>
                    <option value="1.3">1.3x</option>
                    <option value="1.5">1.5x (Nhanh)</option>
                    <option value="1.7">1.7x</option>
                    <option value="2.0">2.0x (Rất nhanh)</option>
                  </select>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Right Column (Dialogue Display, Subtitles, Text Drafting & User Guide) */}
        <div className="w-full sm:w-8/12 flex flex-col justify-between min-h-0 sm:min-h-[340px]">
          {!isSessionActive ? (
            <OnboardingGuide />
          ) : (
            <ChatInterface
              chatHistory={chatHistory}
              status={status}
              currentPlayingSentence={currentPlayingSentence}
              highlightedWordIndex={highlightedWordIndex}
              sendTextMessage={sendTextMessage}
              suggestions={suggestions}
              ttsVoiceName={ttsVoiceName}
              ttsRate={ttsRate}
              startMicManual={startMicManual}
              stopRecording={stopRecording}
            />
          )}
        </div>

      </div>

      {status === 'ERROR' && (
        <p className="text-xs text-status-error mt-4 text-center animate-fade-in font-mono">
          An error occurred. Make sure the backend is running and you have microphone access.
        </p>
      )}
    </div>
  );
}
