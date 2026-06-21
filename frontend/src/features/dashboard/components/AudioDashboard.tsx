import React from 'react';
import { TranscriptDisplay } from '@/features/conversation/components/TranscriptDisplay';
import { SubtitleDisplay } from '@/features/conversation/components/SubtitleDisplay';
import type { RecordingStatus } from '@/types/audio';

interface AudioDashboardProps {
  isRecording: boolean;
  status: RecordingStatus;
  rmsVolume: number;
  transcript: string;
  llmText: string;
  currentPlayingSentence?: string;
  highlightedWordIndex?: number;
  startRecording: () => void;
  stopRecording: () => void;
}

/**
 * Primary audio recording console.
 * Phase 4: Now displays both user transcript (STT) and streaming AI response (LLM).
 */
export function AudioDashboard({
  isRecording,
  status,
  rmsVolume,
  transcript,
  llmText,
  currentPlayingSentence,
  highlightedWordIndex,
  startRecording,
  stopRecording,
}: AudioDashboardProps): React.ReactElement {
  const volumePercentage = Math.min(100, Math.round(rmsVolume * 500));

  const isDisabled = status === 'PROCESSING' || status === 'THINKING' || status === 'SPEAKING';

  const startButtonLabel =
    status === 'ERROR'      ? 'Retry' :
    status === 'PROCESSING' ? 'Transcribing…' :
    status === 'THINKING'   ? 'AI is responding…' :
    status === 'SPEAKING'   ? 'AI is speaking…' :
    'Start Recording';

  return (
    <div className="max-w-md w-full bg-slate-900/60 backdrop-blur-xl border border-slate-800 rounded-3xl p-8 shadow-2xl flex flex-col items-center">

      <h1 className="text-2xl font-bold text-center mb-2 tracking-tight bg-gradient-to-r from-blue-400 to-emerald-400 bg-clip-text text-transparent">
        AI English Roleplay
      </h1>
      <p className="text-sm text-slate-400 text-center mb-8">
        Phase 4: Full turn-taking — Whisper STT + LLM stream.
      </p>

      {/* FSM State Indicator */}
      <div className="flex flex-col items-center justify-center mb-8">
        <div className={`w-28 h-28 rounded-full flex items-center justify-center border-4 transition-all duration-300 ${
          status === 'LISTENING'   ? 'border-emerald-500 shadow-[0_0_20px_rgba(16,185,129,0.3)] animate-pulse' :
          status === 'PROCESSING' ? 'border-amber-500  shadow-[0_0_20px_rgba(245,158,11,0.3)]  animate-pulse' :
          status === 'THINKING'   ? 'border-teal-400   shadow-[0_0_20px_rgba(45,212,191,0.3)]  animate-pulse' :
          status === 'SPEAKING'   ? 'border-violet-500 shadow-[0_0_25px_rgba(139,92,246,0.5)] animate-pulse' :
          status === 'ERROR'      ? 'border-rose-500   shadow-[0_0_20px_rgba(244,63,94,0.3)]' :
          'border-slate-800'
        }`}>
          <span className={`text-xs font-mono font-bold uppercase tracking-widest ${
            status === 'ERROR' ? 'text-rose-400' : 'text-slate-300'
          }`}>
            {status}
          </span>
        </div>
      </div>

      {/* Volume Visualizer — visible only during active recording */}
      {isRecording && (
        <div className="w-full mb-8">
          <div className="flex justify-between text-xs text-slate-400 mb-1 font-mono">
            <span>Input Mic Level</span>
            <span>{volumePercentage}%</span>
          </div>
          <div className="w-full bg-slate-800 h-3 rounded-full overflow-hidden">
            <div
              className="bg-gradient-to-r from-emerald-500 to-teal-400 h-full transition-all duration-75"
              style={{ width: `${volumePercentage}%` }}
            />
          </div>
        </div>
      )}

      {/* User Transcript (STT) */}
      <div className="w-full mb-4">
        <TranscriptDisplay status={status} transcript={transcript} />
      </div>

      {/* AI Response (LLM streaming) */}
      <div className="w-full mb-6">
        <SubtitleDisplay
          status={status}
          llmText={llmText}
          currentPlayingSentence={currentPlayingSentence}
          highlightedWordIndex={highlightedWordIndex}
        />
      </div>

      {/* Control Buttons */}
      <div className="w-full flex gap-4">
        {!isRecording ? (
          <button
            id="btn-start-recording"
            onClick={startRecording}
            disabled={isDisabled}
            className="flex-1 py-3 px-6 rounded-xl font-bold bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white transition-colors shadow-lg shadow-blue-500/10 focus:outline-none disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {startButtonLabel}
          </button>
        ) : (
          <button
            id="btn-stop-recording"
            onClick={stopRecording}
            className="flex-1 py-3 px-6 rounded-xl font-bold bg-gradient-to-r from-rose-600 to-pink-600 hover:from-rose-500 hover:to-pink-500 text-white transition-colors shadow-lg shadow-rose-500/10 focus:outline-none"
          >
            Stop &amp; Send
          </button>
        )}
      </div>

      {status === 'ERROR' && (
        <p className="text-xs text-rose-400 mt-4 text-center">
          An error occurred. Make sure the backend is running and you have microphone access.
        </p>
      )}
    </div>
  );
}
