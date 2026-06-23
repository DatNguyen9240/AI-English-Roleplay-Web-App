import React, { useState } from 'react';
import { RecordingStatus } from 'shared-contracts';
import { ChatMessage } from '@/features/audio-core/hooks/useAudioRecorder';
import { Volume2, Settings, Sliders } from 'lucide-react';
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
    'Start General Chat';

  return (
    <div className="w-full max-w-5xl h-[100dvh] sm:h-[80vh] sm:min-h-[680px] sm:max-h-[820px] bg-panel-bg backdrop-blur-3xl border-x-0 sm:border border-panel-border rounded-none sm:rounded-3xl p-4 sm:p-6 shadow-card flex flex-col transition-all duration-500 overflow-hidden">
      
      {/* App Header */}
      <DashboardHeader isSessionActive={isSessionActive} />

      {/* Main Container - Fills all remaining vertical space */}
      <div className="w-full flex-1 flex flex-col sm:flex-row gap-4 sm:gap-6 min-h-0 overflow-hidden h-full">
        
        {/* Left Column (Selector/Visualizer & Settings) */}
        {/* On mobile: hidden if session is active, so the chat workspace occupies the full viewport */}
        <div className={`w-full sm:w-4/12 bg-slate-900/25 border border-white/5 rounded-2xl p-4 sm:p-5 flex flex-col justify-between min-h-0 shadow-inner overflow-y-auto sm:overflow-visible transition-all duration-300 h-full ${
          isSessionActive ? 'hidden sm:flex' : 'flex'
        }`}>
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

          {/* Settings Section (Cấu hình STT/TTS) */}
          <div className="w-full flex flex-col gap-3 text-left mt-6 border-t border-white/5 pt-4">
            <button
              type="button"
              onClick={() => setShowSettings(!showSettings)}
              className="w-full py-2 px-2.5 rounded-lg bg-white/5 border border-white/5 hover:bg-white/10 text-[11px] font-bold text-slate-300 flex items-center justify-between transition-all sm:hidden"
            >
              <span className="flex items-center gap-1.5">
                <Sliders className={`w-3.5 h-3.5 text-cyan-400 ${showSettings ? 'rotate-90' : ''} transition-transform`} />
                Speech Settings (Cấu hình âm thanh)
              </span>
              <span className="text-[10px] text-slate-400">{showSettings ? 'Hide ▲' : 'Show ▼'}</span>
            </button>

            <div className={`w-full flex-col gap-3.5 ${showSettings ? 'flex' : 'hidden sm:flex'}`}>
              <div className="hidden sm:flex text-[10px] font-bold text-slate-400 font-sans uppercase tracking-wider items-center gap-1.5">
                <Settings className="w-3.5 h-3.5 text-cyan-400" />
                Speech Engine Settings
              </div>

              {/* STT Selection */}
              <div className="flex flex-col gap-1.5">
                <label className="text-[10px] text-slate-400 font-sans font-bold uppercase tracking-wide">
                  Speech-to-Text
                </label>
                <div className="grid grid-cols-2 gap-1 bg-slate-950/50 p-1 rounded-lg border border-white/5">
                  <button
                    type="button"
                    onClick={() => toggleBrowserStt(true)}
                    className={`py-1.5 px-2 rounded-md text-[10px] font-semibold transition-all ${
                      useBrowserStt
                        ? 'bg-cyan-500/20 text-cyan-300 shadow-sm border border-cyan-500/30'
                        : 'text-slate-500 hover:text-slate-350 border border-transparent'
                    }`}
                  >
                    Browser
                  </button>
                  <button
                    type="button"
                    onClick={() => toggleBrowserStt(false)}
                    className={`py-1.5 px-2 rounded-md text-[10px] font-semibold transition-all ${
                      !useBrowserStt
                        ? 'bg-cyan-500/20 text-cyan-300 shadow-sm border border-cyan-500/30'
                        : 'text-slate-500 hover:text-slate-350 border border-transparent'
                    }`}
                  >
                    Whisper
                  </button>
                </div>
              </div>

              {/* TTS Selection */}
              <div className="flex flex-col gap-1.5">
                <label className="text-[10px] text-slate-400 font-sans font-bold uppercase tracking-wide">
                  Text-to-Speech
                </label>
                <div className="grid grid-cols-2 gap-1 bg-slate-950/50 p-1 rounded-lg border border-white/5">
                  <button
                    type="button"
                    onClick={() => toggleBrowserTts(true)}
                    className={`py-1.5 px-2 rounded-md text-[10px] font-semibold transition-all ${
                      useBrowserTts
                        ? 'bg-cyan-500/20 text-cyan-300 shadow-sm border border-cyan-500/30'
                        : 'text-slate-500 hover:text-slate-350 border border-transparent'
                    }`}
                  >
                    Browser (Free)
                  </button>
                  <button
                    type="button"
                    onClick={() => toggleBrowserTts(false)}
                    className={`py-1.5 px-2 rounded-md text-[10px] font-semibold transition-all ${
                      !useBrowserTts
                        ? 'bg-cyan-500/20 text-cyan-300 shadow-sm border border-cyan-500/30'
                        : 'text-slate-500 hover:text-slate-350 border border-transparent'
                    }`}
                  >
                    OpenAI (HD)
                  </button>
                </div>
              </div>

              {/* Voice Settings Card */}
              {useBrowserTts && (
                <div className="w-full mt-1.5 pt-3 border-t border-white/5 flex flex-col gap-3.5">
                  <div className="text-[10px] font-bold text-slate-400 font-sans uppercase tracking-wider flex items-center gap-1.5">
                    <Volume2 className="w-3.5 h-3.5 text-cyan-400" />
                    Voice Accent & Speed
                  </div>
                  
                  {/* Voice Dropdown */}
                  <div className="flex flex-col gap-1">
                    <label className="text-[10px] text-slate-500 font-sans">Accent</label>
                    {availableVoices.length === 0 ? (
                      <div className="text-[10px] text-amber-500 italic">
                        Loading browser voices...
                      </div>
                    ) : (
                      <select
                        value={ttsVoiceName || ''}
                        onChange={(e) => changeTtsVoiceName(e.target.value || null)}
                        className="w-full px-2.5 py-2 rounded-lg bg-slate-950/40 border border-white/5 text-slate-200 text-xs focus:outline-none focus:border-indigo-500/50 cursor-pointer"
                      >
                        <option value="">System Default</option>
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
                    <label className="text-[10px] text-slate-500 font-sans">Reading Speed</label>
                    <select
                      value={ttsRate}
                      onChange={(e) => changeTtsRate(parseFloat(e.target.value))}
                      className="w-full px-2.5 py-2 rounded-lg bg-slate-950/40 border border-white/5 text-slate-200 text-xs focus:outline-none focus:border-indigo-500/50 cursor-pointer"
                    >
                      <option value="0.8">0.8x (Slow)</option>
                      <option value="1.0">1.0x (Normal)</option>
                      <option value="1.2">1.2x</option>
                      <option value="1.5">1.5x (Fast)</option>
                      <option value="1.8">1.8x</option>
                    </select>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Right Column (Dialogue Display, Input Bar & Floating Suggestions) */}
        {/* On mobile active sessions: We render a compact ActiveSessionPanel at the top of the column */}
        <div className="w-full sm:w-8/12 flex flex-col min-h-0 flex-1 h-full overflow-hidden bg-slate-950/20 sm:border sm:border-white/5 rounded-2xl p-0 sm:p-5">
          {!isSessionActive ? (
            <OnboardingGuide />
          ) : (
            <div className="flex flex-col flex-1 min-h-0">
              {/* Mobile Active Status Bar */}
              <div className="block sm:hidden border-b border-white/5 pb-3 mb-2.5">
                <ActiveSessionPanel
                  status={status}
                  rmsVolume={rmsVolume}
                  stopRecording={stopRecording}
                  startMicManual={startMicManual}
                  resetSession={resetSession}
                />
              </div>
              
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
                useBrowserTts={useBrowserTts}
                toggleBrowserTts={toggleBrowserTts}
                useBrowserStt={useBrowserStt}
                toggleBrowserStt={toggleBrowserStt}
                changeTtsVoiceName={changeTtsVoiceName}
                changeTtsRate={changeTtsRate}
                availableVoices={availableVoices}
              />
            </div>
          )}
        </div>

      </div>

      {status === 'ERROR' && (
        <p className="text-[10px] text-rose-400 mt-3 text-center animate-fade-in font-mono uppercase tracking-wide">
          Error: Please check backend connection and microphone permissions.
        </p>
      )}
    </div>
  );
}
