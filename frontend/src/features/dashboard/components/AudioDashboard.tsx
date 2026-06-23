import React, { useState } from 'react';
import { RecordingStatus } from 'shared-contracts';
import { ChatMessage } from '@/features/audio-core/hooks/useAudioRecorder';
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
}

/**
 * Primary audio recording console.
 * Phase 4: Displays user transcript (STT) and streaming AI response (LLM).
 * Refactored: Split into lightweight subcomponents with unified design system tokens.
 */
export function AudioDashboard({
  isRecording,
  status,
  rmsVolume,
  transcript,
  llmText,
  chatHistory,
  currentPlayingSentence,
  highlightedWordIndex,
  startRecording,
  stopRecording,
  sendTextMessage,
}: AudioDashboardProps): React.ReactElement {
  const [topic, setTopic] = useState('');

  const isDisabled = status === 'PROCESSING' || status === 'THINKING' || status === 'SPEAKING';
  const isSessionActive = status !== 'IDLE' && status !== 'ERROR';

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
            />
          )}
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
