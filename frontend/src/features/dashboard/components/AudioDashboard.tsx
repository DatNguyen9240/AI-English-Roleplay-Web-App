import React, { useState } from 'react';
import { RecordingStatus } from 'shared-contracts';
import { HelpCircle } from 'lucide-react';
import { ChatMessage } from '@/features/audio-core/hooks/useAudioRecorder';
import { ScenarioSelector } from './ScenarioSelector';
import { ChatBubbles } from './ChatBubbles';
import { DraftingForm } from './DraftingForm';

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
  const volumePercentage = Math.min(100, Math.round(rmsVolume * 500));

  const isDisabled = status === 'PROCESSING' || status === 'THINKING' || status === 'SPEAKING';
  const isSessionActive = chatHistory.length > 0 || (status !== 'IDLE' && status !== 'ERROR');

  const startButtonLabel =
    status === 'ERROR'      ? 'Retry' :
    status === 'PROCESSING' ? 'Transcribing…' :
    status === 'THINKING'   ? 'AI is responding…' :
    status === 'SPEAKING'   ? 'AI is speaking…' :
    'Start General Conversation';

  const playMessageText = (text: string) => {
    if (typeof window === 'undefined' || !window.speechSynthesis) return;

    window.speechSynthesis.cancel();

    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = 'en-US';

    let voice: SpeechSynthesisVoice | null = null;
    const voices = window.speechSynthesis.getVoices();
    if (ttsVoiceName) {
      voice = voices.find((v) => v.name === ttsVoiceName) || null;
    }
    if (!voice) {
      voice = voices.find((v) => v.lang.startsWith('en') && v.name.includes('Google')) ||
              voices.find((v) => v.lang.startsWith('en')) ||
              null;
    }

    if (voice) {
      utterance.voice = voice;
    }
    utterance.rate = ttsRate;

    window.speechSynthesis.speak(utterance);
  };

  return (
    <div className="max-w-6xl w-full bg-slate-900/60 backdrop-blur-xl border border-slate-800 rounded-3xl p-8 shadow-2xl flex flex-col transition-all duration-300">
      
      {/* App Title Header */}
      <div className="w-full border-b border-slate-800/80 pb-4 mb-6 flex flex-col sm:flex-row justify-between items-center gap-2">
        <div>
          <h1 className="text-2xl font-bold tracking-tight bg-gradient-to-r from-blue-400 to-emerald-400 bg-clip-text text-transparent text-center sm:text-left">
            AI English Roleplay
          </h1>
          <p className="text-xs text-slate-400 text-center sm:text-left mt-0.5">
            Practice spoken English with an interactive AI tutor.
          </p>
        </div>
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
          {isSessionActive && (
            <div className="text-xs px-3 py-1.5 bg-slate-800 border border-slate-700 text-slate-350 font-mono rounded-full uppercase tracking-wider text-center">
              Active Session
            </div>
          )}
        </div>
      </div>

      {/* Main Grid: Left and Right Columns */}
      <div className="w-full flex flex-col sm:flex-row gap-6 items-stretch">
        
        {/* Left Column (State, Volume Visualizer & Connection Controls) */}
        <ScenarioSelector
          isSessionActive={isSessionActive}
          topic={topic}
          setTopic={setTopic}
          isDisabled={isDisabled}
          startRecording={startRecording}
          startButtonLabel={startButtonLabel}
          status={status}
          rmsVolume={rmsVolume}
          volumePercentage={volumePercentage}
          startMicManual={startMicManual}
          stopRecording={stopRecording}
          resetSession={resetSession}
          useBrowserTts={useBrowserTts}
          availableVoices={availableVoices}
          ttsVoiceName={ttsVoiceName}
          changeTtsVoiceName={changeTtsVoiceName}
          ttsRate={ttsRate}
          changeTtsRate={changeTtsRate}
        />

        {/* Right Column (Dialogue Display, Subtitles, Text Drafting & User Guide) */}
        <div className="w-full sm:w-8/12 flex flex-col justify-between min-h-[340px]">
          {!isSessionActive ? (
            /* Idle Right: Quick Guide Onboard */
            <div className="w-full bg-slate-950/20 border border-slate-800/40 rounded-2xl p-6 text-left flex flex-col justify-center h-full">
              <div className="flex items-center gap-1.5 mb-4">
                <HelpCircle className="w-4.5 h-4.5 text-slate-400" />
                <h3 className="text-sm font-bold text-slate-300 font-mono uppercase tracking-wider">
                  How It Works
                </h3>
              </div>
              <ul className="text-xs text-slate-400 space-y-3 font-sans list-decimal pl-4 leading-relaxed">
                <li>Type what topic you want to practice on the left and click <strong>Start Scenario</strong>.</li>
                <li>The AI will speak first and ask a question. Listen and read along.</li>
                <li>When the AI finishes, the mic turns on automatically. Speak your reply.</li>
                <li>Stop speaking for <strong>1.5 seconds</strong> to send, or type/paste your reply below anytime.</li>
                <li><em>Tip: Speak over the AI at any time to interrupt it!</em></li>
              </ul>
            </div>
          ) : (
            /* Active Right: Unified scrolling Conversation History & Text Input */
            <div className="w-full flex flex-col gap-4 justify-between h-full flex-1">
              <ChatBubbles
                chatHistory={chatHistory}
                status={status}
                currentPlayingSentence={currentPlayingSentence}
                highlightedWordIndex={highlightedWordIndex}
                playMessageText={playMessageText}
              />
              <DraftingForm
                suggestions={suggestions}
                status={status}
                sendTextMessage={sendTextMessage}
              />
            </div>
          )}
        </div>

      </div>

      {status === 'ERROR' && (
        <p className="text-xs text-rose-400 mt-4 text-center">
          An error occurred. Make sure the backend is running and you have microphone access.
        </p>
      )}
    </div>
  );
}
